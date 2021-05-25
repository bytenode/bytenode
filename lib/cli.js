#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const Bytenode = require('./index.js');
const spawnSync = require('child_process').spawnSync;

const args = process.argv.slice(2);

if (args.includes('-c')) {
  args[args.indexOf('-c')] = '--compile';
}

if (args.includes('-h')) {
  args[args.indexOf('-h')] = '--help';
}

if (args.includes('-v')) {
  args[args.indexOf('-v')] = '--version';
}

if (args.includes('-n')) {
  args[args.indexOf('-n')] = '--no-module';
}

const program = {
  dirname: __dirname,
  filename: __filename,
  nodeBin: process.argv[0],
  flags: args.filter(arg => arg[0] === '-'),
  files: args.filter(arg => arg[0] !== '-' && arg[1] !== '-')
};

console.log(program);

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

    if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
      try {
        Bytenode.compile({ filename, compileAsModule });
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error(`Error: Cannot find file '${filename}'.`);
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
      } catch (error) {
        console.error(error);
      }
    });
  }

  process.exit();
}

try {
  spawnSync(program.nodeBin, [
    '-r',
    path.resolve(__dirname, 'index.js')
  ].concat(args), {
    stdio: 'inherit'
  });
} catch (error) {
  console.error(error);
}
