#!/usr/bin/env node
"use strict";
<<<<<<< HEAD
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs_1 = tslib_1.__importDefault(require("fs"));
var path_1 = tslib_1.__importDefault(require("path"));
var module_1 = require("module");
var child_process_1 = require("child_process");
var bytenode = tslib_1.__importStar(require("./index"));
var args = process.argv.slice(2);
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
var loaderFilename;
var createLoader = false;
if (args.includes('--loader')) {
    createLoader = true;
    var nextIndex = args.indexOf('--loader') + 1;
    var nextItem = args[nextIndex];
    if (nextItem && nextItem[0] !== '-') {
        loaderFilename = nextItem;
        args.splice(nextIndex, 1);
    }
}
var program = {
    dirname: __dirname,
    filename: __filename,
    nodeBin: process.argv[0],
    flags: args.filter(function (arg) { return arg[0] === '-'; }),
    files: args.filter(function (arg) { return arg[0] !== '-' && arg[1] !== '-'; })
};
if (program.flags.includes('--compile')) {
    program.files.forEach(function (filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var compileAsModule, electron, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filename = path_1.default.resolve(filename);
                        if (!(fs_1.default.existsSync(filename) && fs_1.default.statSync(filename).isFile())) return [3, 5];
                        compileAsModule = !program.flags.includes('--no-module');
                        electron = program.flags.includes('--electron');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4, bytenode.compileFile({ filename: filename, compileAsModule: compileAsModule, electron: electron, createLoader: createLoader, loaderFilename: loaderFilename })];
                    case 2:
                        _a.sent();
                        return [3, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error(error_1);
                        return [3, 4];
                    case 4: return [3, 6];
                    case 5:
                        console.error("Error: Cannot find file '" + filename + "'.");
                        _a.label = 6;
                    case 6: return [2];
                }
            });
        });
    });
    if (program.files.length === 0) {
        var script_1 = '';
        process.stdin.setEncoding('utf-8');
        process.stdin.on('readable', function () {
            var data = process.stdin.read();
            if (data !== null) {
                script_1 += data;
            }
        });
        process.stdin.on('end', function () {
            try {
                if (program.flags.includes('--no-module')) {
                    process.stdout.write(bytenode.compileCode(script_1));
                }
                else {
                    process.stdout.write(bytenode.compileCode(module_1.wrap(script_1)));
                }
            }
            catch (error) {
                console.error(error);
            }
        });
    }
}
else if (program.flags.includes('--help')) {
    console.log("\n  Usage: bytenode [option] [ FILE... | - ] [arguments]\n\n  Options:\n    -h, --help                        show help information.\n    -v, --version                     show bytenode version.\n\n    -c, --compile [ FILE... | - ]     compile stdin, a file, or a list of files\n    -n, --no-module                   compile without producing commonjs module\n    -e, --electron                    compile for Electron\n\n    -l, --loader [ FILE | PATTERN ]   create a loader file and optionally define\n                                      loader filename or pattern using % as filename replacer\n                                      defaults to %.loader.js\n\n  Examples:\n\n  $ bytenode -c script.js             compile `script.js` to `script.jsc`.\n  $ bytenode -c server.js app.js\n  $ bytenode -c src/*.js              compile all `.js` files in `src/` directory.\n\n  $ bytenode script.jsc [arguments]   run `script.jsc` with arguments.\n  $ bytenode                          open Node REPL with bytenode pre-loaded.\n\n  $ echo 'console.log(\"Hello\");' | bytenode --compile - > hello.jsc\n                                      compile from stdin and save to `hello.jsc`\n");
}
else if (program.flags.includes('--version') && program.flags.length === 1 && program.files.length === 0) {
    var pkg = require('./package.json');
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