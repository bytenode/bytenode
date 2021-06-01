/// <reference types="node" />

export function compile({ code, filename, compileAsModule, output }: {
  code: string;
  filename: string;
  compileAsModule?: boolean;
  output?: string;
}): string | Buffer;

export function run({ bytecode, filename }: {
  bytecode: Buffer;
  filename: string;
}): any;

export function registerExtension(ext: string): void;
