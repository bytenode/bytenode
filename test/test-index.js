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

it('.compile({ code, filename }) compiles code not filename.', () => {
  let code = 'module.exports = 42;';
  let content = 'module.exports = 43;';
  let filename = path.resolve(__dirname, './43.js');

  fs.writeFileSync(filename, content);

  const output = Bytenode.compile({ code, filename });

  assert(require(output) === 42);

  code = '42;';
  content = '43;';
  filename = path.resolve(__dirname, './43.js');

  fs.writeFileSync(filename, content);

  const noModuleResult = Bytenode.compile({
    code,
    filename,
    compileAsModule: false
  });

  assert(Bytenode.run({ filename: noModuleResult }) === 42);

  fs.unlinkSync(filename);
  fs.unlinkSync(output);
});

it('.compile({ compileAsModule: false } produces non-module bytecode.', () => {
  const code = '42;';
  const compileAsModule = false;

  const bytecode = Bytenode.compile({ code, compileAsModule });

  assert(Bytenode.run({ bytecode }) === 42);
});

it('.compile({ filename }) compiles filename to filename.jsc.', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');

  const output = Bytenode.compile({ filename });

  assert(output === filename.replace('.js', '.jsc'));
  assert(fs.existsSync(filename.replace('.js', '.jsc')));

  fs.unlinkSync(filename.replace('.js', '.jsc'));
});

it('.compile({ filename, output }) compiles filename to output.', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');
  const output = path.resolve(__dirname, './%.bin');

  const returnedOutput = Bytenode.compile({ filename, output });

  assert(path.parse(returnedOutput).base === 'hapi-bundle.min.bin');
  assert(fs.existsSync(returnedOutput));

  // fs.unlinkSync(output); // keep it, it will be used in the next test.
});

it(".registerExtension('.bin') enables running '.bin' files.", () => {
  const output = path.resolve(__dirname, './hapi-bundle.min.bin');

  Bytenode.registerExtension('.bin');

  require(output);

  fs.unlinkSync(output);
});

it('.registerExtension() throws if ext is not valid.', () => {
  assert.throws(() => {
    Bytenode.registerExtension();
  });
  assert.throws(() => {
    Bytenode.registerExtension(43);
  });
  assert.throws(() => {
    Bytenode.registerExtension('jsc');
  });
  assert.throws(() => {
    Bytenode.registerExtension('.jsc');
  });
  assert.throws(() => {
    Bytenode.registerExtension('.js');
  });
});

it('.compile() throws if arguments are of the wrong type.', () => {
  assert.throws(() => {
    Bytenode.compile();
  });
  assert.throws(() => {
    Bytenode.compile({ code: true });
  });
  assert.throws(() => {
    Bytenode.compile({ filename: 43 });
  });
  assert.throws(() => {
    Bytenode.compile({ filename: './non-existent-file.js' });
  });
});

it('.run() throws if arguments are of the wrong type.', () => {
  assert.throws(() => {
    Bytenode.run();
  });
  assert.throws(() => {
    Bytenode.compile({ bytecode: '' });
  });
  assert.throws(() => {
    Bytenode.compile({ filename: 43 });
  });
  assert.throws(() => {
    Bytenode.compile({ filename: './non-existent-file.jsc' });
  });
});
