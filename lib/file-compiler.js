'use strict';

const fs = require('fs');
const Module = require('module');
const path = require('path');
const { createSourceMap } = require('./source-maps');

function createFileCompiler (compileCode, electronCompilers, addLoaderFile) {
  const { compileElectronCode, compileElectronMainCode, compileElectronRendererCode } = electronCompilers;
  const COMPILED_EXTNAME = '.jsc';
  const sheBangRegex = /^#!.*/;

/**
 * Compiles JavaScript file to .jsc file.
 * @param   {object|string} args
 * @param   {string}          args.filename The JavaScript source file that will be compiled
 * @param   {boolean}         [args.compileAsModule=true] If true, the output will be a commonjs module
 * @param   {boolean}         [args.compress=false] If true, compress the output bytecode
 * @param   {string}          [args.output=filename.jsc] The output filename. Defaults to the same path and name of the original file, but with `.jsc` extension.
 * @param   {boolean}         [args.electron=false] If true, compile code for Electron.
 * @param   {boolean}         [args.electronMain=false] If true, compile inside an Electron main process (for main-process and worker_threads code).
 * @param   {boolean}         [args.electronRenderer=false] If true, compile inside an Electron renderer (for preload scripts and renderer pages).
 * @param   {string}          [args.electronPath] (optional) path to Electron executable. When present, the `electron` argument is ignored.
 * @param   {boolean|string}  [args.createLoader=false] If true, create a CommonJS loader file. As a string, select between 'module' or 'commonjs' loader.
 * @param   {boolean}         [args.loaderFilename='%.loader.js'] Filename or pattern for generated loader files. Defaults to originalFilename.loader.js. Use % as a substitute for originalFilename.
 * @param   {string}        [output] The output filename. (Deprecated: use args.output instead)
 * @returns {Promise<string>}        A Promise which returns the compiled filename
 */
const compileFile = async function (args, output) {
  let filename, compileAsModule, compress, electron, electronMain, electronRenderer, createLoader, loaderFilename, electronPath, sourceMap;

  if (typeof args === 'string') {
    filename = args;
    compileAsModule = true;
    compress = false;
    electron = false;
    electronMain = false;
    createLoader = false;
    sourceMap = false;
  } else if (typeof args === 'object') {
    filename = args.filename;
    compileAsModule = args.compileAsModule !== false;
    compress = args.compress;
    electron = args.electron || !!args.electronPath;
    // Compile inside an Electron main process (required for Electron >= 42 / V8 >= 14.8).
    electronMain = args.electronMain;
    // Compile inside an Electron renderer (required for preloads/renderers on Electron >= 43.5.1).
    electronRenderer = args.electronRenderer;
    electronPath = args.electronPath;
    createLoader = args.createLoader;
    loaderFilename = args.loaderFilename;
    sourceMap = args.sourceMap;
    if (loaderFilename && !createLoader) createLoader = true;
  }

  if (typeof filename !== 'string') {
    throw new Error(`filename must be a string. ${typeof filename} was given.`);
  }

  if (createLoader && typeof createLoader !== 'string') {
    createLoader = 'commonjs';
  }

  // @ts-ignore
  const compiledFilename = args.output || output || filename.slice(0, -path.extname(filename).length) + COMPILED_EXTNAME;

  if (typeof compiledFilename !== 'string') {
    throw new Error(`output must be a string. ${typeof compiledFilename} was given.`);
  }

  if (sourceMap !== undefined && typeof sourceMap !== 'boolean') {
    throw new Error('sourceMap must be a boolean when specified.');
  }

  const javascriptCode = fs.readFileSync(filename, 'utf-8');

  const sheBang = javascriptCode.match(sheBangRegex);
  let code = javascriptCode.replace(sheBangRegex, '');

  if (compileAsModule) {
    code = Module.wrap(code);
  }

  const wrapperPrefixLength = compileAsModule
    ? Module.wrap('__BYTENODE_SOURCE__').indexOf('__BYTENODE_SOURCE__')
    : 0;

  let bytecodeBuffer;

  if (electronMain && electronRenderer) {
    throw new Error('electronMain and electronRenderer are mutually exclusive: bytecode for one context is rejected in the other.');
  }

  if (electronRenderer) {
    bytecodeBuffer = await compileElectronRendererCode(code, { compress, electronPath });
  } else if (electronMain) {
    bytecodeBuffer = await compileElectronMainCode(code, { compress, electronPath });
  } else if (electron) {
    bytecodeBuffer = await compileElectronCode(code, { compress, electronPath });
  } else {
    bytecodeBuffer = compileCode(code, compress);
  }

  fs.writeFileSync(compiledFilename, bytecodeBuffer);

  if (sourceMap) {
    const map = createSourceMap(code, path.resolve(filename), path.resolve(compiledFilename), wrapperPrefixLength);
    fs.writeFileSync(compiledFilename + '.map', JSON.stringify(map));
  }

  if (createLoader) {
    addLoaderFile(compiledFilename, loaderFilename, createLoader, sheBang);
  }

  return compiledFilename;
};


  return compileFile;
}

module.exports = createFileCompiler;
