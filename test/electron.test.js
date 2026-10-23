'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { brotliDecompressSync } = require('zlib');
const { describe, it, before, after } = require('mocha');
const bytenode = require('../lib');
const { createTempDirectory, removeDirectory } = require('./helpers');

let electronPath;
try {
  electronPath = require('electron');
} catch (_) {
  electronPath = undefined;
}
const hasElectron = typeof electronPath === 'string' && fs.existsSync(electronPath);
const canLaunchGui = hasElectron && (process.platform !== 'linux' || !!process.env.DISPLAY);
const electronTests = hasElectron ? describe : describe.skip;
const guiTests = canLaunchGui ? describe : describe.skip;

function launchElectron (args, directory) {
  const env = Object.assign({}, process.env);
  delete env.ELECTRON_RUN_AS_NODE;
  return spawnSync(electronPath, ['--no-sandbox', ...args], {
    cwd: directory,
    env,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024
  });
}

electronTests('Electron compilation', function () {
  this.timeout(120000);
  let directory;

  before(() => { directory = createTempDirectory('bytenode-electron-'); });
  after(() => { removeDirectory(directory); });

  it('compiles for Electron and supports Brotli-compressed output', async () => {
    const bytecode = await bytenode.compileElectronCode('40 + 2;', { electronPath });
    const compressed = await bytenode.compileElectronCode('40 + 2;', {
      electronPath,
      compress: true
    });

    assert.ok(Buffer.isBuffer(bytecode));
    assert.ok(bytecode.length > 24);
    assert.ok(Buffer.isBuffer(compressed));
    assert.ok(brotliDecompressSync(compressed).length > 24);
  });
});

guiTests('Electron process-specific bytecode', function () {
  this.timeout(120000);
  let directory;
  const bytenodeEntry = path.resolve(__dirname, '../lib/index.js');

  before(() => { directory = createTempDirectory('bytenode-electron-context-'); });
  after(() => { removeDirectory(directory); });

  it('loads main-process bytecode in an Electron main process', async () => {
    const source = path.join(directory, 'main-module.js');
    const output = path.join(directory, 'main-module.jsc');
    fs.writeFileSync(source, 'module.exports = 42;\n');
    await bytenode.compileFile({ filename: source, output, electronMain: true });

    const runner = path.join(directory, 'run-main.js');
    fs.writeFileSync(runner, [
      "const { app } = require('electron');",
      'app.disableHardwareAcceleration();',
      `require(${JSON.stringify(bytenodeEntry)});`,
      'app.whenReady().then(() => {',
      '  try {',
      `    const value = require(${JSON.stringify(output)});`,
      '    if (value !== 42) throw new Error("Unexpected export: " + value);',
      '    process.stdout.write("LOADED:42");',
      '    app.exit(0);',
      '  } catch (error) {',
      '    process.stderr.write(String(error.stack || error));',
      '    app.exit(1);',
      '  }',
      '});'
    ].join('\n'));

    const result = launchElectron([`--user-data-dir=${path.join(directory, 'main-user-data')}`, runner], directory);
    assert.equal(result.status, 0, result.stderr || result.error);
    assert.match(result.stdout, /LOADED:42/);
  });

  it('loads renderer bytecode from a preload script', async () => {
    const source = path.join(directory, 'renderer-module.js');
    const output = path.join(directory, 'renderer-module.jsc');
    fs.writeFileSync(source, 'module.exports = 42;\n');
    await bytenode.compileFile({ filename: source, output, electronRenderer: true });

    const preload = path.join(directory, 'preload.js');
    const main = path.join(directory, 'run-renderer.js');
    fs.writeFileSync(preload, [
      "const { ipcRenderer } = require('electron');",
      'try {',
      `  require(${JSON.stringify(bytenodeEntry)});`,
      `  const value = require(${JSON.stringify(output)});`,
      '  ipcRenderer.send("bytenode-result", "RESULT:" + value);',
      '} catch (error) {',
      '  ipcRenderer.send("bytenode-result", "ERROR:" + String(error.stack || error));',
      '}'
    ].join('\n'));
    fs.writeFileSync(main, [
      "const { app, BrowserWindow, ipcMain } = require('electron');",
      'app.disableHardwareAcceleration();',
      'ipcMain.on("bytenode-result", (_event, result) => {',
      '  process.stdout.write(result);',
      '  app.exit(result === "RESULT:42" ? 0 : 1);',
      '});',
      'app.whenReady().then(() => {',
      '  const window = new BrowserWindow({ show: false, webPreferences: {',
      `    preload: ${JSON.stringify(preload)},`,
      '    nodeIntegration: true, contextIsolation: false, sandbox: false',
      '  }});',
      '  window.webContents.on("render-process-gone", (_event, details) => {',
      '    process.stderr.write("Renderer exited: " + details.reason);',
      '    app.exit(2);',
      '  });',
      '  window.loadURL("about:blank");',
      '});'
    ].join('\n'));

    const result = launchElectron([`--user-data-dir=${path.join(directory, 'user-data')}`, main], directory);
    assert.equal(result.status, 0, result.stderr || result.error);
    assert.match(result.stdout, /RESULT:42/);
  });
});

if (hasElectron && !canLaunchGui && process.platform === 'linux') {
  console.warn('Skipping Electron main/renderer integration cases because DISPLAY is unset.');
}
