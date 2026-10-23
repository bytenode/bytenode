'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function createTempDirectory (prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeDirectory (directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    if (fs.lstatSync(entryPath).isDirectory()) removeDirectory(entryPath);
    else fs.unlinkSync(entryPath);
  }
  fs.rmdirSync(directory);
}

function runNode (script, args = [], options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: options.encoding === undefined ? 'utf8' : options.encoding,
    timeout: options.timeout || 30000,
    input: options.input,
    env: options.env || process.env,
    maxBuffer: 8 * 1024 * 1024
  });
}

module.exports = { createTempDirectory, removeDirectory, runNode };
