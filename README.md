# Bytenode

A minimalist bytecode compiler for Node.js.

This tool truly compiles your JavaScript code into `V8` bytecode, so that you can protect your source code. It can be used with Node.js, as well as Electron and NW.js (check `examples/` directory).

---

## Install

```console
npm install --save bytenode
```

Or globally:

```console
sudo npm install -g bytenode
```

---

## Known Issues and Limitations

* In Node 10.x, Bytenode does not work in debug mode. See [#29](https://github.com/bytenode/bytenode/issues/29).

* Any code depends on `Function.prototype.toString` function will break, because Bytenode removes the source code from `.jsc` files and puts a dummy code instead. See [#34](https://github.com/bytenode/bytenode/issues/34). For a workaround, see [#163](https://github.com/bytenode/bytenode/issues/163)

* Async Arrow Functions (and Arrow Functions in general) cause crashes in Puppeteer and in Electron apps. See [#106](https://github.com/bytenode/bytenode/issues/106), [#47](https://github.com/bytenode/bytenode/issues/47). They also cause issues with the ndb debugger. See [#135](https://github.com/bytenode/bytenode/issues/135). It seems that whenever there is a context change (or even when called from another file or module), arrow functions break because `V8` inspects them internally using `Function.prototype.toString` in these cases. See [#157](https://github.com/bytenode/bytenode/issues/157).

* **Electron ≥ 42 (V8 ≥ 14.8): bytecode compiled via `ELECTRON_RUN_AS_NODE` crashes the main process with `SIGTRAP`.** V8's serialized bytecode header carries a *read-only snapshot checksum* (header offset 16). The Electron **main/browser** process boots V8 from Chromium's `v8_context_snapshot`, whose read-only heap differs from the Node default snapshot used by `ELECTRON_RUN_AS_NODE`. So a `.jsc` produced with `compileElectronCode()` (run-as-node) carries a checksum that does not match the main process. Starting with V8 14.8 this no longer fails gracefully (`cachedDataRejected`) but hard-aborts (`EXC_BREAKPOINT` / `SIGTRAP`) while deserializing. The fix is to compile in the **same process type** that will load the `.jsc` — use [`compileElectronMainCode()`](#bytenodecompileelectronmaincodejavascriptcode-options--promisebuffer) or `compileFile({ electronMain: true })`, which compile inside an actual Electron main process. (On Electron ≤ 41 / V8 ≤ 14.6 the two checksums happened to be compatible, so `electron: true` worked there.)

---

## Resources

* [How To Compile Node.js Code Using Bytenode](https://hackernoon.com/how-to-compile-node-js-code-using-bytenode-11dcba856fa9)
* [Bytenode Webpack Plugin](https://github.com/herberttn/bytenode-webpack-plugin)
* [Creating JS Binaries For Electron](https://www.jjeff.com/blog/2021/4/27/creating-javascript-binaries-for-electron)
* [Electron Bytenode Example](https://github.com/spaceagetv/electron-bytenode-example)

---

## Bytenode CLI

```console
  Usage: bytenode [option] [ FILE... | - ] [arguments]

  Options:
    -h, --help                        show help information.
    -v, --version                     show bytenode version.

    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files
    --compress                        compress bytecode
    -n, --no-module                   compile without producing commonjs module
    -e, --electron                    compile for Electron
    -ep, --electron-path              path to Electron executable

    -l, --loader [ FILE | PATTERN ]   create a loader file and optionally define
                                      loader filename or pattern using % as
                                      filename replacer
                                      defaults to %.loader.js
    --no-loader                       do not create a loader file, conflicts
                                      with -l
    -t, --loader-type type            create a loader file of type commonjs or
                                      module. Defaults to CommonJS

  Examples:

  $ bytenode -c script.js             compile `script.js` to `script.jsc`.
  $ bytenode -c server.js app.js
  $ bytenode -c src/*.js              compile all `.js` files in `src/` directory.

  $ bytenode -c *.js -l %.load.js     create `filename.load.js` loader files along side `.jsc` files

  $ bytenode script.jsc [arguments]   run `script.jsc` with arguments.
  $ bytenode                          open Node REPL with bytenode pre-loaded.
```

Examples:

* Compile `express-server.js` to `express-server.jsc`.

```console
user@machine:~$ bytenode --compile express-server.js
```

* Run your compiled file `express-server.jsc`.

```console
user@machine:~$ bytenode express-server.jsc
Server listening on port 3000
```

* Compile all `.js` files in `./app` directory.

```console
user@machine:~$ bytenode --compile ./app/*.js
```

* Compile all `.js` files in your project.

```console
user@machine:~$ bytenode --compile ./**/*.js
```

Note: you may need to enable `globstar` option in bash (you should add it to `~/.bashrc`):
`shopt -s globstar`

* Starting from v1.0.0, bytenode can compile from `stdin`.

```console
echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
```

---

## Bytenode API

```javascript
const bytenode = require('bytenode');
```

---

#### bytenode.compileCode(javascriptCode) → {Buffer}

Generates v8 bytecode buffer.

* Parameters:

| Name           | Type   | Description                                          |
| ----           | ----   | -----------                                          |
| javascriptCode | string | JavaScript source that will be compiled to bytecode. |

* Returns:

{Buffer} The generated bytecode.

* Example:

```javascript
let helloWorldBytecode = bytenode.compileCode(
  `console.log('Hello World!');
  43;  // this will be returned`
);
```

This `helloWorldBytecode` bytecode can be saved to a file. However, if you want to use your code as a module (i.e. if your file has some `exports`), you have to compile it using `bytenode.compileFile({compileAsModule: true})`, or wrap your code manually, using `Module.wrap()` function.

---

#### bytenode.compileElectronCode(javascriptCode, options) → {Promise\<Buffer\>}

Asynchronous function which generates v8 bytecode buffer for Electron.

Same as `bytenode.compileCode()`, but generates bytecode for the version of Electron currently installed in node_modules.

* Parameters:

| Name                   | Type   | Description                                          |
| ----                   | ----   | -----------                                          |
| javascriptCode         | string | JavaScript source that will be compiled to bytecode. |
| options                | object | Options object.                                      |
| options.electronPath   | string | Path to Electron executable.                         |

* Returns:

{Promise\<Buffer\>} A Promise which resolves with the generated bytecode.

* Example:

```javascript
let helloWorldBytecode = await bytenode.compileElectronCode(
  `console.log('Hello World!');
  43;  // this will be returned`
);
```

This `helloWorldBytecode` bytecode can be saved to a file. However, if you want to use your code as a module (i.e. if your file has some `exports`), you have to compile it using `bytenode.compileFile({compileAsModule: true})`, or wrap your code manually, using `Module.wrap()` function.

---

#### bytenode.compileElectronMainCode(javascriptCode, options) → {Promise\<Buffer\>}

Asynchronous function which generates v8 bytecode buffer by compiling inside an actual Electron **main process** (NOT `ELECTRON_RUN_AS_NODE`).

Use this instead of `compileElectronCode()` when the `.jsc` will be loaded from the Electron main process on **Electron ≥ 42 (V8 ≥ 14.8)**. Because the main process boots V8 from Chromium's `v8_context_snapshot`, the bytecode's read-only snapshot checksum only matches the runtime when it is produced in the same process type. Compiling via run-as-node there leads to a `SIGTRAP` crash at load time (see [Known Issues](#known-issues-and-limitations)).

It briefly launches Electron (no window is created) to compile, then exits.

> **CI / build environment notes**
>
> Because this spawns the Electron **browser** binary (not Node), the build machine must be able to run Electron:
> * **macOS / Windows** runners (e.g. GitHub Actions `macos-*`, `windows-*`): work out of the box.
> * **Linux** runners: Electron needs a display, so run the build under a virtual framebuffer, e.g. `xvfb-run -a <build command>` (install `xvfb` and the usual Electron shared libs: `libgtk-3-0`, `libnss3`, `libasound2`, …). Headless containers without `xvfb` will fail.
> * Running as **root** in a container: handled automatically — the compile launches Electron with `--no-sandbox` (no renderer is created, so the sandbox is unnecessary).
> * The spawned Electron must be the **same version** that will run the app (it is, when resolved from your project's `node_modules`), so the read-only snapshot checksum matches.
> * Cross-compiling bytecode for another OS/arch is not possible here — the `.jsc` must be produced by the Electron build for the **target** platform. Compile each platform on its own runner.

* Parameters:

| Name                 | Type   | Description                                          |
| ----                 | ----   | -----------                                          |
| javascriptCode       | string | JavaScript source that will be compiled to bytecode. |
| options              | object | Options object.                                      |
| options.electronPath | string | Path to Electron executable. Defaults to the `electron` binary resolved from node_modules. |
| options.compress     | boolean | If true, compress the output bytecode with Brotli.  |

* Returns:

{Promise\<Buffer\>} A Promise which resolves with the generated bytecode.

* Example:

```javascript
let helloWorldBytecode = await bytenode.compileElectronMainCode(
  `console.log('Hello World!');
  43;  // this will be returned`
);
```

---

#### bytenode.runBytecode(bytecodeBuffer) → {any}

Runs v8 bytecode buffer and returns the result.

* Parameters:

| Name           | Type   | Description                                                    |
| ----           | ----   | -----------                                                    |
| bytecodeBuffer | Buffer | The buffer object that was created using compileCode function. |

* Returns:

{any} The result of the very last statement executed in the script.

* Example:

```javascript
const result = bytenode.runBytecode(helloWorldBytecode);
// prints: Hello World!
console.log(result)
// prints: 43
```

---

#### bytenode.compileFile(args, output) → {Promise\<string\>}

Asynchronous function which compiles JavaScript file to .jsc file.

* Parameters:

Name                 | Type              | Description
----                 | ----              | -----------
args                 | object \| string
args.filename        | string            | The JavaScript source file that will be compiled.
args.compileAsModule | boolean           | If true, the output will be a commonjs module. Default: true.
args.electron        | boolean           | If true, the output will be compiled through Electron via `ELECTRON_RUN_AS_NODE`. Default: false.
args.electronMain    | boolean           | If true, compile inside an actual Electron **main process** instead of `ELECTRON_RUN_AS_NODE`. Required for Electron ≥ 42 (V8 ≥ 14.8) when the `.jsc` is loaded from the main process. See [Known Issues](#known-issues-and-limitations). Default: false.
args.electronPath    | string            | Path to Electron executable. Default: Electron binary from node_modules.
args.output          | string            | The output filename. Defaults to the same path and name of the original file, but with `.jsc` extension.
args.createLoader    | boolean \| string | If true, create a CommonJS loader file.  As a string, select between `module` or `commonjs` loader. Default: `false`
args.loaderFilename  | string            | Filename or pattern for generated loader files. Defaults to originalFilename.loader.js. Use % as a substitute for originalFilename.
output               | string            | The output filename. (Deprecated: use args.output instead)

* Returns:

{Promise\<string\>}: A Promise that resolves as the compiled filename.

* Examples:

```javascript
let compiledFilename = bytenode.compileFile({
  filename: '/path/to/your/file.js',
  output: '/path/to/compiled/file.jsc' // if omitted, it defaults to '/path/to/your/file.jsc'
});
```

Previous code will produce a commonjs module that can be required using `require` function.

```javascript
let compiledFilename = await bytenode.compileFile({
  filename: '/path/to/your/file.js',
  output: '/path/to/compiled/file.jsc',
  compileAsModule: false
});
```

Previous code will produce a direct `.jsc` file, that can be run using `bytenode.runBytecodeFile()` function. It can NOT be required as a module. Please note that `compileAsModule` MUST be `false` in order to turn it off. Any other values (including: `null`, `""`, etc) will be treated as `true`. (It had to be done this way in order to keep the old code valid.)

For Electron apps, compile through Electron so the bytecode matches Electron's V8. On Electron ≥ 42 (V8 ≥ 14.8) you must compile in the main process:

```javascript
let compiledFilename = await bytenode.compileFile({
  filename: '/path/to/your/main.js',
  output: '/path/to/compiled/main.jsc',
  electronMain: true // Electron main-process compile (Electron >= 42 / V8 >= 14.8)
  // electron: true  // legacy ELECTRON_RUN_AS_NODE compile (Electron <= 41)
});
```

---

#### bytenode.runBytecodeFile(filename) → {any}

Runs .jsc file and returns the result.

* Parameters:

| Name     | Type   |
| ----     | ----   |
| filename | string |

* Returns:

{any} The result of the very last statement executed in the script.

* Example:

```javascript
// test.js
console.log('Hello World!');
43;  // this will be returned
```

```javascript
const result = bytenode.runBytecodeFile('/path/to/test.jsc');
// prints: Hello World!
console.log(result)
// prints: 43
```

---

#### require(filename) → {any}

* Parameters:

| Name     | Type   |
| ----     | ----   |
| filename | string |

* Returns:

{any} exported module content

* Example:

```javascript
let myModule = require('/path/to/your/file.jsc');
```

Just like regular `.js` modules. You can also omit the extension `.jsc`.

`.jsc` file must have been compiled using `bytenode.compileFile()`, or have been wrapped inside `Module.wrap()` function. Otherwise it won't work as a module and it can NOT be required.

Please note `.jsc` files must run with the same Node.js version that was used to compile it (using same architecture of course). Also, `.jsc` files are CPU-agnostic. However, you should run your tests before and after deployment, because V8 sanity checks include some checks related to CPU supported features, so this may cause errors in some rare cases.

---

## Debugging

Set the `BYTENODE_DEBUG=1` environment variable to print the V8 cached-data header when a `.jsc` is loaded. It dumps, field by field, the on-disk bytecode header alongside a dummy compiled in the **current runtime process** (i.e. what V8 expects), so you can see exactly which field is mismatched:

```console
BYTENODE_DEBUG=1 ./your-electron-app
```

```text
[bytenode] runtime: node v24.16.0, electron 42.4.1, v8 14.8.178.31-electron.0
[bytenode] on-disk .jsc header (before fixBytecode) ...
  versionHash  @4  = 0x995ac8a1   <- must match runtime
  flagHash     @12 = 0x24360e99   <- must match runtime (V8 flags)
  roChecksum   @16 = 0x2c3e475a   <- must match runtime (read-only snapshot)
[bytenode] runtime dummy header (what V8 expects) ...
[bytenode] vm.Script created, cachedData accepted.
```

If `versionHash`, `flagHash` or `roChecksum` differ from the runtime dummy, the cached data is incompatible. A mismatched `roChecksum` specifically indicates the `.jsc` was compiled in a different process type than the one loading it (see [Known Issues](#known-issues-and-limitations)).

---

## Acknowledgements

I had the idea of this tool many years ago. However, I finally decided to implement it after seeing this [issue](https://github.com/nodejs/node/issues/11842) by @hashseed. Also, some parts were inspired by [v8-compile-cache](https://github.com/zertosh/v8-compile-cache) by @zertosh.
