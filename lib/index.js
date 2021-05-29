'use strict';

const v8 = require('v8');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert').ok;

v8.setFlagsFromString('--no-lazy');

if (parseInt(process.versions.node, 10) >= 12) {
  v8.setFlagsFromString('--no-flush-bytecode');
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
    assert(code || filename,
      new Error('Either code or filename is required.'));

    assert(!code || typeof code === 'string',
      new TypeError('code must be a string.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    if (code == null) {
      code = fs.readFileSync(filename, 'utf-8');
    }

    if (compileAsModule) {
      code = Module.wrap(code);
    }

    const script = new vm.Script(code, { filename, produceCachedData: true });

    const bytecode = (typeof script.createCachedData === 'function')
      ? script.createCachedData()
      : script.cachedData;

    if (output != null) {
      output = path.resolve(output);
      fs.writeFileSync(output, bytecode);
      return output;
    } else {
      return bytecode;
    }
  },

  /**
   * @description Runs the compiled `bytecode` and returns its result.
   * In most cases, you should use `require('script.jsc');` instead, as
   * `Bytenode.run();` function will NOT return module.exports properly. Also,
   * if it is called twice, it will run `bytecode` twice in the current
   * context, which can lead to issues and might crash the application.
   * @param {Buffer} bytecode The bytecode buffer which wll be run.
   * @param {string} filename The path to the bytecode file.
   * @returns {any} The result of the very last statement executed in the
   * original script.
   */
  run ({ bytecode, filename }) {
    assert(bytecode || filename,
      new Error('Either bytecode or filename is required.'));

    assert(!bytecode || Buffer.isBuffer(bytecode),
      new TypeError('bytecode must be a buffer object.'));

    assert(!filename || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    if (bytecode == null) {
      bytecode = fs.readFileSync(filename);
    }

    const script = new vm.Script(_dummyCode(bytecode), {
      cachedData: _fixBytecode(bytecode)
    });

    if (script.cachedDataRejected) {
      throw new Error('Invalid or incompatible bytecode (cachedDataRejected).');
    }

    return script.runInThisContext();

    function _dummyCode (bytecode) {
      const offset = (/^v8\.[89]/.test(process.version)) ? 0xC : 0x8;

      const sourceHash = bytecode.readUInt32LE(offset);

      return (sourceHash >= 2)
        ? '"' + '\u200b'.repeat(sourceHash - 2) + '"'
        : '0'.repeat(sourceHash);
    }

    function _fixBytecode (bytecode) {
      const dummyBytecode = Bytenode.compile({ code: '0x2A' });

      const nodeVersion = parseFloat(process.versions.node);

      if (nodeVersion === 8.8 || nodeVersion === 8.9) {
        dummyBytecode.copy(bytecode, 16, 16, 20);
        dummyBytecode.copy(bytecode, 20, 20, 24);
      } else if (nodeVersion >= 8.10 && nodeVersion < 12) {
        dummyBytecode.copy(bytecode, 12, 12, 16);
        dummyBytecode.copy(bytecode, 16, 16, 20);
      } else if (nodeVersion >= 12 && nodeVersion < 17) {
        dummyBytecode.copy(bytecode, 12, 12, 16);
      } else {
        throw new Error('Only Node.js v8.8 to v16.x versions are supported. ' +
          `You are using Node.js ${process.version}.`);
      }

      return bytecode;
    }
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

    Module._extensions[ext] = function BytenodeRequire (mod, filename) {
      return Bytenode.run({ filename }).apply(mod.exports, [
        mod.exports,
        createRequire(filename),
        mod,
        filename,
        path.dirname(filename)
      ]);

      function createRequire (filename) {
        if (typeof Module.createRequire === 'function') {
          return Module.createRequire(filename);
        } else {
          const _require = function (filename) {
            return mod.require(filename);
          };
          _require.resolve = function (request, options) {
            return Module._resolveFilename(request, mod, false, options);
          };
          _require.main = require.main;
          _require.extensions = Module._extensions;
          _require.cache = Module._cache;
          return _require;
        }
      }
    };
  }
};

Bytenode.registerExtension('.jsc');

module.exports = Bytenode;
