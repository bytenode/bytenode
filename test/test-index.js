'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { it, section } = require('./runner.js');
const Bytenode = require('../lib/index.js');

section('Testing Bytenode API:');

it('.compile({ code }) returns a Buffer object.', () => {
  const code = 'console.log("it works");';

  const bytecodeBuffer = Bytenode.compile({ code });

  assert(Buffer.isBuffer(bytecodeBuffer));
});

it('.compile({ filename }) compiles `filename` to `filename.jsc`.', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');

  const output = Bytenode.compile({ filename });

  assert(output === filename.replace('.js', '.jsc'));
  assert(fs.existsSync(filename.replace('.js', '.jsc')));

  fs.unlinkSync(filename.replace('.js', '.jsc'));
});

it('.compile({ filename, output }) compiles `filename` to `output`.', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');
  const output = path.resolve(__dirname, './hapi-bundle.bin');

  const returnedOutput = Bytenode.compile({ filename, output });

  assert(output === returnedOutput);
  assert(fs.existsSync(output));

  // fs.unlinkSync(output); // keep it, it will be used in the next test.
});

it(".registerExtension('.bin') enable running '.bin' files.", () => {
  const output = path.resolve(__dirname, './hapi-bundle.bin');

  Bytenode.registerExtension('.bin');

  require(output);

  fs.unlinkSync(output);
});

it('.compile({ compileAsModule: false } produce non-module bytecode.', () => {
  const code = '42;';
  const compileAsModule = false;

  const bytecode = Bytenode.compile({ code, compileAsModule });

  assert(Bytenode.run({ bytecode }) === 42);
});
