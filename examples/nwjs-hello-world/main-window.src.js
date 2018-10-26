'use strict';

let okHTML = `
<h1>Hello World!</h1>
<p>Feel free to use this free trial.</p>
`;

let noHTML = `
<h1>Hello World!</h1>
<p>This app is expired.</p>
`;

exports.getHTML = function() {
  
  if (Date.now() > 1234567891000) {
    // expired
    return noHTML;
  } else {
    // free trial
    return okHTML;
  }
};