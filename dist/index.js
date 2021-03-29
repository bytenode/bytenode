"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loaderCode = exports.addLoaderFile = exports.runBytecodeFile = exports.compileFile = exports.runBytecode = exports.compileElectronCode = exports.compileCode = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const vm_1 = tslib_1.__importDefault(require("vm"));
const v8_1 = tslib_1.__importDefault(require("v8"));
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const module_1 = tslib_1.__importDefault(require("module"));
v8_1.default.setFlagsFromString('--no-lazy');
if (Number.parseInt(process.versions.node.split('.')[0], 10) >= 12) {
    v8_1.default.setFlagsFromString('--no-flush-bytecode');
}
const COMPILED_EXTNAME = '.jsc';
const compileCode = function (javascriptCode) {
    if (typeof javascriptCode !== 'string') {
        throw new Error(`javascriptCode must be string. ${typeof javascriptCode} was given.`);
    }
    const script = new vm_1.default.Script(javascriptCode, {
        produceCachedData: true
    });
    const bytecodeBuffer = (script.createCachedData && script.createCachedData.call)
        ? script.createCachedData()
        : script.cachedData;
    return bytecodeBuffer;
};
exports.compileCode = compileCode;
const compileElectronCode = function (javascriptCode) {
    return new Promise((resolve, reject) => {
        let data = Buffer.from([]);
        const electronPath = path_1.default.join('node_modules', 'electron', 'cli.js');
        if (!fs_1.default.existsSync(electronPath)) {
            throw new Error('Electron not installed');
        }
        const bytenodePath = path_1.default.join(__dirname, 'cli.js');
        const proc = child_process_1.fork(electronPath, [bytenodePath, '--compile', '--no-module', '-'], {
            env: { ELECTRON_RUN_AS_NODE: '1' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
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
        proc.addListener('message', (message) => console.log(message));
        proc.addListener('error', err => console.error(err));
        proc.on('error', (err) => reject(err));
        proc.on('exit', () => { resolve(data); });
    });
};
exports.compileElectronCode = compileElectronCode;
const fixBytecode = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    const dummyBytecode = exports.compileCode('"ಠ_ಠ"');
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
const readSourceHash = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    if (process.version.startsWith('v8.8') || process.version.startsWith('v8.9')) {
        return bytecodeBuffer.slice(12, 16).reduce((sum, number, power) => sum += number * Math.pow(256, power), 0);
    }
    else {
        return bytecodeBuffer.slice(8, 12).reduce((sum, number, power) => sum += number * Math.pow(256, power), 0);
    }
};
const runBytecode = function (bytecodeBuffer) {
    if (!Buffer.isBuffer(bytecodeBuffer)) {
        throw new Error('bytecodeBuffer must be a buffer object.');
    }
    fixBytecode(bytecodeBuffer);
    const length = readSourceHash(bytecodeBuffer);
    let dummyCode = '';
    if (length > 1) {
        dummyCode = '"' + '\u200b'.repeat(length - 2) + '"';
    }
    const script = new vm_1.default.Script(dummyCode, {
        cachedData: bytecodeBuffer
    });
    if (script.cachedDataRejected) {
        throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
    }
    return script.runInThisContext();
};
exports.runBytecode = runBytecode;
const compileFile = async function (args, output) {
    let filename, compileAsModule, electron, createLoader, loaderFilename;
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
        throw new Error(`filename must be a string. ${typeof filename} was given.`);
    }
    const compiledFilename = args.output || output || filename.slice(0, -3) + COMPILED_EXTNAME;
    if (typeof compiledFilename !== 'string') {
        throw new Error(`output must be a string. ${typeof compiledFilename} was given.`);
    }
    const javascriptCode = fs_1.default.readFileSync(filename, 'utf-8');
    let code;
    if (compileAsModule) {
        code = module_1.default.wrap(javascriptCode.replace(/^#!.*/, ''));
    }
    else {
        code = javascriptCode.replace(/^#!.*/, '');
    }
    let bytecodeBuffer;
    if (electron) {
        bytecodeBuffer = await exports.compileElectronCode(code);
    }
    else {
        bytecodeBuffer = exports.compileCode(code);
    }
    fs_1.default.writeFileSync(compiledFilename, bytecodeBuffer);
    if (createLoader) {
        addLoaderFile(compiledFilename, loaderFilename);
    }
    return compiledFilename;
};
exports.compileFile = compileFile;
const runBytecodeFile = function (filename) {
    if (typeof filename !== 'string') {
        throw new Error(`filename must be a string. ${typeof filename} was given.`);
    }
    const bytecodeBuffer = fs_1.default.readFileSync(filename);
    return exports.runBytecode(bytecodeBuffer);
};
exports.runBytecodeFile = runBytecodeFile;
module_1.default._extensions[COMPILED_EXTNAME] = function (module, filename) {
    const bytecodeBuffer = fs_1.default.readFileSync(filename);
    fixBytecode(bytecodeBuffer);
    const length = readSourceHash(bytecodeBuffer);
    let dummyCode = '';
    if (length > 1) {
        dummyCode = '"' + '\u200b'.repeat(length - 2) + '"';
    }
    const script = new vm_1.default.Script(dummyCode, {
        filename: filename,
        lineOffset: 0,
        displayErrors: true,
        cachedData: bytecodeBuffer
    });
    if (script.cachedDataRejected) {
        throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
    }
    function require(id) {
        return module.require(id);
    }
    require.resolve = function (request, options) {
        return module_1.default._resolveFilename(request, module, false, options);
    };
    if (process.mainModule) {
        require.main = process.mainModule;
    }
    require.extensions = module_1.default._extensions;
    require.cache = module_1.default._cache;
    const compiledWrapper = script.runInThisContext({
        filename: filename,
        lineOffset: 0,
        columnOffset: 0,
        displayErrors: true
    });
    const dirname = path_1.default.dirname(filename);
    const args = [module.exports, require, module, filename, dirname, process, global];
    return compiledWrapper.apply(module.exports, args);
};
function addLoaderFile(fileToLoad, loaderFilename) {
    let loaderFilePath;
    if (typeof loaderFilename === 'boolean' || loaderFilename === undefined || loaderFilename === '') {
        loaderFilePath = fileToLoad.replace('.jsc', '.loader.js');
    }
    else {
        loaderFilename = loaderFilename.replace('%', path_1.default.parse(fileToLoad).name);
        loaderFilePath = path_1.default.join(path_1.default.dirname(fileToLoad), loaderFilename);
    }
    const relativePath = path_1.default.relative(path_1.default.dirname(loaderFilePath), fileToLoad);
    const code = loaderCode(relativePath);
    fs_1.default.writeFileSync(loaderFilePath, code);
}
exports.addLoaderFile = addLoaderFile;
function loaderCode(relativePath) {
    return `
    const bytenode = require('bytenode');
    require('./${relativePath}');
  `;
}
exports.loaderCode = loaderCode;
;
global.bytenode = {
    compileCode: exports.compileCode,
    compileFile: exports.compileFile,
    compileElectronCode: exports.compileElectronCode,
    runBytecode: exports.runBytecode,
    runBytecodeFile: exports.runBytecodeFile,
    addLoaderFile,
    loaderCode
};
//# sourceMappingURL=index.js.map