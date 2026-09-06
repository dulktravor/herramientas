// fonteditor-core's browser bundle and WOFF2 loader reference window even in a
// Worker. Provide the worker global before evaluating the engine dependencies.
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  configurable: true,
});
