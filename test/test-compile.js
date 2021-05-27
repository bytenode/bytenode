'use strict';

const fs = require('fs');
const path = require('path');
const wrap = require('module').wrap;
const assert = require('assert');
const { it, section } = require('./runner.js');
const Bytenode = require('../lib/index.js');

section('Testing `Bytenode.JavaScriptEntity` class:');

it('creates an instance of JavaScriptEntity with `code`.', () => {
  const code = "console.log('it works');";
  const javaScriptEntity = new Bytenode.JavaScriptEntity({ code });

  assert(javaScriptEntity instanceof Bytenode.JavaScriptEntity);
  assert(javaScriptEntity.code === code);
  assert(javaScriptEntity.compileAsModule === true);
});

it('creates an instance of JavaScriptEntity with `filename`.', () => {
  const filename = path.resolve(__dirname, './sample.js');
  const compileAsModule = false;
  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    filename,
    compileAsModule
  });

  assert(javaScriptEntity instanceof Bytenode.JavaScriptEntity);
  assert(javaScriptEntity.compileAsModule === false);
  assert(javaScriptEntity.filename === filename);
  assert(javaScriptEntity.code === '');

  javaScriptEntity.compile();

  assert(javaScriptEntity.code === fs.readFileSync(filename, 'utf-8'));
});

it('uses `code` parameter if both `code` and `filename` are set.', () => {
  const code = "console.log('it works');";

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    filename: path.resolve(__dirname, './sample.js'),
    compileAsModule: false
  });

  assert(javaScriptEntity instanceof Bytenode.JavaScriptEntity);
  assert(javaScriptEntity.compileAsModule === false);
  assert(javaScriptEntity.code === code);

  javaScriptEntity.compile();

  assert(javaScriptEntity.code === code);
});

it('`compileAsModule` wraps `code` after compiling.', () => {
  const code = "console.log('it works');";
  const compileAsModule = true;
  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    compileAsModule
  });
  javaScriptEntity.compile();
  assert(javaScriptEntity.code === wrap(code));
});

it('compiles `code` to `bytecode`.', () => {
  const code = "console.log('it works');";
  const compileAsModule = false;
  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code,
    compileAsModule
  });
  javaScriptEntity.compile();

  assert(Buffer.isBuffer(javaScriptEntity.bytecode));
});

it('saves `bytecode` to the disk.', () => {
  const code = "console.log('it works');";
  const output = path.resolve(__dirname, './bytecode.jsc');

  const javaScriptEntity = new Bytenode.JavaScriptEntity({
    code
  });

  javaScriptEntity.compile();
  javaScriptEntity.save({ output });

  assert(fs.existsSync(output));
  fs.unlinkSync(output);
});
