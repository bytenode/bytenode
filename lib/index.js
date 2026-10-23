'use strict';

const createBytecodeRuntime = require('./bytecode-runtime');
const createElectronCompiler = require('./electron-compiler');
const createFileCompiler = require('./file-compiler');
const compileCode = require('./compiler');
const registerCompiledExtension = require('./module-loader');
const { addLoaderFile, loaderCodeCommonJS, loaderCodeModule } = require('./loaders');
const fs = require('fs');
const v8 = require('v8');

v8.setFlagsFromString('--no-lazy');

if (Number.parseInt(process.versions.node, 10) >= 12) {
  v8.setFlagsFromString('--no-flush-bytecode'); // Thanks to A-Parser (@a-parser)
}

const COMPILED_EXTNAME = '.jsc';

// Set BYTENODE_DEBUG=1 to print the V8 cached-data header layout at load time.
// This is the key diagnostic for SIGTRAP crashes on newer V8 (e.g. Electron 42 / V8 14.8):
// it lets us compare, field by field, the .jsc compiled at build time against a dummy
// compiled in the *current* runtime process, so we can see exactly which header field
// (version hash / flag hash / read-only snapshot checksum) is mismatched.
const DEBUG = !!process.env.BYTENODE_DEBUG;

const { generateScript, runBytecode } = createBytecodeRuntime(compileCode, DEBUG);

const { compileElectronCode, compileElectronMainCode, compileElectronRendererCode } =
  createElectronCompiler(DEBUG);

const compileFile = createFileCompiler(compileCode, {
  compileElectronCode, compileElectronMainCode, compileElectronRendererCode
}, addLoaderFile);

/**
 * Runs .jsc file and returns the result.
 * @param   {string} filename
 * @returns {any}    The result of the very last statement executed in the script.
 */
const runBytecodeFile = function (filename) {
  if (typeof filename !== 'string') {
    throw new Error(`filename must be a string. ${typeof filename} was given.`);
  }

  const bytecodeBuffer = fs.readFileSync(filename);

  return runBytecode(bytecodeBuffer);
};

registerCompiledExtension(COMPILED_EXTNAME, generateScript);

const bytenode = {
  compileCode,
  compileFile,
  compileElectronCode,
  compileElectronMainCode,
  compileElectronRendererCode,
  runBytecode,
  runBytecodeFile,
  addLoaderFile,
  loaderCode: loaderCodeCommonJS,
  loaderCodeCommonJS,
  loaderCodeModule
};

// `global.bytenode` was part of the historical API; keep it as an alias while
// making the exported object the canonical reference inside this module.
global.bytenode = bytenode;
module.exports = bytenode;
