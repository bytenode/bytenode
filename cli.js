#!/usr/bin/env node

const v8 = require('v8');
const fs = require('fs');
const path = require('path');
const wrap = require('module').wrap;
const spawnSync = require('child_process').spawnSync;

const bytenode = require('./index.js');

let args = process.argv.slice(2);

if (args.includes('-c')) {
  args[args.indexOf('-c')] = '--compile';
}
if (args.includes('-o')) {
  args[args.indexOf('-o')] = '--out';
}

if (args.includes('-h')) {
  args[args.indexOf('-h')] = '--help';
}

if (args.includes('-v')) {
  args[args.indexOf('-v')] = '--version';
}

const program = {
  dirname: __dirname,
  filename: __filename,
  nodeBin: process.argv[0],
  flags: args.filter(arg => arg[0] === '-'),
  files: args.filter(arg => arg[0] !== '-' && arg[1] !== '-'),
};

if (program.flags.includes('--compile')) {

  program.files.forEach(function (filename) {

    filename = path.resolve(filename);

    if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {

      let compileAsModule = !program.flags.includes('--no-module');

      try {
        bytenode.compileFile({ filename, compileAsModule });
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error(`Error: Cannot find file '${filename}'.`);
    }
  });

  if (program.files.length === 0) {

    let script = '';

    process.stdin.setEncoding('utf-8');

    process.stdin.on('readable', () => {
      let data = process.stdin.read();
      if (data !== null) {
        script += data;
      }
    });

    process.stdin.on('end', () => {

      try {
        process.stdout.write(bytenode.compileCode(wrap(script)));
      } catch (error) {
        console.error(error);
      }
    });
  }
}

else if (program.flags.includes('--help')) {

  console.log(`
  Usage: bytenode [option] [ FILE... | - ] [arguments]

  Options:
    -h, --help                        show help information.
    -v, --version                     show bytenode version.

    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files
        --no-module                   compile without producing commonjs module

  Examples:

  $ bytenode -c script.js             compile \`script.js\` to \`script.jsc\`.
  $ bytenode -c server.js app.js
  $ bytenode -c src/*.js              compile all \`.js\` files in \`src/\` directory.

  $ bytenode script.jsc [arguments]   run \`script.jsc\` with arguments.
  $ bytenode                          open Node REPL with bytenode pre-loaded.

  $ echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
                                      compile from stdin and save to \`hello.jsc\`
`);
}

else if (program.flags.includes('--version') && program.flags.length === 1 && program.files.length === 0) {

  const package = require('./package.json');
  console.log(package.name, package.version);
}

else {

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
}