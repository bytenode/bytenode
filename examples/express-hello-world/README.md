## How to run this example?
```console
npm install
node server.js
```
Make sure that the server is working. Now close it `ctrl+c`.

Compile and run the compiled file:
```console
bytenode --compile server.js

bytenode --run server.jsc
```
Your server should start as before.

Additionally, you can bundle your whole express project using browserify, then compile the bundle file.
```console
npm install -g browserify
browserify --node server.js > bundle.js
bytenode --compile bundle.js
```
Now you have `bundle.jsc` file that can be run without `node_modules`.
```console
bytenode --run bundle.jsc
```