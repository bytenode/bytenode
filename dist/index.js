"use strict";
<<<<<<< HEAD
Object.defineProperty(exports, "__esModule", { value: true });
exports.loaderCode = exports.addLoaderFile = exports.runBytecodeFile = exports.compileFile = exports.runBytecode = exports.compileElectronCode = exports.compileCode = void 0;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> f169a74 (Fixing optional chaining for Node 10)
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const vm_1 = tslib_1.__importDefault(require("vm"));
const v8_1 = tslib_1.__importDefault(require("v8"));
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const module_1 = tslib_1.__importDefault(require("module"));
<<<<<<< HEAD
=======
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loaderCode = exports.addLoaderFile = exports.runBytecodeFile = exports.compileFile = exports.runBytecode = exports.compileElectronCode = exports.compileCode = void 0;
const fs_1 = __importDefault(require("fs"));
const vm_1 = __importDefault(require("vm"));
const v8_1 = __importDefault(require("v8"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const module_1 = __importDefault(require("module"));
>>>>>>> c8aefc4 (Renaming “build” dir to “dist”)
=======
var tslib_1 = require("tslib");
var fs_1 = tslib_1.__importDefault(require("fs"));
var vm_1 = tslib_1.__importDefault(require("vm"));
var v8_1 = tslib_1.__importDefault(require("v8"));
var path_1 = tslib_1.__importDefault(require("path"));
var child_process_1 = require("child_process");
var module_1 = tslib_1.__importDefault(require("module"));
>>>>>>> 4b04431 (Incorporating recent pulls)
=======
>>>>>>> f169a74 (Fixing optional chaining for Node 10)
v8_1.default.setFlagsFromString('--no-lazy');
if (Number.parseInt(process.versions.node.split('.')[0], 10) >= 12) {
    v8_1.default.setFlagsFromString('--no-flush-bytecode');
}
var COMPILED_EXTNAME = '.jsc';
var compileCode = function (javascriptCode) {
    if (typeof javascriptCode !== 'string') {
        throw new Error("javascriptCode must be string. " + typeof javascriptCode + " was given.");
    }
    var script = new vm_1.default.Script(javascriptCode, {
        produceCachedData: true
    });
    var bytecodeBuffer = (script.createCachedData && script.createCachedData.call)
        ? script.createCachedData()
        : script.cachedData;
    return bytecodeBuffer;
};
exports.compileCode = compileCode;
<<<<<<< HEAD
<<<<<<< HEAD
const compileElectronCode = function (javascriptCode) {
    return new Promise((resolve, reject) => {
<<<<<<< HEAD
=======
        var _a, _b, _c, _d, _e, _f, _g;
>>>>>>> c8aefc4 (Renaming “build” dir to “dist”)
        let data = Buffer.from([]);
        const electronPath = path_1.default.join('node_modules', 'electron', 'cli.js');
=======
var compileElectronCode = function (javascriptCode) {
    return new Promise(function (resolve, reject) {
        var data = Buffer.from([]);
        var electronPath = path_1.default.join('node_modules', 'electron', 'cli.js');
>>>>>>> 4b04431 (Incorporating recent pulls)
=======
const compileElectronCode = function (javascriptCode) {
    return new Promise((resolve, reject) => {
        let data = Buffer.from([]);
        const electronPath = path_1.default.join('node_modules', 'electron', 'cli.js');
>>>>>>> f169a74 (Fixing optional chaining for Node 10)
        if (!fs_1.default.existsSync(electronPath)) {
            throw new Error('Electron not installed');
        }
        var bytenodePath = path_1.default.join(__dirname, 'cli.js');
        var proc = child_process_1.fork(electronPath, [bytenodePath, '--compile', '--no-module', '-'], {
            env: { ELECTRON_RUN_AS_NODE: '1' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
<<<<<<< HEAD
        if (proc.stdin) {
            proc.stdin.write(javascriptCode);
            proc.stdin.end();
        }
        if (proc.stdout) {
            proc.stdout.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });
            proc.stdout.on('error', (err) => {
                console.error(err);
            });
            proc.stdout.on('end', () => {
                resolve(data);
            });
        }
        if (proc.stderr) {
            proc.stderr.on('data', (chunk) => {
                console.error('Error: ', chunk);
            });
            proc.stderr.on('error', (err) => {
                console.error('Error: ', err);
            });
        }
<<<<<<< HEAD
<<<<<<< HEAD
=======
        (_a = proc.stdin) === null || _a === void 0 ? void 0 : _a.write(javascriptCode);
        (_b = proc.stdin) === null || _b === void 0 ? void 0 : _b.end();
        (_c = proc.stdout) === null || _c === void 0 ? void 0 : _c.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
        });
        (_d = proc.stdout) === null || _d === void 0 ? void 0 : _d.on('error', (err) => {
            console.error(err);
        });
        (_e = proc.stdout) === null || _e === void 0 ? void 0 : _e.on('end', () => {
            resolve(data);
        });
        (_f = proc.stderr) === null || _f === void 0 ? void 0 : _f.on('data', (chunk) => {
            console.error('Error: ', chunk);
        });
        (_g = proc.stderr) === null || _g === void 0 ? void 0 : _g.on('error', (err) => {
            console.error('Error: ', err);
        });
>>>>>>> c8aefc4 (Renaming “build” dir to “dist”)
=======
>>>>>>> f169a74 (Fixing optional chaining for Node 10)
        proc.addListener('message', (message) => console.log(message));
        proc.addListener('error', err => console.error(err));
        proc.on('error', (err) => reject(err));
        proc.on('exit', () => { resolve(data); });
<<<<<<< HEAD
=======
        proc.addListener('message', function (message) { return console.log(message); });
        proc.addListener('error', function (err) { return console.error(err); });
        proc.on('error', function (err) { return reject(err); });
        proc.on('exit', function () { resolve(data); });
>>>>>>> 4b04431 (Incorporating recent pulls)
=======
>>>>>>> f169a74 (Fixing optional chaining for Node 10)
    });
};
exports.compileElectronCode = compileElectronCode;
var fixBytecode = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    var dummyBytecode = exports.compileCode('"ಠ_ಠ"');
    if (process.version.startsWith('v8.8') || process.version.startsWith('v8.9')) {
        dummyBytecode.slice(16, 20).copy(bytecodeBuffer, 16);
        dummyBytecode.slice(20, 24).copy(bytecodeBuffer, 20);
    }
    else if (process.version.startsWith('v12') ||
        process.version.startsWith('v13') ||
        process.version.startsWith('v14') ||
        process.version.startsWith('v15')) {
        dummyBytecode.slice(12, 16).copy(bytecodeBuffer, 12);
    }
    else {
        dummyBytecode.slice(12, 16).copy(bytecodeBuffer, 12);
        dummyBytecode.slice(16, 20).copy(bytecodeBuffer, 16);
    }
};
var readSourceHash = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    if (process.version.startsWith('v8.8') || process.version.startsWith('v8.9')) {
        return bytecodeBuffer.slice(12, 16).reduce(function (sum, number, power) { return sum += number * Math.pow(256, power); }, 0);
    }
    else {
        return bytecodeBuffer.slice(8, 12).reduce(function (sum, number, power) { return sum += number * Math.pow(256, power); }, 0);
    }
};
var runBytecode = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    fixBytecode(bytecodeBuffer);
    var length = readSourceHash(bytecodeBuffer);
    var dummyCode = '';
    if (length > 1) {
        dummyCode = '"' + '\u200b'.repeat(length - 2) + '"';
    }
    var script = new vm_1.default.Script(dummyCode, {
        cachedData: bytecodeBuffer
    });
    if (script.cachedDataRejected) {
        throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
    }
    return script.runInThisContext();
};
exports.runBytecode = runBytecode;
var compileFile = function (args, output) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var filename, compileAsModule, electron, createLoader, loaderFilename, compiledFilename, javascriptCode, code, bytecodeBuffer;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (typeof args === 'string') {
                        filename = args;
                        compileAsModule = true;
                        electron = false;
                        createLoader = false;
                    }
                    else if (typeof args === 'object') {
                        filename = args.filename;
                        compileAsModule = args.compileAsModule !== false;
                        electron = args.electron;
                        createLoader = true;
                        loaderFilename = args.loaderFilename;
                        if (loaderFilename)
                            createLoader = true;
                    }
                    if (typeof filename !== 'string') {
                        throw new Error("filename must be a string. " + typeof filename + " was given.");
                    }
                    compiledFilename = args.output || output || filename.slice(0, -3) + COMPILED_EXTNAME;
                    if (typeof compiledFilename !== 'string') {
                        throw new Error("output must be a string. " + typeof compiledFilename + " was given.");
                    }
                    javascriptCode = fs_1.default.readFileSync(filename, 'utf-8');
                    if (compileAsModule) {
                        code = module_1.default.wrap(javascriptCode.replace(/^#!.*/, ''));
                    }
                    else {
                        code = javascriptCode.replace(/^#!.*/, '');
                    }
                    if (!electron) return [3, 2];
                    return [4, exports.compileElectronCode(code)];
                case 1:
                    bytecodeBuffer = _a.sent();
                    return [3, 3];
                case 2:
                    bytecodeBuffer = exports.compileCode(code);
                    _a.label = 3;
                case 3:
                    fs_1.default.writeFileSync(compiledFilename, bytecodeBuffer);
                    if (createLoader) {
                        addLoaderFile(compiledFilename, loaderFilename);
                    }
                    return [2, compiledFilename];
            }
        });
    });
};
exports.compileFile = compileFile;
var runBytecodeFile = function (filename) {
    if (typeof filename !== 'string') {
        throw new Error("filename must be a string. " + typeof filename + " was given.");
    }
    var bytecodeBuffer = fs_1.default.readFileSync(filename);
    return exports.runBytecode(bytecodeBuffer);
};
exports.runBytecodeFile = runBytecodeFile;
module_1.default._extensions[COMPILED_EXTNAME] = function (fileModule, filename) {
    var bytecodeBuffer = fs_1.default.readFileSync(filename);
    fixBytecode(bytecodeBuffer);
    var length = readSourceHash(bytecodeBuffer);
    var dummyCode = '';
    if (length > 1) {
        dummyCode = '"' + '\u200b'.repeat(length - 2) + '"';
    }
    var script = new vm_1.default.Script(dummyCode, {
        filename: filename,
        lineOffset: 0,
        displayErrors: true,
        cachedData: bytecodeBuffer
    });
    if (script.cachedDataRejected) {
        throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
    }
    function require(id) {
        return fileModule.require(id);
    }
    require.resolve = function (request, options) {
        return module_1.default._resolveFilename(request, fileModule, false, options);
    };
    if (process.mainModule) {
        require.main = process.mainModule;
    }
    require.extensions = module_1.default._extensions;
    require.cache = module_1.default._cache;
    var compiledWrapper = script.runInThisContext({
        filename: filename,
        lineOffset: 0,
        columnOffset: 0,
        displayErrors: true
    });
    var dirname = path_1.default.dirname(filename);
    var args = [fileModule.exports, require, fileModule, filename, dirname, process, global];
    return compiledWrapper.apply(fileModule.exports, args);
};
function addLoaderFile(fileToLoad, loaderFilename) {
    var loaderFilePath;
    if (typeof loaderFilename === 'boolean' || loaderFilename === undefined || loaderFilename === '') {
        loaderFilePath = fileToLoad.replace('.jsc', '.loader.js');
    }
    else {
        loaderFilename = loaderFilename.replace('%', path_1.default.parse(fileToLoad).name);
        loaderFilePath = path_1.default.join(path_1.default.dirname(fileToLoad), loaderFilename);
    }
    var relativePath = path_1.default.relative(path_1.default.dirname(loaderFilePath), fileToLoad);
    var code = loaderCode('./' + relativePath);
    fs_1.default.writeFileSync(loaderFilePath, code);
}
exports.addLoaderFile = addLoaderFile;
function loaderCode(targetPath) {
    return "\n    require('bytenode');\n    require('" + targetPath + "');\n  ";
}
exports.loaderCode = loaderCode;
global.bytenode = {
    compileCode: exports.compileCode,
    compileFile: exports.compileFile,
    compileElectronCode: exports.compileElectronCode,
    runBytecode: exports.runBytecode,
    runBytecodeFile: exports.runBytecodeFile,
    addLoaderFile: addLoaderFile,
    loaderCode: loaderCode
};
//# sourceMappingURL=index.js.map