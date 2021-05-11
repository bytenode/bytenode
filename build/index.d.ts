/// <reference types="node" />
export declare const compileCode: (javascriptCode: string) => Buffer;
export declare const compileElectronCode: (javascriptCode: string) => Promise<Buffer>;
export declare const runBytecode: (bytecodeBuffer: Buffer) => any;
interface BytenodeOptions {
    filename: string;
    output?: string;
    compileAsModule?: boolean;
    electron?: boolean;
    createLoader?: boolean;
    loaderFilename?: string;
}
export declare const compileFile: (args: BytenodeOptions | string, output?: string | undefined) => Promise<string>;
export declare const runBytecodeFile: (filename: string) => any;
export declare function addLoaderFile(fileToLoad: string, loaderFilename?: string): void;
export declare function loaderCode(relativePath: string): string;
export {};
