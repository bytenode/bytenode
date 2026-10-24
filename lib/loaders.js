'use strict';

const fs = require('fs');
const path = require('path');

function addLoaderFile (fileToLoad, loaderFilename, type, sheBang) {
  let loaderFilePath;
  if (typeof loaderFilename === 'boolean' || loaderFilename === undefined || loaderFilename === '') {
    loaderFilePath = fileToLoad.replace('.jsc', '.loader.js');
  } else {
    loaderFilename = loaderFilename.replace('%', path.parse(fileToLoad).name);
    loaderFilePath = path.join(path.dirname(fileToLoad), loaderFilename);
  }
  const makeLoader = type === 'module' ? loaderCodeModule : loaderCodeCommonJS;
  const relativePath = path.relative(path.dirname(loaderFilePath), fileToLoad);
  fs.writeFileSync(loaderFilePath, makeLoader('./' + relativePath, sheBang, path.resolve(fileToLoad)));
}

function loaderCodeCommonJS (targetPath, sheBang) {
  const lines = ["require('bytenode')", '', `module.exports = require('${targetPath}')`];
  if (sheBang) lines.unshift(sheBang, '');
  return lines.join('\n');
}

function loaderCodeModule (targetPath, sheBang, compiledFilePath) {
  const lines = [
    "import { createRequire } from 'module'", '', "import 'bytenode'", '', '',
    'const require = createRequire(import.meta.url)', ''
  ];

  if (sheBang) {
    lines.unshift(sheBang, '');
    lines.push(`require('${targetPath}')`);
  } else {
    // Avoid loading executable modules while inspecting their exports.
    let { default: defaultExport, ...namedExports } = require(compiledFilePath);
    defaultExport = defaultExport ? 'default: defaultExport' : '';
    namedExports = Object.keys(namedExports);
    const exports = [defaultExport, ...namedExports].filter(Boolean).join(', ');

    if (!exports) {
      lines.push(`require('${targetPath}')`);
    } else {
      lines.push(`const {${exports}} = require('${targetPath}')`, '', '');
      if (defaultExport) lines.push('export default defaultExport');
      if (namedExports.length) lines.push(`export { ${namedExports} }`);
    }
  }

  return lines.join('\n');
}

module.exports = { addLoaderFile, loaderCodeCommonJS, loaderCodeModule };
