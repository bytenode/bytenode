'use strict';

const MAGIC_NUMBER = Buffer.from([0xde, 0xc0]);
const ZERO_LENGTH_EXTERNAL_REFERENCE_TABLE = Buffer.alloc(2);
const HEADER_LENGTH = 24;

function isBytecode (buffer) {
  return Buffer.isBuffer(buffer) &&
    !buffer.subarray(0, 2).equals(ZERO_LENGTH_EXTERNAL_REFERENCE_TABLE) &&
    buffer.subarray(2, 4).equals(MAGIC_NUMBER);
}

function getNodeVersion (version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return { major, minor };
}

function sourceHashOffset (version = process.versions.node) {
  const { major, minor } = getNodeVersion(version);
  return major === 8 && minor >= 8 && minor <= 9 ? 12 : 8;
}

function readSourceHash (buffer, version = process.versions.node) {
  if (!Buffer.isBuffer(buffer)) throw new Error('bytecodeBuffer must be a buffer object.');
  const offset = sourceHashOffset(version);
  if (buffer.length < offset + 4) throw new Error('Invalid bytecode buffer: header is incomplete.');
  return buffer.readUInt32LE(offset);
}

function patchRuntimeHeader (bytecode, dummy, version = process.versions.node) {
  if (!Buffer.isBuffer(bytecode) || !Buffer.isBuffer(dummy)) {
    throw new Error('bytecodeBuffer and runtime header must be buffer objects.');
  }
  if (bytecode.length < HEADER_LENGTH || dummy.length < HEADER_LENGTH) {
    throw new Error('Invalid bytecode buffer: header is incomplete.');
  }

  const { major, minor } = getNodeVersion(version);
  const legacyV8 = major === 8 && minor >= 8 && minor <= 9;
  const modernV8 = major >= 12;
  const ranges = legacyV8 ? [[16, 20], [20, 24]]
    : modernV8 ? [[12, 16]]
      : [[12, 16], [16, 20]];

  for (const [start, end] of ranges) dummy.copy(bytecode, start, start, end);
  return {
    layout: legacyV8 ? 'v8.8/v8.9' : modernV8 ? 'node>=12' : 'node 9/10/11',
    ranges
  };
}

module.exports = { HEADER_LENGTH, isBytecode, readSourceHash, patchRuntimeHeader };
