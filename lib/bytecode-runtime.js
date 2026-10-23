'use strict';

const assert = require('assert').strict;
const vm = require('vm');
const { brotliDecompressSync } = require('zlib');
const { isBytecode, readSourceHash, patchRuntimeHeader } = require('./cache-format');

function createBytecodeRuntime (compileCode, debug) {
  function dumpHeader (label, buffer) {
    const fields = ['magic', 'versionHash', 'sourceHash', 'flagHash', 'roChecksum', 'payloadLen', 'checksum'];
    const lines = [`[bytenode] ${label} (buffer length = ${buffer.length})`];
    for (let i = 0; i < fields.length && i * 4 + 4 <= buffer.length; i++) {
      const offset = i * 4;
      const value = buffer.readUInt32LE(offset);
      lines.push(`  ${fields[i].padEnd(12)} @${offset} = 0x${value.toString(16).padStart(8, '0')} (${value})`);
    }
    console.error(lines.join('\n'));
  }

  function fixBytecode (buffer) {
    patchRuntimeHeader(buffer, compileCode('"ಠ_ಠ"'));
  }

  function generateScript (cachedData, filename) {
    if (!isBytecode(cachedData)) {
      cachedData = brotliDecompressSync(cachedData);
      assert.ok(isBytecode(cachedData), 'Invalid bytecode buffer');
    }

    if (debug) {
      console.error(`[bytenode] loading ${filename || '<buffer>'}`);
      console.error(`[bytenode] runtime: node ${process.version}` +
        (process.versions.electron ? `, electron ${process.versions.electron}` : '') +
        `, v8 ${process.versions.v8}`);
      dumpHeader('on-disk .jsc header (before fixBytecode)', cachedData);
      try {
        dumpHeader('runtime dummy header (what V8 expects)', compileCode('"\u0ca0_\u0ca0"'));
      } catch (error) {
        console.error('[bytenode] failed to compile runtime dummy:', error && error.message);
      }
    }

    fixBytecode(cachedData);
    if (debug) dumpHeader('on-disk .jsc header (after fixBytecode)', cachedData);
    const length = readSourceHash(cachedData);
    const dummyCode = length > 1 ? '"' + '\u200b'.repeat(length - 2) + '"' : '';
    if (debug) console.error(`[bytenode] sourceHash/dummy length = ${length}; about to call new vm.Script(...)`);

    const script = new vm.Script(dummyCode, { cachedData, filename });
    if (script.cachedDataRejected) throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
    if (debug) console.error('[bytenode] vm.Script created, cachedData accepted.');
    return script;
  }

  function runBytecode (buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error('bytecodeBuffer must be a buffer object.');
    return generateScript(buffer).runInThisContext();
  }

  return { generateScript, fixBytecode, readSourceHash, runBytecode };
}

module.exports = createBytecodeRuntime;
