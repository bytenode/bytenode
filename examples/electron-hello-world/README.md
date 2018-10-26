# Introduction

This example is very simple. Inside `main.js`, we require `bytenode` module and ask it to compile `main-window.src.js` to `main-window.jsc` if it wasn't compiled already.

Then we require `./main-window.jsc` module, and use its `getHTML()` function to update our page html.

Inside `createWindow()` function of `main-window.src.js` file, we check if `Date.now()` is less than some value and act accordingly.

Using a similar logic, you can have some sort of "Trial Version" of your application. Change the timestap to another future value and see the difference (remove `*.jsc` to re-compile).

Just don't forget to remove all `*.src.js` files before distribution. This step needs to be automated somehow.

## How to run this example?
```console
npm install
npm start
```