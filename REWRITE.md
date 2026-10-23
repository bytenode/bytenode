# Rewrite compatibility contract

This branch tracks the rewrite against the current `master` API. The `v2.x`
branch is a reference for simplifying the implementation; it is not a drop-in
replacement because its API omits several current features.

## Constraints

- Keep production dependencies at zero.
- Preserve the current `require('bytenode')` exports and CommonJS entry point.
- Keep the `.jsc` extension registered on load.
- Preserve existing bytecode loading behavior and report incompatible cached
data as a JavaScript error where V8 permits it.

## Public API to preserve

- `compileCode(source, compress?)`
- `compileFile(options | filename, deprecatedOutput?)`
- `compileElectronCode(source, options?)`
- `compileElectronMainCode(source, options?)`
- `compileElectronRendererCode(source, options?)`
- `runBytecode(buffer)` and `runBytecodeFile(filename)`
- `addLoaderFile(...)`, `loaderCode`, `loaderCodeCommonJS`, and
  `loaderCodeModule`
- `global.bytenode` compatibility

## Compatibility checks

- CommonJS module and plain-script compilation
- Compressed and uncompressed cached data
- Existing compile-file options, including Electron contexts and loaders
- `require()` loading for `.jsc` and custom registered extensions
- Existing loader output and TypeScript declarations

## Rewrite approach

Keep the public entry point as a compatibility facade. Put bytecode format and
runtime loading behind small internal modules, then move compilation, Electron
process management, file handling, and loader generation behind those modules.
The facade should keep current call signatures while internals are replaced.

## Current progress

- Added `lib/compiler.js` for V8 cached-data compilation.
- Added `lib/cache-format.js` for header validation, source-hash reading, and
  version-specific runtime header repair.
- Added `lib/bytecode-runtime.js` for decompression, dummy source generation,
  and execution.
- Added `lib/module-loader.js` for CommonJS `.jsc` registration.
- Added `lib/loaders.js` for CommonJS and ES module loader generation.
- Added `lib/electron-compiler.js` for the Electron Node, main, and renderer
  compilation paths.
- Added `lib/file-compiler.js` for file-to-bytecode option handling and output.
- Reorganized `lib/cli.js` into argument parsing, compile, help/version, and run
  flows while retaining existing aliases and built-in-only dependencies.
- Replaced the old Express, NW.js, and Electron samples with Node.js and Electron
  main-process examples.
- Replaced the monolithic weak-assertion suite with focused API, CLI, and Electron
  integration suites. Added a test that guards the zero-production-dependency
  constraint.
- Kept `lib/index.js` as the compatibility facade and retained the existing
  production dependency list.

This is the first implementation pass. Run the existing suite and Electron scenarios after implementation is complete.
- Updated `lib/index.d.ts` so the declared API includes the existing loader
  exports and marks the `compileCode` compression argument optional, matching
  runtime behavior.
