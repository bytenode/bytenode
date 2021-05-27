'use strict';

const assert = require('assert');
const path = require('path');

const tests = [];
const testFiles = process.argv.slice(2);

let passedCount = 0;
let failedCount = 0;

exports.it = function (description, fn) {
  assert(typeof description === 'string', 'description must be a string.');
  assert(typeof fn === 'function', 'fn must be a function.');
  tests.push({ description, fn });
};

exports.section = testSection => exports.it('', () => {
  console.log(`\n${testSection}`);
});

const runTests = function () {
  tests.forEach(test => {
    try {
      test.fn();
      if (test.description !== '') {
        console.log(`  ✓ ${test.description}`);
      }
      ++passedCount;
    } catch (error) {
      console.log(`  ✕ ${test.description}`);
      console.log(error);
      ++failedCount;
    }
  });

  if (failedCount !== 0) {
    console.log(`\n${failedCount} of ${passedCount + failedCount} tests failed.\n`);
    process.exit(1);
  } else {
    console.log(`\nAll ${passedCount} tests completed successfully.\n`);
  }
};

testFiles.map(file => path.resolve(file)).forEach(file => require(file));

runTests();
