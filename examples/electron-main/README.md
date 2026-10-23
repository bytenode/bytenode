# Electron main process

This example compiles the main-process module inside Electron, generates a
CommonJS loader, and starts Electron from that loader. This keeps the cached
code aligned with the Electron main-process V8 runtime.

From this directory, run:

```console
npm install
npm run build
npm start
```

On Linux without a display, run the build under Xvfb, for example
`xvfb-run -a npm run build`. The bytecode is tied to the installed Electron
version and platform; rebuild it when either changes.
