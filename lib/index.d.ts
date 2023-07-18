/// <reference types="node" />
export declare const compileCode: (javascriptCode: string, compress: boolean) => Buffer;

interface ElectronCompileOptions {
    electronPath?: string;
    compress?: boolean;
}

export declare const compileElectronCode: (javascriptCode: string, options?: ElectronCompileOptions) => Promise<Buffer>;

export declare const runBytecode: (bytecodeBuffer: Buffer) => any;

interface BytenodeOptions {
    filename: string;
    output?: string;
    compileAsModule?: boolean;
    compress?: boolean;
    electron?: boolean;
    electronPath?: string;
    createLoader?: boolean | string;
    loaderFilename?: string;
}

export declare const compileFile: (args: BytenodeOptions | string, output?: string | undefined) => Promise<string>;

export declare const runBytecodeFile: (filename: string) => any;

export declare function addLoaderFile(fileToLoad: string, loaderFilename?: string): void;

export declare function loaderCode(targetPath: string): string;

export { };
