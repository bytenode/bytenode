'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('mocha');
const bytenode = require('../lib');
const packageJson = require('../package.json');
const { createTempDirectory, removeDirectory } = require('./helpers');

describe('Bytenode public API', function () {
  let directory;

  before(() => { directory = createTempDirectory('bytenode-api-'); });
  after(() => { removeDirectory(directory); });

  it('keeps production built-in imports compatible with Node 14.0', () => {
    const libDirectory = path.join(__dirname, '../lib');
    const productionFiles = fs.readdirSync(libDirectory)
      .filter(filename => filename.endsWith('.js'));

    for (const filename of productionFiles) {
      const source = fs.readFileSync(path.join(libDirectory, filename), 'utf8');
      assert.doesNotMatch(source, /node:/,
        `${filename} must use legacy-compatible built-in specifiers`);
    }
    const assertModule = require('assert');
    assert.strictEqual(assertModule.strict.equal, assertModule.strict.strictEqual);
  });

  it('exposes the established API and global alias', () => {
    for (const name of [
      'compileCode', 'compileFile', 'compileElectronCode', 'compileElectronMainCode',
      'compileElectronRendererCode', 'runBytecode', 'runBytecodeFile', 'addLoaderFile',
      'loaderCode', 'loaderCodeCommonJS', 'loaderCodeModule'
    ]) {
      assert.equal(typeof bytenode[name], 'function', `${name} should be exported`);
    }
    assert.strictEqual(global.bytenode, bytenode);
    assert.deepEqual(packageJson.dependencies || {}, {},
      'the runtime package must not gain production dependencies');
    assert.ok(require.extensions['.jsc'], '.jsc should be registered on import');
  });

  it('compiles and runs plain JavaScript, including compressed cached data', () => {
    const bytecode = bytenode.compileCode('40 + 2;');
    const compressed = bytenode.compileCode('40 + 2;', true);

    assert.ok(Buffer.isBuffer(bytecode));
    assert.ok(bytecode.length > 24);
    assert.equal(bytenode.runBytecode(bytecode), 42);
    assert.equal(bytenode.runBytecode(compressed), 42);
  });

  it('rejects invalid source and invalid bytecode with useful errors', () => {
    assert.throws(() => bytenode.compileCode(42), /must be string/);
    assert.throws(() => bytenode.compileCode('const ='), SyntaxError);
    assert.throws(() => bytenode.runBytecode('not a buffer'), /buffer/);
    assert.throws(() => bytenode.runBytecode(Buffer.from('not cached data')));
    assert.throws(() => bytenode.runBytecodeFile(path.join(directory, 'missing.jsc')), /ENOENT/);
  });

  it('compiles a CommonJS file and loads its exports through require()', async () => {
    const source = path.join(directory, 'module.js');
    fs.writeFileSync(source, 'module.exports = { answer: 42 };\n');

    const output = await bytenode.compileFile({ filename: source });

    assert.equal(output, path.join(directory, 'module.jsc'));
    assert.deepEqual(require(output), { answer: 42 });
    assert.equal(typeof bytenode.runBytecodeFile(output), 'function',
      'runBytecodeFile returns the CommonJS wrapper for module bytecode');
  });

  it('supports compressed files, plain scripts, and the deprecated output argument', async () => {
    const source = path.join(directory, 'plain.js');
    const compressedOutput = path.join(directory, 'compressed.jsc');
    const legacySource = path.join(directory, 'legacy.js');
    const plainOutput = path.join(directory, 'legacy-output.jsc');
    fs.writeFileSync(source, '20 + 22;\n');
    fs.writeFileSync(legacySource, 'module.exports = 42;\n');

    const compiled = await bytenode.compileFile({
      filename: source,
      output: compressedOutput,
      compileAsModule: false,
      compress: true
    });
    const deprecated = await bytenode.compileFile(legacySource, plainOutput);

    assert.equal(compiled, compressedOutput);
    assert.equal(deprecated, plainOutput);
    assert.equal(bytenode.runBytecodeFile(compressedOutput), 42);
    assert.equal(require(plainOutput), 42);
  });

  it('writes an external source map and maps thrown errors back to source lines', async () => {
    const source = path.join(directory, 'mapped-source.js');
    const output = path.join(directory, 'mapped-output.jsc');
    fs.writeFileSync(source, [
      '#!/usr/bin/env node',
      'function fail() {',
      '  const detail = "debug me";',
      '  throw new Error(detail);',
      '}',
      'fail();',
      ''
    ].join('\n'));

    await bytenode.compileFile({ filename: source, output, sourceMap: true });

    const mapFilename = output + '.map';
    assert.ok(fs.existsSync(mapFilename));
    const map = JSON.parse(fs.readFileSync(mapFilename, 'utf8'));
    assert.equal(map.version, 3);
    assert.equal(map.file, path.basename(output));
    assert.deepEqual(map.sources, [path.basename(source)]);
    assert.equal(Object.prototype.hasOwnProperty.call(map, 'sourcesContent'), false,
      'the external map should not expose embedded source text');

    assert.throws(() => require(output), (error) => {
      assert.ok(error.stack.includes(`${source}:4:9`), error.stack);
      assert.match(error.stack, /at fail \(/);
      return true;
    });

    const plainOutput = path.join(directory, 'mapped-plain.jsc');
    await bytenode.compileFile({
      filename: source,
      output: plainOutput,
      compileAsModule: false,
      sourceMap: true
    });
    assert.throws(() => bytenode.runBytecodeFile(plainOutput), (error) => {
      assert.ok(error.stack.includes(`${source}:4:9`), error.stack);
      return true;
    });
  });

  it('writes a CommonJS loader beside the compiled file', async () => {
    const source = path.join(directory, 'loader-source.js');
    fs.writeFileSync(source, '#!/usr/bin/env node\nmodule.exports = 7;\n');

    await bytenode.compileFile({ filename: source, createLoader: true });

    const loader = fs.readFileSync(path.join(directory, 'loader-source.loader.js'), 'utf8');
    assert.ok(loader.startsWith('#!/usr/bin/env node\n'));
    assert.match(loader, /require\('bytenode'\)/);
    assert.match(loader, /require\('\.\/loader-source\.jsc'\)/);
    assert.equal(bytenode.loaderCode('./payload.jsc'),
      "require('bytenode')\n\nmodule.exports = require('./payload.jsc')");
    assert.equal(bytenode.loaderCodeCommonJS, bytenode.loaderCode);
    assert.match(bytenode.loaderCodeModule('./payload.jsc', '#!/usr/bin/env node'),
      /^#!\/usr\/bin\/env node\n/);
  });

  it('writes an ES module loader that re-exports the compiled module', async () => {
    const source = path.join(directory, 'esm-source.js');
    fs.writeFileSync(source, 'module.exports = { answer: 42 };\n');

    await bytenode.compileFile({ filename: source, createLoader: 'module' });

    const loader = fs.readFileSync(path.join(directory, 'esm-source.loader.js'), 'utf8');
    assert.match(loader, /require\('\.\/esm-source\.jsc'\)/);
    assert.match(loader, /export \{ answer \}/);
  });

  it('validates compileFile arguments before reading input', async () => {
    await assert.rejects(bytenode.compileFile(), /filename must be a string/);
    await assert.rejects(
      bytenode.compileFile({ filename: path.join(directory, 'missing.js') }),
      /ENOENT/
    );
    await assert.rejects(
      bytenode.compileFile({ filename: path.join(directory, 'missing.js'), output: 1 }),
      /output must be a string/
    );
    const source = path.join(directory, 'valid.js');
    fs.writeFileSync(source, 'module.exports = 42;');
    await assert.rejects(
      bytenode.compileFile({ filename: source, electronMain: true, electronRenderer: true }),
      /mutually exclusive/
    );
  });
});
