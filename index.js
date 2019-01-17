'use strict';

const fs = require('fs');
const vm = require('vm');
const v8 = require('v8');
const path = require('path');
const Module = require('module');

v8.setFlagsFromString('--no-lazy');

const COMPILED_EXTNAME = '.jsc';

const compileCode = function (javascriptCode) {

  let script = new vm.Script(javascriptCode, {
    produceCachedData: true
  });

  let bytecodeBuffer = (script.createCachedData && script.createCachedData.call) ?
    script.createCachedData()
    :
    script.cachedData;

  return bytecodeBuffer;
};

const fixBytecode = function (bytecodeBuffer) {

  let dummyBytecode = compileCode('"ಠ_ಠ"');

  if (process.version.startsWith('v8.8') || process.version.startsWith('v8.9')) {
    // Node is v8.8.x or v8.9.x
    dummyBytecode.slice(16, 20).copy(bytecodeBuffer, 16);
    dummyBytecode.slice(20, 24).copy(bytecodeBuffer, 20);
  } else {
    dummyBytecode.slice(12, 16).copy(bytecodeBuffer, 12);
    dummyBytecode.slice(16, 20).copy(bytecodeBuffer, 16);
  }

  return bytecodeBuffer;
};

const readSourceHash = function (bytecodeBuffer) {

  if (process.version.startsWith('v8.8') || process.version.startsWith('v8.9')) {
    // Node is v8.8.x or v8.9.x
    return bytecodeBuffer.slice(12, 16).reduce((sum, number, power) => sum += number * Math.pow(256, power), 0);
  } else {
    return bytecodeBuffer.slice(8, 12).reduce((sum, number, power) => sum += number * Math.pow(256, power), 0);
  }
};

const runBytecode = function (bytecodeBuffer) {

  bytecodeBuffer = fixBytecode(bytecodeBuffer);

  let length = readSourceHash(bytecodeBuffer);

  let dummyCode = ' '.repeat(length);

  let script = new vm.Script(dummyCode, {
    cachedData: bytecodeBuffer
  });

  script.runInThisContext();
};

const compileFile = function (filename, output) {

  let javascriptCode = fs.readFileSync(filename, 'utf-8');

  let bytecodeBuffer = compileCode(Module.wrap(javascriptCode.replace(/^#!.*/, '')));

  let compiledFilename = output || filename.slice(0, -3) + COMPILED_EXTNAME;

  fs.writeFileSync(compiledFilename, bytecodeBuffer);

  return compiledFilename;
};

const runBytecodeFile = function (filename) {

  let bytecodeBuffer = fs.readFileSync(filename);

  return runBytecode(bytecodeBuffer);
};

Module._extensions[COMPILED_EXTNAME] = function (module, filename) {

  let bytecodeBuffer = fs.readFileSync(filename);

  bytecodeBuffer = fixBytecode(bytecodeBuffer);

  let length = readSourceHash(bytecodeBuffer);

  let dummyCode = ' '.repeat(length);

  let script = new vm.Script(dummyCode, {
    filename: filename,
    lineOffset: 0,
    displayErrors: true,
    cachedData: bytecodeBuffer
  });

  if (script.cachedDataRejected) {
    throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
  }

  /*
  This part is based on:
  https://github.com/zertosh/v8-compile-cache/blob/7182bd0e30ab6f6421365cee0a0c4a8679e9eb7c/v8-compile-cache.js#L158-L178
  */

  function require(id) {
    return module.require(id);
  }
  require.resolve = function (request, options) {
    return Module._resolveFilename(request, module, false, options);
  };
  require.main = process.mainModule;

  require.extensions = Module._extensions;
  require.cache = Module._cache;

  let compiledWrapper = script.runInThisContext({
    filename: filename,
    lineOffset: 0,
    columnOffset: 0,
    displayErrors: true,
  });

  let dirname = path.dirname(filename);

  let args = [module.exports, require, module, filename, dirname, process, global];

  return compiledWrapper.apply(module.exports, args);
};

global.bytenode = {
  compileCode, compileFile,
  runBytecode, runBytecodeFile
};

module.exports = global.bytenode;