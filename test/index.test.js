"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const spawn = require("child_process").spawn;
const spawnSync = require("child_process").spawnSync;
const { describe, it, before, after } = require("mocha");
const bytenode = require("../lib/index.js");
const electronPath = require("electron");

const TEMP_DIR = "temp";
const TEST_FILE = "testfile.js";
const TEST_CODE = "console.log('      Greetings from Bytenode!');43;";

describe("Bytenode", () => {
  let bytecode;

  describe("compileCode()", () => {
    it("compiles without error", () => {
      assert.doesNotThrow(() => {
        bytecode = bytenode.compileCode(TEST_CODE);
      });
    });
    it("returns non-zero-length buffer", () => {
      assert.notStrictEqual(bytecode.length, 0);
    });
  });

  describe("compileCode(), with compress = true", () => {
    it("compiles without error", () => {
      assert.doesNotThrow(() => {
        bytecode = bytenode.compileCode(TEST_CODE, true);
      });
    });
    it("returns non-zero-length buffer", () => {
      assert.notStrictEqual(bytecode.length, 0);
    });
  });

  describe("compileElectronCode()", () => {
    it("compiles code", async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE);
      }, "Rejection Error Compiling For Electron");
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, "Zero Length Buffer");
    });

    it("compiles code, with compress = true", async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE, {
          compress: true,
        });
      }, "Rejection Error Compiling For Electron");
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, "Zero Length Buffer");
    });

    it("compiles code with electron path", async () => {
      let eBytecode;
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE, {
          electronPath,
        });
      }, "Rejection Error Compiling For Electron");
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, "Zero Length Buffer");
    });
  });

  describe("runBytecode()", () => {
    it("runs without error", () => {
      assert.doesNotThrow(() => {
        const result = bytenode.runBytecode(bytecode);

        assert.strictEqual(result, 43);
      });
    });
  });

  describe("compileFile()", () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace(".js", ".jsc"));
    const loaderFile = path.join(tempPath, TEST_FILE);

    it("creates non-zero length binary and loader files", async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          try {
            bytenode
              .compileFile({
                filename: testFilePath,
                output: outputFile,
                loaderFilename: "%.js",
              })
              .then(() => resolve());
          } catch (err) {
            reject(err);
          }
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, "Zero Length .jsc File");
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, "Zero Length Loader File");
    });

    it("compiles with compress = true", async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          try {
            bytenode
              .compileFile({
                filename: testFilePath,
                output: outputFile,
                compress: true,
              })
              .then(() => resolve());
          } catch (err) {
            reject(err);
          }
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, "Zero Length .jsc File");
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, "Zero Length Loader File");
    });

    it("runs the .jsc file via require()", () => {
      assert.doesNotThrow(() => {
        const result = require(outputFile);

        assert.strictEqual(result, 42);
      }, "Error While Running Loader File");
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe("compileFile() for Electron", () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace(".js", ".jsc"));
    const loaderFile = path.join(tempPath, TEST_FILE);

    it("creates non-zero length binary and loader files", async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          bytenode
            .compileFile({
              filename: testFilePath,
              output: outputFile,
              loaderFilename: "%.js",
              electron: true,
            })
            .then(() => resolve())
            .catch((err) => reject(err));
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, "Zero Length .jsc File");
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, "Zero Length Loader File");
    });

    it("runs the .jsc file via Electron", async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          const electronPath = require("electron");
          const bytenodePath = path.resolve(__dirname, "../lib/cli.js");
          const proc = spawn(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: "1" },
          });
          proc.on("message", (message) => console.log(message));
          proc.on("error", (err) => reject(err));
          proc.on("exit", () => resolve());
        });
      }, "Rejected While Running .jsc in Electron");
    });

    it("creates non-zero length binary and loader files with electron path", async () => {
      rimraf(tempPath, false);
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          bytenode
            .compileFile({
              filename: testFilePath,
              output: outputFile,
              loaderFilename: "%.js",
              electronPath,
            })
            .then(resolve)
            .catch(reject);
        });
      });
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, "Zero Length .jsc File");
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, "Zero Length Loader File");
    });

    it("runs the .jsc file via Electron", async () => {
      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          const electronPath = require("electron");
          const bytenodePath = path.resolve(__dirname, "../lib/cli.js");
          const proc = spawn(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: "1" },
          });
          proc.on("message", (message) => console.log(message));
          proc.on("error", (err) => reject(err));
          proc.on("exit", () => resolve());
        });
      }, "Rejected While Running .jsc in Electron");
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe("compileFile() with electronRenderer = true", function () {
    this.timeout(60000);

    const tempPath = path.join(__dirname, TEMP_DIR);
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace(".js", ".jsc"));

    it("creates a non-zero length binary file", async () => {
      await bytenode.compileFile({
        filename: testFilePath,
        output: outputFile,
        electronRenderer: true,
      });
      assert.ok(fs.statSync(outputFile).size, "Zero Length .jsc File");
    });

    it("rejects electronMain combined with electronRenderer", async () => {
      await assert.rejects(
        bytenode.compileFile({
          filename: testFilePath,
          output: outputFile,
          electronMain: true,
          electronRenderer: true,
        }),
        /mutually exclusive/,
      );
    });

    it("runs the .jsc file in a preload script", async () => {
      // A hidden window whose preload requires the .jsc and reports the result.
      const preload = path.join(tempPath, "preload.js");
      const main = path.join(tempPath, "main.js");
      fs.writeFileSync(
        preload,
        [
          "const { ipcRenderer } = require('electron');",
          "try {",
          "  require(" +
            JSON.stringify(path.resolve(__dirname, "../lib/index.js")) +
            ");",
          "  ipcRenderer.send('result', require(" +
            JSON.stringify(outputFile) +
            "));",
          "} catch (err) {",
          "  ipcRenderer.send('result', String(err));",
          "}",
        ].join("\n"),
      );
      fs.writeFileSync(
        main,
        [
          "const { app, BrowserWindow, ipcMain } = require('electron');",
          "app.disableHardwareAcceleration();",
          "ipcMain.on('result', (_e, r) => { process.stdout.write('RESULT ' + JSON.stringify(r) + '\\n'); app.exit(0); });",
          "app.whenReady().then(() => {",
          "  const win = new BrowserWindow({ show: false, webPreferences: {",
          "    preload: " +
            JSON.stringify(preload) +
            ", nodeIntegration: true, contextIsolation: false, sandbox: false } });",
          "  win.webContents.on('render-process-gone', () => app.exit(2));",
          "  win.loadURL('about:blank');",
          "});",
        ].join("\n"),
      );

      const args = [
        main,
        "--no-sandbox",
        "--user-data-dir=" + path.join(tempPath, "user-data"),
      ];
      const env = Object.assign({}, process.env);
      delete env.ELECTRON_RUN_AS_NODE;

      const output = await new Promise((resolve, reject) => {
        let out = "";
        const proc = spawn(electronPath, args, { env });
        proc.stdout.on("data", (chunk) => {
          out += chunk;
        });
        proc.stderr.on("data", (chunk) => {
          out += chunk;
        });
        proc.on("error", reject);
        proc.on("close", () => resolve(out));
      });

      assert.ok(
        output.includes("RESULT 42"),
        "Unexpected preload output:\n" + output,
      );
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe("compileFile() for Electron main process (electronMain)", () => {
    // `electronMain` compiles inside a real Electron *browser* process, which is
    // slow to boot — give each case room. On headless Linux CI the process needs
    // a virtual display (the workflow wraps the run in xvfb).
    const tempPath = path.join(__dirname, TEMP_DIR + "-electron-main");
    const testFilePath = path.join(__dirname, TEST_FILE);
    const outputFile = path.join(tempPath, TEST_FILE.replace(".js", ".jsc"));
    const loaderFile = path.join(tempPath, TEST_FILE);

    before(async function () {
      this.timeout(120000);
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
      await bytenode.compileFile({
        filename: testFilePath,
        output: outputFile,
        loaderFilename: "%.js",
        electronMain: true,
      });
    });

    it("creates non-zero length binary and loader files", () => {
      const jscStats = fs.statSync(outputFile);
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist");
      assert.ok(jscStats.size, "Zero Length .jsc File");
      const loaderStats = fs.statSync(loaderFile);
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist");
      assert.ok(loaderStats.size, "Zero Length Loader File");
    });

    it("produces bytecode that loads in a real Electron main process", async function () {
      this.timeout(120000);
      // The whole point of electronMain: the .jsc must load in the browser/main
      // process (where ELECTRON_RUN_AS_NODE bytecode would be rejected on V8 >=
      // 14.8). Launch Electron normally (NOT run-as-node) and require the bytecode.
      const runnerPath = path.join(tempPath, "runner.js");
      const repoLib = path.resolve(__dirname, "..", "lib", "index.js");
      const runnerSrc = [
        "const { app } = require('electron');",
        'if (typeof app.disableHardwareAcceleration === "function") app.disableHardwareAcceleration();',
        "if (app.commandLine && app.commandLine.appendSwitch) app.commandLine.appendSwitch('no-sandbox');",
        // Register bytenode's .jsc require hook, then load the bytecode directly.
        // (The generated loader uses require('bytenode'), which can't resolve
        // inside a checkout of bytenode itself.)
        "require(" + JSON.stringify(repoLib) + ");",
        "app.whenReady().then(() => {",
        "  try {",
        "    const value = require(" + JSON.stringify(outputFile) + ");",
        '    process.stdout.write("LOADED:" + String(value));',
        "    app.exit(0);",
        "  } catch (err) {",
        "    process.stderr.write(String((err && err.stack) || err));",
        "    app.exit(1);",
        "  }",
        "});",
      ].join("\n");
      fs.writeFileSync(runnerPath, runnerSrc);

      await assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          // --no-sandbox before the script path: same reason as the compiler in
          // lib/index.js — the SUID sandbox initializes before the script can
          // disable it, and a switch after the path is treated as an app argument.
          const proc = spawn(electronPath, ["--no-sandbox", runnerPath]); // browser process
          let out = "";
          let err = "";
          proc.stdout.on("data", (d) => {
            out += d;
          });
          proc.stderr.on("data", (d) => {
            err += d;
          });
          proc.on("error", reject);
          // 'close' (not 'exit') so stdout/stderr are fully drained before we
          // assert on `out` — matches the production code and avoids truncation.
          proc.on("close", (code) => {
            if (code === 0 && out.includes("LOADED:42")) resolve();
            else
              reject(
                new Error("Loader failed (code " + code + "): " + (err || out)),
              );
          });
        });
      }, "electronMain .jsc failed to load in an Electron main process");
    });

    it("rejects with the underlying error when compilation fails", async function () {
      this.timeout(120000);
      const badFile = path.join(tempPath, "bad-input.js");
      fs.writeFileSync(badFile, "const x = ;"); // guaranteed SyntaxError
      await assert.rejects(
        () =>
          bytenode.compileFile({
            filename: badFile,
            output: path.join(tempPath, "bad.jsc"),
            electronMain: true,
          }),
        // The real compile error must be surfaced to the caller, not swallowed
        // behind a generic "exit code 1". (Regression guard for the error contract.)
        (e) => /SyntaxError/.test(e.message),
        "expected the underlying SyntaxError to surface in the rejection",
      );
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });
  });

  describe("CLI --compile exit status", () => {
    const cliPath = path.resolve(__dirname, "../lib/cli.js");
    const tempPath = path.join(__dirname, "cli-tmp");

    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
      }
    });

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath);
      }
    });

    it("exits with status 1 when the source has a syntax error", () => {
      const filename = path.join(tempPath, "syntax-error.js");
      fs.writeFileSync(filename, "});\n");
      const result = spawnSync(process.execPath, [cliPath, "-c", filename], {
        encoding: "utf8",
      });
      assert.strictEqual(result.status, 1);
    });

    it("exits with status 1 when the input file does not exist", () => {
      const filename = path.join(tempPath, "no-such-file.js");
      const result = spawnSync(process.execPath, [cliPath, "-c", filename], {
        encoding: "utf8",
      });
      assert.strictEqual(result.status, 1);
    });

    it("exits with status 1 when stdin source has a syntax error", () => {
      const result = spawnSync(
        process.execPath,
        [cliPath, "--compile", "--no-module", "-"],
        {
          encoding: "utf8",
          input: "});\n",
        },
      );
      assert.strictEqual(result.status, 1);
    });

    it("exits with status 0 when compilation succeeds", () => {
      const filename = path.join(tempPath, "ok.js");
      fs.writeFileSync(filename, "module.exports = 1;\n");
      const result = spawnSync(process.execPath, [cliPath, "-c", filename], {
        encoding: "utf8",
      });
      assert.strictEqual(result.status, 0);
    });
  });
});

/**
 * Remove directory recursively
 * @param {string} dirPath - Path to directory
 * @param {boolean} [removeSelf=true] - Remove directory itself
 * @see https://stackoverflow.com/a/42505874/14350317
 */
function rimraf(dirPath, removeSelf = true) {
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
