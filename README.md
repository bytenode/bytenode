# Bytenode

A minimalist bytecode compiler for Node.js.

This tool compiles your JavaScript code into `V8` bytecode, so that you can protect your source code. It can be used with Node.js, as well as Electron and NW.js.

---

## Install:

Locally:

```console
user@machine:~$ npm install --save bytenode
```
```JavaScript
const Bytenode = require('bytenode');
```

Or globally:

```console
user@machine:~$ sudo npm install -g bytenode
```

---

## Breaking Changes in Bytenode v2:

* Functions `.compileCode()` and `.compileFile()` were removed. Use `Bytenode.compile()` function instead. See Bytenode API below for  more details.

* Function `.compileElectronCode()` was removed as well. If you want to compile for Electron, pass its executable to Bytenode CLI (using `--use` flag). See Bytenode CLI below for more details.

* Functions `.runBytecode()` and `.runBytecodeFile()` were removed. Use `Bytenode.run()` function instead. See Bytenode API below for  more details.

* Bytenode supports Node.js from v8.8 to v16, and it will throw an error when used with an unsupported Node.js version. Future versions will be added in time of their release.

* The global `bytenode` variable was removed. Bytenode must be explicitly required and assigned to a variable.

---

## Known Issues and Limitations:

* In Node 10.x, Bytenode does not work in debug mode. See [#29](https://github.com/bytenode/bytenode/issues/29).

* Any code that depends on `Function.prototype.toString()` function will break, because Bytenode removes the source code from `.jsc` files and puts a dummy code instead. See [#34](https://github.com/bytenode/bytenode/issues/34).

* Arrow functions (especially Async arrow functions) cause crash in Puppeteer and in Electron apps if used in render processes. See [#106](https://github.com/bytenode/bytenode/issues/106), [#47](https://github.com/bytenode/bytenode/issues/47). They also cause an issue with the ndb debugger. See [#135](https://github.com/bytenode/bytenode/issues/135). Use the usual Async functions instead.

---

## Bytenode CLI:

```
  Usage: bytenode [option] [ FILE... | - ] [arguments]

  Options:
    -h, --help                        show help information.
    -v, --version                     show Bytenode version.

        --use     [ EXECUTABLE ]      use this executable instead of the default Node.js.
                                      Electron and NW.js executables can be used.

    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files.
    -n, --no-module                   compile without producing commonjs module.

    -l, --loader  [ FILE | PATTERN ]  create a loader file and optionally define
                                      loader filename or pattern using % as filename replacer.
                                      defaults to %.loader.js

  Examples:

  $ bytenode -c script.js             compile `script.js` to `script.jsc`.
  $ bytenode -c src/*.js              compile all `.js` files in `src/` directory.

  $ bytenode -c ./*.js -l %.load.js   create `filename.load.js` loader files along side `.jsc` files

  $ bytenode script.jsc [arguments]   run `script.jsc` with arguments.

  $ bytenode                          open Node REPL where `.jsc` files can be required directly.

  $ echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
                                      compile from stdin and save to `hello.jsc`.

  $ bytenode -c main.js --use ./node_modules/electron/dist/electron
                                      use Electron executable to compile `main.js`.

  $ bytenode -c main.js --use ./node_modules/nw/nwjs/nw
                                      use NW.js executable to compile `main.js`.
```

### CLI Examples:

* Compile all `.js` files in `./app` directory.

```console
user@machine:~$ bytenode --compile ./app/*.js
```

* Compile all `.js` files in your project. You may need to enable `globstar` option in bash (you should add it to `~/.bashrc`): `shopt -s globstar`.

```console
user@machine:~$ bytenode --compile ./**/*.js
```

* Compile from `stdin` and save to `hello.jsc` file.

```console
user@machine:~$ echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
```

* Use Electron executable to compile `main.js`. (`electron` must be installed first, `npm install electron`).

```console
user@machine:~$ bytenode -c main.js --use ./node_modules/electron/dist/electron
```

* Use NW.js executable to compile `main.js`. (`nw` must be installed first, `npm install nw`).

```console
user@machine:~$ bytenode -c main.js --use ./node_modules/nw/nwjs/nw
```

---

<a name="BytenodeAPI"></a>

## Bytenode API:

* [Bytenode](#BytenodeAPI):
    * [.compile({ code, filename, compileAsModule, output })](#Bytenode.compile) ⇒ <code>string</code> \| <code>Buffer</code>
    * [.run({ bytecode, filename })](#Bytenode.run) ⇒ <code>any</code>
    * [.registerExtension(ext)](#Bytenode.registerExtension)

<a name="Bytenode.compile"></a>

### Bytenode.compile({ code, filename, compileAsModule, createLoader, loaderPattern, output }) ⇒ <code>string</code> \| <code>Buffer</code>

Compiles JavaScript `code` or `filename`.

**Returns**: <code>string</code> \| <code>Buffer</code> - The path to the compiled file. If `output` is set deliberatly to `null` or `undefined`, the bytecode buffer will be returned instead.  

| Param           | Type                 | Description                                                                                                                                                   |
| ---             | ---                  | ---                                                                                                                                                           |
| code            | <code>string</code>  | The source code that will be compiled.                                                                                                                        |
| filename        | <code>string</code>  | The JavaScript filename. This filename will be used in stack traces produced by this script. If `code` is not specified, `filename` will be compiled instead. |
| compileAsModule | <code>boolean</code> | whether to compile `code` or `filename` as a CommonJs module.<br>Defaults to `true`.                                                                          |
| createLoader    | <code>boolean</code> | Whether to create loader file along side the compiled file.<br>Defaults to `false`.                                                                           |
| loaderPattern   | <code>string</code>  | The loader filename or pattern using '%' as filename replacer.<br>Defaults to %.loader.js.                                                                    |
| output          | <code>string</code>  | The output filename.<br>Defaults to the same path and name as `filename`, but with `.jsc` extension.                                                          |

<a name="Bytenode.run"></a>

### Bytenode.run({ bytecode, filename }) ⇒ <code>any</code>

Runs the compiled `bytecode` and returns its result.

In most cases, you should use `require('./script.jsc')` instead, as `Bytenode.run()` function will NOT return `module.exports` (in case of `compileAsModule: true`). In case of `compileAsModule: false`, it runs `bytecode` in the current context, so any free variables will become global variables. If it is called twice, it will run `bytecode` twice too, which can lead to issues and might crash the application.

**Returns**: <code>any</code> - The result of the very last statement executed in the original script.  

| Param    | Type                | Description                           |
| ---      | ---                 | ---                                   |
| bytecode | <code>Buffer</code> | The bytecode buffer which will be run. |
| filename | <code>string</code> | The path to the bytecode file.        |

<a name="Bytenode.registerExtension"></a>

### Bytenode.registerExtension(ext)

Registers the extension `ext` in Node.js module system, so that they can be required using `require()` function. 

| Param | Type                | Description                                                     |
| ---   | ---                 | ---                                                             |
| ext   | <code>string</code> | A valid extension with a preceding dot (e.g. `.jsc` or `.bin`). |

---
