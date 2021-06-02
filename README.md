# Bytenode

A minimalist bytecode compiler for Node.js.

This tool compiles your JavaScript code into `V8` bytecode, so that you can
protect your source code. It can be used with Node.js, as well as Electron and
NW.js.

---

## Install:

```console
npm install --save bytenode
```

Or globally:

```console
sudo npm install -g bytenode
```

---

## Breaking Changes in Bytenode v2:

* Functions `.compileCode()` and `.compileFile()` were removed. Use
`Bytenode.compile()` function instead. See Bytenode API below for  more
details.

* Function `.compileElectronCode()` was removed as well. If you want to compile
for electron, pass its executable to Bytenode cli (using `--use` flag). See
Bytenode CLI below for more details.

* Functions `.runBytecode()` and `.runBytecodeFile()` were removed. Use
`Bytenode.run()` function instead. See Bytenode API below for  more
details.

* Bytenode supports Node.js from v8.8 to v16, and it will throw an error when
used with an unsupported Node.js version. Future versions will be added in time
of their release.

* The global `bytenode` variable was removed. Bytenode must be explicitly
required `const Bytenode = require('bytenode');`.

---

## Known Issues and Limitations:

* In Node 10.x, Bytenode does not work in debug mode.
See [#29](https://github.com/bytenode/bytenode/issues/29).

* Any code depends on `Function.prototype.toString()` function will break,
because Bytenode removes the source code from `.jsc` files and puts a dummy
code instead. See [#34](https://github.com/bytenode/bytenode/issues/34).

* Arrow functions (especially Async arrow functions) cause crash in Puppeteer
and in Electron apps if used in render processes. See
[#106](https://github.com/bytenode/bytenode/issues/106),
[#47](https://github.com/bytenode/bytenode/issues/47). They also cause an
issue with the ndb debugger.
See [#135](https://github.com/bytenode/bytenode/issues/135). Use the usual
Async functions instead.

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

### Examples:

* Compile all `.js` files in `./app` directory.
```console
user@machine:~$ bytenode --compile ./app/*.js
```

* Compile all `.js` files in your project.
```console
user@machine:~$ bytenode --compile ./**/*.js
```
Note: you may need to enable `globstar` option in bash (you should add it to `~/.bashrc`):
`shopt -s globstar`.

* Compile from `stdin` and save to `hello.jsc` file.
```console
user@machine:~$ echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
```

* Use NW.js executable to compile `main.js`. (`nw` should be installed first, `npm install nw`).
```console
user@machine:~$ bytenode -c main.js --use ./node_modules/nw/nwjs/nw
```

---

## Bytenode API:

<a name="Bytenode"></a>

* [Bytenode](#Bytenode) : <code>module</code>
    * [.compile({ code, filename, compileAsModule, output })](#Bytenode.compile) ⇒ <code>string</code> \| <code>Buffer</code>
    * [.run({ bytecode, filename })](#Bytenode.run) ⇒ <code>any</code>
    * [.registerExtension(ext)](#Bytenode.registerExtension)

<a name="Bytenode.compile"></a>

### Bytenode.compile({ code, filename, [compileAsModule], output }) ⇒ <code>string</code> \| <code>Buffer</code>
Compiles JavaScript `code` or `filename`.

**Returns**: <code>string</code> \| <code>Buffer</code> - The path to the compiled file. If `output` is set deliberatly to `null` or `undefined`, the bytecode buffer will be returned instead.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| code | <code>string</code> |  | The source code that will be compiled. |
| filename | <code>string</code> |  | The JavaScript filename. This filename will be used in stack traces produced by this script. If `code` is not specified, `filename` will be compiled instead. |
| [compileAsModule] | <code>boolean</code> | <code>true</code> | whether to compile `code` or `filename` as a CommonJs module. Defaults to true. |
| output | <code>string</code> |  | The output filename. Defaults to the same path and name as `filename`, but with `.jsc` extension. |

<a name="Bytenode.run"></a>

### Bytenode.run({ bytecode, filename }) ⇒ <code>any</code>
Runs the compiled `bytecode` and returns its result. In most cases, you should use `require('script.jsc');` instead, as `Bytenode.run();` function will NOT return module.exports properly. Also, if it is called twice, it will run `bytecode` twice in the current context, which can lead to issues and might crash the application.

**Returns**: <code>any</code> - The result of the very last statement executed in the original script.  

| Param | Type | Description |
| --- | --- | --- |
| bytecode | <code>Buffer</code> | The bytecode buffer which wll be run. |
| filename | <code>string</code> | The path to the bytecode file. |

<a name="Bytenode.registerExtension"></a>

### Bytenode.registerExtension(ext)
Registers the extension `ext` in Node.js module system, so that they can be required using `require()` function. 

| Param | Type | Description |
| --- | --- | --- |
| ext | <code>string</code> | A valid extension with a preceding dot (e.g. `.jsc` or `.bin`). |

---
