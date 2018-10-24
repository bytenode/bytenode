#!/usr/bin/env node

const v8 = require('v8');
const fs = require('fs');
const path = require('path');
const bytenode = require('./index.js');

v8.setFlagsFromString('--no-lazy');

const program = {
  dirname: __dirname,
  filename: __filename,
  nodeBin: process.argv[0],
  flags: process.argv.filter(arg => arg[0] === '-'),
  files: process.argv.slice(2).filter(arg => arg[0] !== '-' && arg[1] !== '-'),
};

if (program.flags.includes('-v') || program.flags.includes('--version')) {

  const package = require('./package.json');
  console.log(package.name, package.version);
  process.exit(0);
}

if (program.flags.includes('-h') || program.flags.includes('--help')) {

  console.log(`
Usage: ${path.basename(__filename)} [options] filename [filename2 filename3 ...]

  Options:

    -r, --run            run <file> [<file2> <file3> ...]
    -c, --compile        compile <file> [<file2> <file3> ...]

    -h, --help           output usage information
    -v, --version        output the version number
`);

  process.exit(0);
}

if (program.flags.includes('-r') || program.flags.includes('--run')) {

  program.files.forEach(function (file) {

    try {
      require(path.resolve(file));
    } catch (error) {
      console.error(error);
    }
  });

  process.exit(0);
}

if (program.flags.includes('-c') || program.flags.includes('--compile')) {

  program.files.forEach(function (file) {

    if (fs.existsSync(file) && fs.statSync(file).isFile() && path.extname(file) == '.js') {

      try {
        bytenode.compileFile(file);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error(`Error: Cannot find file '${file}'`);
    }
  });

  process.exit(0);
}

console.log(program);