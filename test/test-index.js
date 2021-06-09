'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { it, section } = require('./runner.js');
const Bytenode = require('../lib/index.js');

section('Testing Bytenode API:');

it('.compileCode({ code }) returns a Buffer object.',
  () => {
    const code = 'module.exports = 42;';
    const filename = path.resolve(__dirname, 'file.js');

    const bytecode = Bytenode.compileCode({ code, filename });

    assert(Buffer.isBuffer(bytecode));

    fs.writeFileSync(`${filename}c`, bytecode);

    assert(require(`${filename}c`) === 42);
  });

it(".compileCode({ compileAsModule: false }) doesn't produces a module.",
  () => {
    const code = '42;';
    const compileAsModule = false;

    const bytecode = Bytenode.compileCode({ code, compileAsModule });

    assert(Bytenode.run({ bytecode }) === 42);
  });

it('.compileFile({ filename }) compiles filename to filename.jsc.',
  () => {
    const filename = path.resolve(__dirname, './hapi-bundle.min.js');

    const output = Bytenode.compileFile({ filename });

    assert(output === filename.replace('.js', '.jsc'));
    assert(fs.existsSync(filename.replace('.js', '.jsc')));

    fs.unlinkSync(filename.replace('.js', '.jsc'));
  });

it('.compileFile({ filename, output }) compiles filename to output.',
  () => {
    const filename = path.resolve(__dirname, './hapi-bundle.min.js');
    const output = path.resolve(__dirname, './%.bin');

    const returnedOutput = Bytenode.compileFile({ filename, output });

    assert(path.parse(returnedOutput).base === 'hapi-bundle.min.bin');
    assert(fs.existsSync(returnedOutput));

    // fs.unlinkSync(output); // keep it, it will be used in the next test.
  });

it(".registerExtension('.bin') enables requiring '.bin' files.",
  () => {
    const output = path.resolve(__dirname, './hapi-bundle.min.bin');

    Bytenode.registerExtension('.bin');

    require(output);

    fs.unlinkSync(output);
  });

it('.registerExtension() throws if ext is not valid.',
  () => {
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

it('.compileCode() throws if arguments are of the wrong type.',
  () => {
    assert.throws(() => {
      Bytenode.compileCode();
    });
    assert.throws(() => {
      Bytenode.compileCode({ code: true });
    });
    assert.throws(() => {
      Bytenode.compileCode({ code: '42;', filename: 43 });
    });
  });

it('.compileFile() throws if arguments are of the wrong type',
  () => {
    assert.throws(() => {
      Bytenode.compileFile();
    });
    assert.throws(() => {
      Bytenode.compileFile({ filename: './non-existent-file.js' });
    });
    // TODO add more assertions for other parameters.
  });

it('.run() throws if arguments are of the wrong type.',
  () => {
    assert.throws(() => {
      Bytenode.run();
    });
    assert.throws(() => {
      Bytenode.run({ bytecode: '' });
    });
    assert.throws(() => {
      Bytenode.run({ filename: 43 });
    });
    assert.throws(() => {
      Bytenode.run({ filename: './non-existent-file.jsc' });
    });
  });
