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
