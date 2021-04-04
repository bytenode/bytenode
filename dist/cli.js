#!/usr/bin/env node
"use strict";
<<<<<<< HEAD
<<<<<<< HEAD
=======
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
>>>>>>> 8baacf8 (Renaming “build” dir to “dist”)
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const module_1 = require("module");
const child_process_1 = require("child_process");
const bytenode = __importStar(require("./index"));
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
    program.files.forEach(async function (filename) {
        filename = path_1.default.resolve(filename);
        if (fs_1.default.existsSync(filename) && fs_1.default.statSync(filename).isFile()) {
            const compileAsModule = !program.flags.includes('--no-module');
            const electron = program.flags.includes('--electron');
            try {
                await bytenode.compileFile({ filename, compileAsModule, electron, createLoader, loaderFilename });
            }
            catch (error) {
                console.error(error);
            }
        }
        else {
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
                    process.stdout.write(bytenode.compileCode(script));
                }
                else {
                    process.stdout.write(bytenode.compileCode(module_1.wrap(script)));
                }
            }
            catch (error) {
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
    -n, --no-module                   compile without producing commonjs module
    -e, --electron                    compile for Electron

    -l, --loader [ FILE | PATTERN ]   create a loader file and optionally define
                                      loader filename or pattern using % as filename replacer
                                      defaults to %.loader.js

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
    const pkg = require('./package.json');
    console.log(pkg.name, pkg.version);
}
else {
    try {
        child_process_1.spawnSync(program.nodeBin, [
            '-r',
            path_1.default.resolve(__dirname, 'index.js')
        ].concat(args), {
            stdio: 'inherit'
        });
    }
    catch (error) {
        console.error(error);
    }
}
//# sourceMappingURL=cli.js.map