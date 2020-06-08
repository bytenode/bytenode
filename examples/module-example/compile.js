const path = require('path');
const ByteNode = require('../../index');

ByteNode.init({
  extName: '.robot'
});

ByteNode.compileFile(path.resolve(__dirname, './talk.js'));
