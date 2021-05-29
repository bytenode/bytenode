#!/usr/bin/env node

'use strict';

const path = require('path');
const Bytenode = require('./index.js');
const spawnSync = require('child_process').spawnSync;

const args = process.argv.slice(2);

if (args.includes('-h')) {
  args[args.indexOf('-h')] = '--help';
}

if (args.includes('-v')) {
  args[args.indexOf('-v')] = '--version';
}

if (args.includes('-c')) {
  args[args.indexOf('-c')] = '--compile';
}

if (args.includes('-n')) {
  args[args.indexOf('-n')] = '--no-module';
}

const program = {
  dirname: __dirname,
  filename: __filename,
  nodeBin: process.argv[0],
  args: args,
  flags: args.filter(arg => arg[0] === '-'),
  files: args.filter(arg => arg[0] !== '-' && arg[1] !== '-')
};

if (program.flags.includes('--use')) {
  const nextParam = program.args[program.args.indexOf('--use') + 1];

  if (nextParam == null || nextParam.startsWith('-')) {
    console.error('--use flag expects the next argument to be the ' +
      'path of node, electron or nwjs executable.');
    process.exit(1);
  }

  try {
    program.args[program.args.indexOf('--use') + 1] = null;
    program.args[program.args.indexOf('--use')] = null;

    spawnSync(nextParam, [
      program.filename,
      ...program.args.filter(Boolean)
    ], {
      stdio: 'inherit'
    });

    process.exit();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (program.files.length === 0 && program.flags.length === 1) {
  if (program.flags.includes('--help')) {
    console.log(`
    Usage: bytenode [option] [ FILE... | - ] [arguments]
    `); // TODO complete the help message
    process.exit();
  }

  if (program.flags.includes('--version')) {
    const pkg = require('../package.json');
    console.log('Bytenode', pkg.version, '| Node', process.versions.node);
    // TODO show electron version, and nwjs version if possible.
    process.exit();
  }
}

if (program.flags.includes('--compile')) {
  const compileAsModule = !program.flags.includes('--no-module');

  program.files.forEach(function (filename) {
    filename = path.resolve(filename);

    try {
      Bytenode.compile({ filename, compileAsModule });
    } catch (error) {
      console.error(error.message);
    }
  });

  if (program.flags.includes('-')) {
    let code = '';

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      if (chunk !== null) {
        code += chunk;
      }
    });

    process.stdin.on('end', () => {
      try {
        process.stdout.write(Bytenode.compile({ code, compileAsModule }));
        process.exit();
      } catch (error) {
        console.error(error.message);
        process.exit(1);
      }
    });
  } else {
    process.exit();
  }
}

try {
  spawnSync(program.nodeBin, [
    '-r',
    path.resolve(program.dirname, 'index.js')
  ].concat(args), {
    stdio: 'inherit'
  });
  process.exit();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
