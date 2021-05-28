'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { it, section } = require('./runner.js');
const Bytenode = require('../lib/index.js');

section('Testing `Bytenode` API:');

it('compiles `code` to `bytecode`.', () => {
  const code = 'console.log("it works");';
  const bytecodeBuffer = Bytenode.compile({ code });
  assert(Buffer.isBuffer(bytecodeBuffer));
});

it('compiles `filename.js` to `filename.jsc`.', () => {
  const filename = path.resolve(__dirname, './sample.js');
  Bytenode.compile({ filename });
  assert(fs.existsSync(filename.replace('.js', '.jsc')));
  fs.unlinkSync(filename.replace('.js', '.jsc'));
});

it('compiles `filename.js` to `output` file.', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');
  const output = path.resolve(__dirname, './hapi-bundle.bin');
  Bytenode.compile({ filename, output });
  assert(fs.existsSync(output));
  // fs.unlinkSync(output); // keep it, it will be used in the next test.
});

it('registers ".bin" as bytecode file.', () => {
  const output = path.resolve(__dirname, './hapi-bundle.bin');
  Bytenode.registerExtension('.bin');
  require(output);
  fs.unlinkSync(output);
});

it('compiles and runs `code` directly if `compileAsModule` is false', () => {
  const code = '42;';
  const compileAsModule = false;
  const bytecode = Bytenode.compile({ code, compileAsModule });
  assert(Bytenode.run({ bytecode }) === 42);
});

it('compiles and runs a complex, big javascript file', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');
  const output = path.resolve(__dirname, './hapi-bundle.jsc');
  Bytenode.compile({
    filename,
    output,
    compileAsModule: true
  });

  require(output);
  fs.unlinkSync(output);
});
