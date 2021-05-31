'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const execSync = require('child_process').execSync;
const { it, section } = require('./runner.js');
const pkg = require('../package.json');
const Bytenode = require('../lib/index.js');
const cli = path.resolve(__dirname, '../lib/cli.js');

section('Testing Bytenode CLI:');

it('`bytenode --version` shows bytenode\'s version.', () => {
  const c1 = execSync(`node ${cli} --version`, { encoding: 'utf-8' });
  const c2 = execSync(`node ${cli} -v`, { encoding: 'utf-8' });

  assert(c1.startsWith(`Bytenode ${pkg.version}`));
  assert(c2 === c1);
});

it('`bytenode --help` shows help message.', () => {
  const c1 = execSync(`node ${cli} --help`, { encoding: 'utf-8' });
  const c2 = execSync(`node ${cli} -h`, { encoding: 'utf-8' });

  assert(c1.includes('Usage: bytenode'));
  assert(c2 === c1);
});

it('`bytenode --compile` compiles file.js to file.jsc.', () => {
  const code = 'module.exports = 42;';
  const filename = path.resolve(__dirname, 'file.js');
  const output = path.resolve(__dirname, 'file.jsc');

  fs.writeFileSync(filename, code);

  execSync(`node ${cli} --compile ${filename}`, { encoding: 'utf-8' });

  assert(fs.existsSync(output));
  assert(require(output) === 42);

  fs.unlinkSync(filename);
  fs.unlinkSync(output);
});

it('`bytenode --compile -` compiles code from stdin.', () => {
  const bytecode = execSync(`echo '42;' | node ${cli} --compile --no-module -`,
    { encoding: 'buffer' });

  assert(Bytenode.run({ bytecode }) === 42);
});

it('`bytenode -c --no-module` compiles file.js as a non-module file.', () => {
  const code = '42;';
  const filename = path.resolve(__dirname, 'file-no-module.js');
  const output = path.resolve(__dirname, 'file-no-module.jsc');

  fs.writeFileSync(filename, code);

  execSync(`node ${cli} -c --no-module ${filename}`, { encoding: 'utf-8' });

  assert(fs.existsSync(output));
  assert(Bytenode.run({ filename: output }) === 42);

  fs.unlinkSync(filename);
  fs.unlinkSync(output);
});

it('`bytenode file.jsc` runs file.jsc.', () => {
  const code = 'console.log("42");';
  const filename = path.resolve(__dirname, 'run-file.js');
  const output = path.resolve(__dirname, 'run-file.jsc');

  fs.writeFileSync(filename, code);

  execSync(`node ${cli} -c ${filename}`, { encoding: 'utf-8' });
  const c1 = execSync(`node ${cli} ${output}`, { encoding: 'utf-8' });

  assert(fs.existsSync(output));
  assert(c1 === '42\n');

  fs.unlinkSync(filename);
  fs.unlinkSync(output);
});

it('`bytenode file.jsc arg1 arg2` runs file.jsc with arguments.', () => {
  const code = 'console.log(process.argv.slice(2).join(" "));';
  const filename = path.resolve(__dirname, 'file-args.js');
  const output = path.resolve(__dirname, 'file-args.jsc');
  const args = 'arg1 arg2';

  fs.writeFileSync(filename, code);

  execSync(`node ${cli} -c ${filename}`, { encoding: 'utf-8' });
  const c1 = execSync(`node ${cli} ${output} ${args}`, { encoding: 'utf-8' });

  assert(fs.existsSync(output));
  assert(c1 === `${args}\n`);

  fs.unlinkSync(filename);
  fs.unlinkSync(output);
});
