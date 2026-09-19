"use strict";

const bytenode = require("../../"); // require('bytenode');
const v8 = require("v8");

v8.setFlagsFromString("--no-lazy");

bytenode.compileFile({
  filename: "./main.js",
  electron: true,
  electronPath: require("electron"),
});
