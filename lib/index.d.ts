/// <reference types="node" />

export function compile({ code, filename, compileAsModule, createLoader, loaderPattern, output }: {
  code: string;
  filename: string;
  compileAsModule?: boolean = true;
  createLoader?: boolean = false;
  loaderPattern?: string = '%.loader.js';
  output?: string;
}): string | Buffer;

export function run({ bytecode, filename }: {
  bytecode: Buffer;
  filename: string;
}): any;

export function registerExtension(ext: string): void;
