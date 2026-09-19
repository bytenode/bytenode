'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const { describe, it, before, after } = require('mocha');
const bytenode = require('../lib/index.js');
const electronPath = require('electron');

const TEMP_DIR = 'temp';
const TEST_FILE = 'testfile.js';
const TEST_CODE = "console.log('      Greetings from Bytenode!');43;";

describe('Bytenode', () => {
  let bytecode;

  describe('compileCode()', () => {
    it('compiles without error', () => {
      assert.doesNotThrow(() => {
        bytecode = bytenode.compileCode(TEST_CODE);
      });
    });
    it('returns non-zero-length buffer', () => {
      assert.notStrictEqual(bytecode.length, 0);
    });
  });

  describe('compileCode(), with compress = true', () => {
    it('compiles without error', () => {
      assert.doesNotThrow(() => {
        bytecode = bytenode.compileCode(TEST_CODE, true);
      });
    });
    it('returns non-zero-length buffer', () => {
      assert.notStrictEqual(bytecode.length, 0);
    });
  });

  describe('compileElectronCode()', () => {
    it('compiles code', async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE);
      }, 'Rejection Error Compiling For Electron');
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, 'Zero Length Buffer');
    });

    it('compiles code, with compress = true', async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE, {
          compress: true
        });
      }, 'Rejection Error Compiling For Electron');
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, 'Zero Length Buffer');
    });

    it('compiles code with electron path', async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE, {
          electronPath
        });
      }, 'Rejection Error Compiling For Electron');
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, 'Zero Length Buffer');
    });
  });

  describe('runBytecode()', () => {
    it('runs without error', () => {
      assert.doesNotThrow(() => {
        const result = bytenode.runBytecode(bytecode);

        assert.strictEqual(result, 43);
      });
    });
  });

  describe('compileFile()', () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace('.js', '.jsc'));
    const loaderFile = path.join(tempPath, TEST_FILE);

    it('creates non-zero length binary and loader files', async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          try {
            bytenode.compileFile({
              filename: testFilePath,
              output: outputFile,
              loaderFilename: '%.js'
            }).then(() => resolve());
          } catch (err) {
            reject(err);
          }
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, 'Zero Length .jsc File');
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, 'Zero Length Loader File');
    });

    it('compiles with compress = true', async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          try {
            bytenode.compileFile({
              filename: testFilePath,
              output: outputFile,
              compress: true
            }).then(() => resolve());
          } catch (err) {
            reject(err);
          }
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, 'Zero Length .jsc File');
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, 'Zero Length Loader File');
    });

    it('runs the .jsc file via require()', () => {
      assert.doesNotThrow(() => {
        const result = require(outputFile);

        assert.strictEqual(result, 42);
      }, 'Error While Running Loader File');
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe('compileFile() for Electron', () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace('.js', '.jsc'));
    const loaderFile = path.join(tempPath, TEST_FILE);

    it('creates non-zero length binary and loader files', async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          bytenode.compileFile({
            filename: testFilePath,
            output: outputFile,
            loaderFilename: '%.js',
            electron: true
          }).then(() => resolve()).catch(err => reject(err));
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, 'Zero Length .jsc File');
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, 'Zero Length Loader File');
    });

    it('runs the .jsc file via Electron', async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          const electronPath = require('electron');
          const bytenodePath = path.resolve(__dirname, '../lib/cli.js');
          const proc = spawn(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: '1' }
          });
          proc.on('message', message => console.log(message));
          proc.on('error', (err) => reject(err));
          proc.on('exit', () => resolve());
        });
      }, 'Rejected While Running .jsc in Electron');
    });

    it('creates non-zero length binary and loader files with electron path', async () => {
      rimraf(tempPath, false);
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          bytenode.compileFile({
            filename: testFilePath,
            output: outputFile,
            loaderFilename: '%.js',
            electronPath,
          }).then(resolve).catch(reject);
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, 'Zero Length .jsc File');
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, 'Zero Length Loader File');
    });

    it('runs the .jsc file via Electron', async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          const electronPath = require('electron');
          const bytenodePath = path.resolve(__dirname, '../lib/cli.js');
          const proc = spawn(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: '1' }
          });
          proc.on('message', message => console.log(message));
          proc.on('error', (err) => reject(err));
          proc.on('exit', () => resolve());
        });
      }, 'Rejected While Running .jsc in Electron');
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe('compileFile() with electronRenderer = true', function () {
    this.timeout(60000);

    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace('.js', '.jsc'));

    it('creates a non-zero length binary file', async () => {
      await bytenode.compileFile({
        filename: testFilePath,
        output: outputFile,
        electronRenderer: true
      });
      assert.ok(fs.statSync(outputFile).size, 'Zero Length .jsc File');
    });

    it('rejects electronMain combined with electronRenderer', async () => {
      await assert.rejects(bytenode.compileFile({
        filename: testFilePath,
        output: outputFile,
        electronMain: true,
        electronRenderer: true
      }), /mutually exclusive/);
    });

    it('runs the .jsc file in a preload script', async () => {
      // A hidden window whose preload requires the .jsc and reports the result.
      const preload = path.join(tempPath, 'preload.js');
      const main = path.join(tempPath, 'main.js');
      fs.writeFileSync(preload, [
        "const { ipcRenderer } = require('electron');",
        'try {',
        '  require(' + JSON.stringify(path.resolve(__dirname, '../lib/index.js')) + ');',
        "  ipcRenderer.send('result', require(" + JSON.stringify(outputFile) + '));',
        '} catch (err) {',
        "  ipcRenderer.send('result', String(err));",
        '}'
      ].join('\n'));
      fs.writeFileSync(main, [
        "const { app, BrowserWindow, ipcMain } = require('electron');",
        'app.disableHardwareAcceleration();',
        "ipcMain.on('result', (_e, r) => { process.stdout.write('RESULT ' + JSON.stringify(r) + '\\n'); app.exit(0); });",
        'app.whenReady().then(() => {',
        '  const win = new BrowserWindow({ show: false, webPreferences: {',
        '    preload: ' + JSON.stringify(preload) + ', nodeIntegration: true, contextIsolation: false, sandbox: false } });',
        "  win.webContents.on('render-process-gone', () => app.exit(2));",
        "  win.loadURL('about:blank');",
        '});'
      ].join('\n'));

      const args = [main, '--no-sandbox', '--user-data-dir=' + path.join(tempPath, 'user-data')];
      const env = Object.assign({}, process.env);
      delete env.ELECTRON_RUN_AS_NODE;

      const output = await new Promise((resolve, reject) => {
        let out = '';
        const proc = spawn(electronPath, args, { env });
        proc.stdout.on('data', chunk => { out += chunk; });
        proc.stderr.on('data', chunk => { out += chunk; });
        proc.on('error', reject);
        proc.on('close', () => resolve(out));
      });

      assert.ok(output.includes('RESULT 42'), 'Unexpected preload output:\n' + output);
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });
});

/**
 * Remove directory recursively
 * @param {string} dirPath - Path to directory
 * @param {boolean} [removeSelf=true] - Remove directory itself
 * @see https://stackoverflow.com/a/42505874/14350317
 */
function rimraf (dirPath, removeSelf = true) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(function (entry) {
      const entryPath = path.join(dirPath, entry);
      if (fs.lstatSync(entryPath).isDirectory()) {
        rimraf(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    });
    if (removeSelf) {
      fs.rmdirSync(dirPath);
    }
  } else {
    if (!removeSelf) {
      fs.mkdirSync(dirPath);
    }
  }
}

