const sleep = time => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      return resolve();
    }, time * 1000);
  });
};

module.exports = async () => {
  let count = 3;
  while (count--) {
    await sleep(Math.random() * 5);
    console.log('I am robot!');
  }
};
