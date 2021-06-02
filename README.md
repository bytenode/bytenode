# Bytenode

A minimalist bytecode compiler for Node.js.

This tool compiles your JavaScript code into `V8` bytecode, so that you can
protect your source code. It can be used with Node.js, as well as Electron and
NW.js.

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

Breaking Changes in Bytenode v2:

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

---

## Known Issues and Limitations

* In Node 10.x, Bytenode does not work in debug mode.
See [#29](https://github.com/bytenode/bytenode/issues/29).

* Any code depends on `Function.prototype.toString` function will break,
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
