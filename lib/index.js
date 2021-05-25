'use strict';

const v8 = require('v8');
const vm = require('vm');
const fs = require('fs');
const Module = require('module');
const assert = require('assert').ok;
const dirname = require('path').dirname;

v8.setFlagsFromString('--no-lazy');

if (parseInt(process.versions.node, 10) >= 12) {
  v8.setFlagsFromString('--no-flush-bytecode');
}

// TODO add JSDoc comments
class JavaScriptEntity {
  constructor ({ filename, code, compileAsModule = true }) {
    assert(filename || code,
      new Error('Either filename or code is required.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    assert(!code || typeof code === 'string',
      new TypeError('code must be a string.'));

    this.filename = filename || '';
    this.code = code || '';
    this.compileAsModule = compileAsModule;
  }

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

  save ({ output }) {
    assert(typeof output === 'string',
      new TypeError('output must be a string.'));

    if (!Buffer.isBuffer(this.bytecode)) {
      this.compile();
    }

    fs.writeFileSync(output, this.bytecode);
  }
}

class BytecodeEntity {
  constructor ({ filename, bytecode }) {
    assert(filename || bytecode,
      new Error('Either filename or bytecode is required.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    assert(!bytecode || Buffer.isBuffer(bytecode),
      new TypeError('bytecode must be a buffer object.'));

    this.filename = filename || '';
    this.bytecode = bytecode || Buffer.from([]);
  }

  get readSourceHash () {
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

  get dummyCode () {
    return (this.readSourceHash >= 2)
      ? '"' + '\u200b'.repeat(this.readSourceHash - 2) + '"'
      : '0'.repeat(this.readSourceHash);
  }

  fixBytecode () {
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

  run () {
    this.fixBytecode();

    const script = new vm.Script(this.dummyCode, { cachedData: this.bytecode });

    assert(!script.cachedDataRejected,
      new Error('Invalid or incompatible bytecode (cachedDataRejected).'));

    return script.runInThisContext();
  }
}

class Bytenode {
  static compile ({
    code,
    filename,
    compileAsModule = true,
    output = filename.replace(/\.(js|cjs)$/, '.jsc')
  }) {
    const javaScriptEntity = new JavaScriptEntity({
      filename,
      compileAsModule
    });

    javaScriptEntity.compile();

    if (output != null) {
      javaScriptEntity.save({ output });
      return output;
    } else {
      return javaScriptEntity.bytecode;
    }
  }

  static compileCode ({ code, compileAsModule = false }) {
    return Bytenode.compile({ code, compileAsModule, output: null });
  }

  static compileFile ({
    filename,
    compileAsModule = true,
    output = filename.replace(/\.(js|cjs)$/, '.jsc')
  }) {
    return Bytenode.compile({ filename, compileAsModule, output });
  }

  static run ({ filename, bytecode }) {
    return (new BytecodeEntity({ filename, bytecode })).run();
  }

  static runBytecode (bytecode) {
    return Bytenode.run({ bytecode });
  }

  static runFile (filename) {
    return Bytenode.run({ filename });
  }

  static registerExtension (ext) {
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
}

Bytenode.registerExtension('.jsc');

module.exports = Bytenode;
