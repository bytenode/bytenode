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
 * @type Module
 */
const Bytenode = {
  /**
   * @description Compiles JavaScript code into bytecode buffer.
   * @param {string} code The source code that will be compiled.
   * @param {string} filename The filename that will be used in stack traces.
   * @param {boolean} compileAsModule Whether to compile `code` as a CommonJs
   * module. Defaults to true.
   * @returns {Buffer} The bytecode buffer.
   */
  compileCode ({
    code,
    filename,
    compileAsModule = true
  }) {
    assert(code != null,
      new Error('code is required.'));

    assert(typeof code === 'string',
      new TypeError('code must be a string.'));

    assert(filename == null || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    if (filename != null) {
      filename = path.resolve(filename);
    }

    code = code.replace(/^#!.*/, '');

    if (compileAsModule) {
      code = Module.wrap(code);
    }

    const script = new vm.Script(code, { filename, produceCachedData: true });

    const bytecode = (typeof script.createCachedData === 'function')
      ? script.createCachedData()
      : script.cachedData;

    return bytecode;
  },

  /**
   * @description Compiles JavaScript file.
   * @param {string} filename The JavaScript filename.
   * @param {boolean} compileAsModule Whether to compile `code` or `filename`
   * as a CommonJs module. Defaults to true.
   * @param {boolean} createLoader Whether to create loader file alongside the
   * compiled file. Defaults to false.
   * @param {string} loaderPattern The loader filename or pattern using '%' as
   * filename replacer. Defaults to %.loader.js.
   * @param {string} output The output filename or pattern using '%' as
   * filename replacer. Defaults to %.jsc.
   * @returns {string} The path to the compiled file.
   */
  compileFile ({
    filename,
    compileAsModule = true,
    createLoader = false,
    loaderPattern = '%.loader.js',
    output = '%.jsc'
  }) {
    assert(typeof filename === 'string',
      new TypeError('filename must be a string.'));

    assert(typeof output === 'string',
      new TypeError('output must be a string.'));

    assert(loaderPattern == null || typeof loaderPattern === 'string',
      new TypeError('loaderPattern must be a string.'));

    filename = path.resolve(filename);
    const code = fs.readFileSync(filename, 'utf-8');

    const bytecode = Bytenode.compileCode({
      code,
      filename,
      compileAsModule
    });

    output = output.replace('%', path.parse(filename).name);

    if (output.includes(path.sep)) {
      output = path.resolve(output);
    } else {
      output = path.join(path.dirname(filename), output);
    }

    fs.writeFileSync(output, bytecode);

    if (createLoader) {
      createLoaderFile({ output, loaderPattern });
    }

    return output;

    function createLoaderFile ({ output, loaderPattern }) {
      const dirname = path.dirname(output);
      const name = path.parse(output).name;
      const loader = path.join(dirname, loaderPattern.replace('%', name));

      const code = "'use strict';\n\n" + "require('bytenode');\n" +
        `require('./${path.relative(dirname, output)}');\n`;

      fs.writeFileSync(loader, code);
    }
  },

  /**
   * @description Compiles JavaScript files.
   * @param {string[]} files An array of JavaScript filenames.
   * @param {boolean} compileAsModule Whether to compile `code` or `filename`
   * as a CommonJs module. Defaults to true.
   * @param {boolean} createLoader Whether to create loader file alongside the
   * compiled file. Defaults to false.
   * @param {string} loaderPattern The loader pattern using '%' as filename
   * replacer. Defaults to %.loader.js.
   * @param {string} output The output pattern using '%' as filename replacer.
   * Defaults to %.jsc.
   * @returns {string[]} An array of compiled files.
   */
  compileFiles ({
    files,
    compileAsModule = true,
    createLoader = false,
    loaderPattern = '%.loader.js',
    output = '%.jsc'
  }) {
    assert(Array.isArray(files) && files.every(f => typeof f === 'string'),
      new TypeError('files must be an array of strings.'));

    assert(typeof output === 'string',
      new TypeError('output must be a string.'));

    assert(output.includes('%'),
      new Error('output must contain "%" character.'));

    assert(!createLoader || loaderPattern.includes('%'),
      new Error('loaderPattern contain "%" character.'));

    return files.map(filename => {
      try {
        return Bytenode.compileFile({
          filename,
          compileAsModule,
          createLoader,
          loaderPattern,
          output
        });
      } catch (error) {
        return `Error: ${error.message}`;
      }
    });
  },

  /**
   * @description Runs the compiled `bytecode` and returns its result.
   * In most cases, you should use require('./script.jsc') instead, as
   * Bytenode.run() function will NOT return module.exports (in case of
   * `compileAsModule: true`). In case of `compileAsModule: false`, it runs
   * bytecode in the current context, so any free variables will become global
   * variables. If it is called twice, it will run bytecode twice too, which
   * can lead to issues and might crash the application.
   * @param {Buffer} bytecode The bytecode buffer which will be run.
   * @param {string} filename The path to the bytecode file.
   * @returns {any} The result of the very last statement executed in the
   * original script.
   */
  run ({ bytecode, filename }) {
    assert(bytecode != null || filename != null,
      new Error('Either bytecode or filename is required.'));

    assert(bytecode == null || Buffer.isBuffer(bytecode),
      new TypeError('bytecode must be a buffer object.'));

    assert(filename == null || typeof filename === 'string',
      new TypeError('filename must be a string.'));

    if (bytecode == null) {
      bytecode = fs.readFileSync(filename);
    }

    const script = new vm.Script(_dummyCode(bytecode), {
      cachedData: _fixBytecode(bytecode)
    });

    assert(script.cachedDataRejected === false,
      new Error('Invalid or incompatible bytecode (cachedDataRejected).'));

    return script.runInThisContext();

    function _dummyCode (bytecode) {
      const offset = (/^v8\.[89]/.test(process.version)) ? 0xC : 0x8;

      const sourceHash = bytecode.readUInt32LE(offset);

      return (sourceHash >= 2)
        ? '"' + '\u200b'.repeat(sourceHash - 2) + '"'
        : '0'.repeat(sourceHash);
    }

    function _fixBytecode (bytecode) {
      const dummyBytecode = Bytenode.compileCode({ code: '0x2A' });

      const nodeVersion = parseFloat(process.versions.node);

      assert(nodeVersion >= 8.8 && nodeVersion < 17,
        new Error('Only Node.js v8.8 to v16.x versions are supported. ' +
          `You are using Node.js ${process.version}.`));

      if (nodeVersion === 8.8 || nodeVersion === 8.9) {
        dummyBytecode.copy(bytecode, 16, 16, 20);
        dummyBytecode.copy(bytecode, 20, 20, 24);
      } else if (nodeVersion >= 8.10 && nodeVersion < 12) {
        dummyBytecode.copy(bytecode, 12, 12, 16);
        dummyBytecode.copy(bytecode, 16, 16, 20);
      } else {
        dummyBytecode.copy(bytecode, 12, 12, 16);
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
