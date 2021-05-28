'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { it, section } = require('./runner.js');
const Bytenode = require('../lib/index.js');

section('Testing `Bytenode.BytecodeEntity` class:');

it('create an instance of BytecodeEntity with `bytecode` buffer.', () => {
  const code = "console.log('it works');";

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    compileAsModule: false
  });
  javaScriptEntity.compile();

  const bytecodeEntity = new Bytenode.BytecodeEntity({
    bytecode: javaScriptEntity.bytecode
  });

  assert(Buffer.isBuffer(bytecodeEntity.bytecode));
  assert.deepStrictEqual(bytecodeEntity.bytecode, javaScriptEntity.bytecode);
});

it('create an instance of BytecodeEntity with `filename`.', () => {
  const filename = path.resolve(__dirname, './sample.js');
  const output = path.resolve(__dirname, './sample.jsc');

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    filename,
    compileAsModule: false
  });
  javaScriptEntity.compile();
  javaScriptEntity.save({ output });

  const bytecodeEntity = new Bytenode.BytecodeEntity({
    filename: output
  });

  bytecodeEntity._fixBytecode();

  assert(Buffer.isBuffer(bytecodeEntity.bytecode));
  assert.deepStrictEqual(bytecodeEntity.bytecode, javaScriptEntity.bytecode);
});

it('runs `bytecode` and returns its result.', () => {
  const code = '42;';

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    compileAsModule: false
  });
  javaScriptEntity.compile();

  const bytecodeEntity = new Bytenode.BytecodeEntity({
    bytecode: javaScriptEntity.bytecode
  });

  assert(bytecodeEntity.run() === 42);
});

it('runs a compiled module and preserve its exports.', () => {
  const code = 'exports.value = 42;';
  const output = path.resolve(__dirname, './code.jsc');
  const compileAsModule = true;

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    compileAsModule
  });
  javaScriptEntity.compile();
  javaScriptEntity.save({ output });

  const value = require(output).value;

  assert(value === 42);
  fs.unlinkSync(output);
});

it('compiles and runs a complex, big javascript file', () => {
  const filename = path.resolve(__dirname, './hapi-bundle.min.js');
  const output = path.resolve(__dirname, './hapi-bundle.jsc');
  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    filename,
    compileAsModule: true
  });

  assert(javaScriptEntity instanceof Bytenode.JavaScriptEntity);

  javaScriptEntity.compile();
  javaScriptEntity.save({ output });

  require(output);
  fs.unlinkSync(output);
});
