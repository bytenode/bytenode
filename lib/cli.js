#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { wrap } = require('module');
const { spawnSync } = require('child_process');
const bytenode = require('./index.js');

const ALIASES = new Map([
  ['-c', '--compile'],
  ['-o', '--out'],
  ['-h', '--help'],
  ['-v', '--version'],
  ['-n', '--no-module'],
  ['-e', '--electron'],
  ['-ep', '--electron-path'],
  ['-l', '--loader'],
  ['-t', '--loader-type']
]);

function normalizeAliases (args) {
  return args.map(arg => ALIASES.get(arg) || arg);
}

function parseOptions (args) {
  const parsed = {
    args: args.slice(),
    electronPath: undefined,
    loaderFilename: undefined,
    createLoader: false
  };

  const electronPathIndex = parsed.args.indexOf('--electron-path');
  if (electronPathIndex !== -1) {
    const value = parsed.args[electronPathIndex + 1];
    if (!value || value.startsWith('-')) {
      throw new Error('Missing path to Electron executable.');
    }
    const resolved = path.resolve(value);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error(`Cannot find file '${resolved}'.`);
    }
    parsed.electronPath = resolved;
    parsed.args.splice(electronPathIndex, 2);
  }

  const loaderIndex = parsed.args.indexOf('--loader');
  if (loaderIndex !== -1) {
    parsed.createLoader = true;
    const next = parsed.args[loaderIndex + 1];
    if (next && !next.startsWith('-')) {
      parsed.loaderFilename = next;
      parsed.args.splice(loaderIndex + 1, 1);
    }
  }

  const loaderTypeIndex = parsed.args.indexOf('--loader-type');
  if (loaderTypeIndex !== -1) {
    const type = parsed.args[loaderTypeIndex + 1];
    if (type) {
      parsed.createLoader = type;
      parsed.args.splice(loaderTypeIndex + 1, 1);
    }
  }

  if (parsed.args.includes('--no-loader')) parsed.createLoader = false;

  parsed.flags = parsed.args.filter(arg => arg[0] === '-');
  parsed.files = parsed.args.filter(arg => arg[0] !== '-' && arg[1] !== '-');
  return parsed;
}

function readStdin () {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) input += chunk;
    });
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', reject);
  });
}

async function compileFiles (program) {
  const compress = program.flags.includes('--compress');
  const compileAsModule = !program.flags.includes('--no-module');
  const electron = program.flags.includes('--electron');
  const sourceMap = program.flags.includes('--source-map');

  for (const input of program.files) {
    const filename = path.resolve(input);
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      console.error(`Error: Cannot find file '${filename}'.`);
      process.exitCode = 1;
      continue;
    }

    try {
      await bytenode.compileFile({
        filename,
        compileAsModule,
        compress,
        electron,
        sourceMap,
        createLoader: program.createLoader,
        loaderFilename: program.loaderFilename,
        electronPath: program.electronPath
      });
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }

  if (program.files.length === 0) {
    if (sourceMap) {
      console.error('Error: --source-map requires one or more input files.');
      process.exitCode = 1;
      return;
    }
    try {
      const script = await readStdin();
      const code = program.flags.includes('--no-module') ? script : wrap(script);
      process.stdout.write(bytenode.compileCode(code, compress));
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

function printHelp () {
  console.log(`
  Usage: bytenode [option] [ FILE... | - ] [arguments]

  Options:
    -h, --help                        show help information.
    -v, --version                     show bytenode version.

    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files
    --compress                        compress bytecode
    --source-map                      write an external source map beside each .jsc file
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
}

function printVersion () {
  const pkg = require('../package.json');
  console.log(pkg.name, pkg.version);
  console.log('Node', process.versions.node);
  if (process.versions.electron) console.log('Electron', process.versions.electron);
}

async function main (rawArgs) {
  let program;
  try {
    program = parseOptions(normalizeAliases(rawArgs));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (program.flags.includes('--compile')) {
    await compileFiles(program);
  } else if (program.flags.includes('--help')) {
    printHelp();
  } else if (program.flags.includes('--version') && program.flags.length === 1 && program.files.length === 0) {
    printVersion();
  } else {
    const result = spawnSync(process.argv[0], [
      '-r',
      path.resolve(__dirname, 'index.js')
    ].concat(program.args), { stdio: 'inherit' });
    if (result.error) {
      console.error(result.error);
      process.exitCode = 1;
    } else if (result.status !== null) {
      process.exitCode = result.status;
    } else {
      process.exitCode = 1;
    }
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
