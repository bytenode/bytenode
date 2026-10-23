'use strict';

const vm = require('vm');
const { brotliCompressSync } = require('zlib');

function compileCode (javascriptCode, compress) {
  if (typeof javascriptCode !== 'string') {
    throw new Error(`javascriptCode must be string. ${typeof javascriptCode} was given.`);
  }

  const script = new vm.Script(javascriptCode, { produceCachedData: true });
  let bytecodeBuffer = (script.createCachedData && script.createCachedData.call)
    ? script.createCachedData()
    : script.cachedData;
  if (compress) bytecodeBuffer = brotliCompressSync(bytecodeBuffer);
  return bytecodeBuffer;
}

module.exports = compileCode;
