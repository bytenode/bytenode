'use strict';

const v8 = require('v8');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert').ok;
const dirname = require('path').dirname;

v8.setFlagsFromString('--no-lazy');

if (parseInt(process.versions.node, 10) >= 12) {
  v8.setFlagsFromString('--no-flush-bytecode');
}

class JavaScriptEntity {
  /**
   * Creates an instance of JavaScriptEntity, with either `code`, `filename`,
   * or both. If both were specified, `code` will be compiled, while `filename`
   * will be used in stack traces produced by this script.
   * @param {string} code The source code which will be compiled.
   * @param {string} filename The JavaScript filename. This filename will be
   * used in stack traces produced by this script. If `code` is not specified,
   * `filename` will be compiled instead.
   * @param {boolean} [compileAsModule=true] whether to compile `code` or
   * `filename` as a CommonJs module. Defaults to true.
   */
  constructor ({ code, filename, compileAsModule = true }) {
    assert(code || filename,
      new Error('Either code or filename is required.'));

    assert(!code || typeof code === 'string',
      new TypeError('code must be a string.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    this.filename = filename || '';
    this.code = code || '';
    this.compileAsModule = compileAsModule;
  }

  /**
   * @description Compiles the `code`. If `code` is not given, the `filename`
   * will be read and stored as `code`.
   */
  compile () {
    if (this.code === '') {
      this.code = fs.readFileSync(this.filename, 'utf-8');
    }

    if (this.compileAsModule) {
      this.code = Module.wrap(this.code);
    }

    const script = new vm.Script(this.code, {
      produceCachedData: true,
      filename: this.filename
    });

    this.bytecode = (typeof script.createCachedData === 'function')
      ? script.createCachedData()
      : script.cachedData;
  }

  /**
   * @description Saves bytecode to `output` filename.
   * @param {string} [output=filename.jsc] The output filename. Defaults to the
   * same path and name as `filename`, but with `.jsc` extension.
   */
  save ({ output = this.filename.replace(/\.(js|cjs)$/i, '.jsc') }) {
    assert(typeof output === 'string',
      new TypeError('output must be a string.'));

    if (!Buffer.isBuffer(this.bytecode)) {
      this.compile();
    }

    fs.writeFileSync(output, this.bytecode);
  }
}

class BytecodeEntity {
  /**
   * @param {Buffer} bytecode The bytecode buffer which wll be run.
   * @param {string} filename The path to the bytecode file.
   */
  constructor ({ bytecode, filename }) {
    assert(bytecode || filename,
      new Error('Either bytecode or filename is required.'));

    assert(!bytecode || Buffer.isBuffer(bytecode),
      new TypeError('bytecode must be a buffer object.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    this.filename = filename || '';
    this.bytecode = bytecode || Buffer.from([]);
  }

  /**
   * @description Runs the compiled `bytecode` and returns its result.
   * @returns {any} The result of the very last statement executed in the
   * original script.
   */
  run () {
    this._fixBytecode();

    const script = new vm.Script(this._dummyCode, {
      cachedData: this.bytecode
    });

    assert(!script.cachedDataRejected,
      new Error('Invalid or incompatible bytecode (cachedDataRejected).'));

    return script.runInThisContext();
  }

  get _readSourceHash () {
    if (process.version.startsWith('v8.8') ||
      process.version.startsWith('v8.9')) {
      return this.bytecode.subarray(12, 16).reduce((sum, number, power) => {
        sum += number * Math.pow(256, power);
        return sum;
      }, 0);
    } else {
      return this.bytecode.subarray(8, 12).reduce((sum, number, power) => {
        sum += number * Math.pow(256, power);
        return sum;
      }, 0);
    }
  }

  get _dummyCode () {
    return (this._readSourceHash >= 2)
      ? '"' + '\u200b'.repeat(this._readSourceHash - 2) + '"'
      : '0'.repeat(this._readSourceHash);
  }

  _fixBytecode () {
    if (this.bytecode.length === 0) {
      this.bytecode = fs.readFileSync(this.filename);
    }

    const dummyBytecode = new JavaScriptEntity({ code: '0x2A' });

    dummyBytecode.compile();

    const nodeVersion = parseFloat(process.versions.node);

    if (nodeVersion === 8.8 || nodeVersion === 8.9) {
      dummyBytecode.bytecode.copy(this.bytecode, 16, 16, 20);
      dummyBytecode.bytecode.copy(this.bytecode, 20, 20, 24);
    } else if (nodeVersion >= 9 && nodeVersion < 12) {
      dummyBytecode.bytecode.copy(this.bytecode, 12, 12, 16);
      dummyBytecode.bytecode.copy(this.bytecode, 16, 16, 20);
    } else if (nodeVersion >= 12 && nodeVersion < 17) {
      dummyBytecode.bytecode.copy(this.bytecode, 12, 12, 16);
    } else {
      throw new Error('Only Node.js v8.8, v8.9 and v9.x to v16.x versions' +
        `are supported. You are using Node.js ${process.version}.`);
    }
  }
}

/**
 * @type module
 * @description The Bytenode Public API
 */
const Bytenode = {
  /**
   * @description Compiles JavaScript `code` or `filename`.
   * @param {string} code The source code that will be compiled.
   * @param {string} filename The JavaScript filename. This filename will be
   * used in stack traces produced by this script. If `code` is not specified,
   * `filename` will be compiled instead.
   * @param {boolean} [compileAsModule=true] whether to compile `code` or
   * `filename` as a CommonJs module. Defaults to true.
   * @param {string} output The output filename. Defaults to the same path and
   * name as `filename`, but with `.jsc` extension.
   * @returns {string|Buffer} The path to the compiled file. If `output` is set
   * deliberatly to `null` or `undefined`, the bytecode buffer will be returned
   * instead.
   */
  compile ({
    code,
    filename,
    compileAsModule = true,
    output = filename ? filename.replace(/\.(js|cjs)$/, '.jsc') : null
  }) {
    const javaScriptEntity = new JavaScriptEntity({
      code,
      filename,
      compileAsModule
    });

    javaScriptEntity.compile();

    if (output != null) {
      output = path.resolve(output);
      javaScriptEntity.save({ output });
      return output;
    } else {
      return javaScriptEntity.bytecode;
    }
  },

  /**
   * @description Runs the compiled`bytecode` and returns its result.
   * @param {Buffer} bytecode The bytecode buffer which wll be run.
   * @param {string} filename The path to the bytecode file.
   * @returns {any} The result of the very last statement executed in the
   * original script.
   */
  run ({ bytecode, filename }) {
    return (new BytecodeEntity({ bytecode, filename })).run();
  },

  /**
   * @description Registers the extension `ext` in Node.js module system, so
   * that they can be required using `require()` function.
   * @param {string} ext A valid extension with a preceding dot (e.g. `.jsc` or
   * `.bin`).
   */
  registerExtension (ext) {
    assert(typeof ext === 'string' && /\.[a-z0-9]+/i.test(ext),
      new TypeError('ext must be a valid extension (e.g. ".jsc", ".bin")'));

    assert(Module._extensions[ext] == null,
      new Error(`"${ext}" is already registered.`));

    Module._extensions[ext] = function (mod, filename) {
      return (new BytecodeEntity({ filename })).run()
        .apply(mod.exports, [
          mod.exports,
          Module.createRequire(filename),
          mod,
          filename,
          dirname(filename)
        ]);
    };
  }
};

Bytenode.registerExtension('.jsc');

Bytenode.JavaScriptEntity = JavaScriptEntity;
Bytenode.BytecodeEntity = BytecodeEntity;

module.exports = Bytenode;
