'use strict';

const fs = require('node:fs');
const path = require('node:path');
const bytenode = require('bytenode');

async function build () {
  const outputDirectory = path.join(__dirname, 'dist');
  fs.mkdirSync(outputDirectory, { recursive: true });

  await bytenode.compileFile({
    filename: path.join(__dirname, 'src', 'main.js'),
    output: path.join(outputDirectory, 'main.jsc'),
    electronMain: true,
    createLoader: true
  });
  console.log('Compiled dist/main.jsc for this Electron main-process runtime');
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
