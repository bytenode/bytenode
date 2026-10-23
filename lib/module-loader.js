'use strict';

const fs = require('fs');
const Module = require('module');
const path = require('path');

function registerCompiledExtension (extension, generateScript) {
  Module._extensions[extension] = function loadBytecodeModule (fileModule, filename) {
    const script = generateScript(fs.readFileSync(filename), filename);

    // This follows the CommonJS wrapper contract used by Node's module loader.
    function require (id) {
      return fileModule.require(id);
    }
    require.resolve = function (request, options) {
      return Module._resolveFilename(request, fileModule, false, options);
    };
    if (process.main) require.main = process.main;
    require.extensions = Module._extensions;
    require.cache = Module._cache;

    const compiledWrapper = script.runInThisContext({
      filename,
      lineOffset: 0,
      columnOffset: 0,
      displayErrors: true
    });
    const dirname = path.dirname(filename);
    const args = [fileModule.exports, require, fileModule, filename, dirname, process, global];
    return compiledWrapper.apply(fileModule.exports, args);
  };
}

module.exports = registerCompiledExtension;
