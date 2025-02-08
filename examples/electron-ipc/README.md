# Introduction

This example is Electron's [Inter-Process Communication (IPC)](https://www.electronjs.org/docs/latest/tutorial/ipc)
in action. It uses a preload script to expose the APIs to de renderer, from the renderer we call the API
by using the `window` object (e.g `window.encodeMessage`). In the main process we handle the call and return.

Using IPC with preload, all the node code stay in the main process (which will be compiled), and renderer will have only front-end code.
Also it is not necessary to use nodeIntegration, or any other insecure flag.

Preload script is not compiled since it's only a bridge between renderer and main process.

## How to run this example?

```bash
npm install
npm run dev # this will run `main.js` (src script)
npm start # this will compile `main.js` to `main.jsc` and run the compiled script
```
