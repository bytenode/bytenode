'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('mocha');
const bytenode = require('../lib');
const { createTempDirectory, removeDirectory, runNode } = require('./helpers');

const cli = path.resolve(__dirname, '../lib/cli.js');

describe('Bytenode CLI', function () {
  let directory;

  before(() => { directory = createTempDirectory('bytenode-cli-'); });
  after(() => { removeDirectory(directory); });

  it('prints help and version', () => {
    const help = runNode(cli, ['--help']);
    const version = runNode(cli, ['--version']);

    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage: bytenode/);
    assert.equal(version.status, 0, version.stderr);
    assert.match(version.stdout, /bytenode 2\.0\.0/);
    const nodeVersion = process.versions.node.split('.').join('\\.');
    assert.match(version.stdout, new RegExp(`Node ${nodeVersion}\n`));
  });

  it('compiles an input file and reports missing files and syntax errors', () => {
    const source = path.join(directory, 'input.js');
    fs.writeFileSync(source, 'module.exports = 42;\n');

    const success = runNode(cli, ['--compile', source]);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(require(path.join(directory, 'input.jsc')), 42);

    const missing = runNode(cli, ['--compile', path.join(directory, 'missing.js')]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Cannot find file/);

    const invalid = path.join(directory, 'invalid.js');
    fs.writeFileSync(invalid, 'const = ;\n');
    const failure = runNode(cli, ['-c', invalid]);
    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /SyntaxError/);

    const withLoader = runNode(cli, ['--compile', source, '--loader']);
    assert.equal(withLoader.status, 0, withLoader.stderr);
    assert.ok(fs.existsSync(path.join(directory, 'input.loader.js')));
  });

  it('writes a source map when requested', () => {
    const source = path.join(directory, 'mapped.js');
    fs.writeFileSync(source, 'module.exports = 42;\n');

    const result = runNode(cli, ['--compile', '--source-map', source]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(directory, 'mapped.jsc.map')));

    const stdin = runNode(cli, ['--compile', '--source-map', '-'], { input: '40 + 2;' });
    assert.equal(stdin.status, 1);
    assert.match(stdin.stderr, /requires one or more input files/);
  });

  it('compiles stdin into a runnable plain-script cache', () => {
    const result = runNode(cli, ['--compile', '--no-module', '-'], { input: '40 + 2;', encoding: null });

    assert.equal(result.status, 0, result.stderr && result.stderr.toString());
    assert.ok(Buffer.isBuffer(result.stdout));
    assert.equal(bytenode.runBytecode(result.stdout), 42);
  });
});
