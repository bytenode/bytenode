#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const wrap = require('module').wrap;
const spawnSync = require('child_process').spawnSync;
const bytenode = require('./index.js');

const args = process.argv.slice(2);

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

if (args.includes('-n')) {
  args[args.indexOf('-n')] = '--no-module';
}

if (args.includes('-e')) {
  args[args.indexOf('-e')] = '--electron';
}

if (args.includes('-ep')) {
  args[args.indexOf('-ep')] = '--electron-path';
}

let electronPath;

if (args.includes('--electron-path')) {
  const nextIndex = args.indexOf('--electron-path') + 1;
  const nextItem = args[nextIndex];
  if (nextItem && nextItem[0] !== '-') {
    const ep = path.resolve(nextItem);
    if (fs.existsSync(ep) && fs.statSync(ep).isFile()) {
      electronPath = ep;
      // remove the electron path from the args so it
      // isn't mistaken for a file to compile
      args.splice(args.indexOf('--electron-path'), 2);
    } else {
      console.error(`Error: Cannot find file '${ep}'.`);
      process.exit(1);
    }
  } else {
    console.error(`Error: Missing path to Electron executable.`);
    process.exit(1);
  }
}

if (args.includes('-l')) {
  args[args.indexOf('-l')] = '--loader';
}

let loaderFilename;
let createLoader = false;

if (args.includes('--loader')) {
  createLoader = true;
  const nextIndex = args.indexOf('--loader') + 1;
  const nextItem = args[nextIndex];
  if (nextItem && nextItem[0] !== '-') {
    loaderFilename = nextItem;
    // remove the loader filename from the args so it
    // isn't mistaken for a file to compile
    args.splice(nextIndex, 1);
  }
}

if (args.includes('--no-loader')) {
  createLoader = false;
}

if (args.includes('-t')) {
  args[args.indexOf('-t')] = '--loader-type';
}

if (args.includes('--loader-type')) {
  const nextIndex = args.indexOf('--loader-type') + 1;
  const nextItem = args[nextIndex];
  if (nextItem) {
    createLoader = nextItem;
    args.splice(nextIndex, 1);
  }
}

const program = {
  dirname: __dirname,
  filename: __filename,
  nodeBin: process.argv[0],
  flags: args.filter(arg => arg[0] === '-'),
  files: args.filter(arg => arg[0] !== '-' && arg[1] !== '-')
};

if (program.flags.includes('--compile')) {
  const compress = program.flags.includes('--compress');

  program.files.forEach(async function (filename) {
    filename = path.resolve(filename);

    if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
      const compileAsModule = !program.flags.includes('--no-module');
      const electron = program.flags.includes('--electron');

      try {
        await bytenode.compileFile({ filename, compileAsModule, compress, electron, createLoader, loaderFilename, electronPath });
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
      const data = process.stdin.read();
      if (data !== null) {
        script += data;
      }
    });

    process.stdin.on('end', () => {
      try {
        if (program.flags.includes('--no-module')) {
          process.stdout.write(bytenode.compileCode(script, compress));
        } else {
          process.stdout.write(bytenode.compileCode(wrap(script), compress));
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
} else if (program.flags.includes('--help')) {
  console.log(`
  Usage: bytenode [option] [ FILE... | - ] [arguments]

  Options:
    -h, --help                        show help information.
    -v, --version                     show bytenode version.

    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files
    --compress                        compress bytecode
    -n, --no-module                   compile without producing commonjs module
    -e, --electron                    compile for Electron
    -ep, --electron-path              path to Electron executable

    -l, --loader [ FILE | PATTERN ]   create a loader file and optionally define
                                      loader filename or pattern using % as
                                      filename replacer. Defaults to %.loader.js
    --no-loader                       do not create a loader file, conflicts
                                      with -l
    -t, --loader-type type            create a loader file of type commonjs or
                                      module. Defaults to CommonJS

  Examples:

  $ bytenode -c script.js             compile \`script.js\` to \`script.jsc\`.
  $ bytenode -c server.js app.js
  $ bytenode -c src/*.js              compile all \`.js\` files in \`src/\` directory.

  $ bytenode script.jsc [arguments]   run \`script.jsc\` with arguments.
  $ bytenode                          open Node REPL with bytenode pre-loaded.

  $ echo 'console.log("Hello");' | bytenode --compile - > hello.jsc
                                      compile from stdin and save to \`hello.jsc\`
`);
} else if (program.flags.includes('--version') && program.flags.length === 1 && program.files.length === 0) {
  const pkg = require('../package.json');
  console.log(pkg.name, pkg.version);
  console.log('Node', process.versions.node);
  if (process.versions.electron) {
    console.log('Electron', process.versions.electron);
  }
} else {
  try {
    const result = spawnSync(program.nodeBin, [
      '-r',
      path.resolve(__dirname, 'index.js')
    ].concat(args), {
      stdio: 'inherit'
    });
    process.exit(result.status);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
