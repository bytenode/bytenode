# Node.js module

This example compiles a CommonJS module to `.jsc`, writes a small loader, and
loads the compiled module with `require()`.

From this directory, run:

```console
npm install
npm run build
npm start
```

The final command prints `20 + 22 = 42`. Rebuild the `.jsc` file with the same
Node.js version used to run it because V8 cached data is runtime-version specific.
