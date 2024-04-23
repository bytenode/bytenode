'use strict';

const bytenode = require('../../');
const fs = require('fs');
const v8 = require('v8');

v8.setFlagsFromString('--no-lazy');

if (!fs.existsSync('./main-window.jsc')) {
  bytenode.compileFile({
    filename: './main-window.src.js',
    output: ''./main-window.jsc',
    electron: true,
  });
}

require('./main-window.jsc');
