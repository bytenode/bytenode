const ByteNode = require('../../index');

ByteNode.init({
  extName: '.robot'
});

const talk = require('./talk.robot');

(async () => {
  await talk();
})();
