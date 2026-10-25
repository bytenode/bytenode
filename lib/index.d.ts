/// <reference types="node" />
export declare const compileCode: (javascriptCode: string, compress?: boolean) => Buffer;

interface ElectronCompileOptions {
    electronPath?: string;
    compress?: boolean;
}

export declare const compileElectronCode: (javascriptCode: string, options?: ElectronCompileOptions) => Promise<Buffer>;

export declare const compileElectronMainCode: (javascriptCode: string, options?: ElectronCompileOptions) => Promise<Buffer>;

export declare const compileElectronRendererCode: (javascriptCode: string, options?: ElectronCompileOptions) => Promise<Buffer>;

export declare const runBytecode: (bytecodeBuffer: Buffer) => any;

interface BytenodeOptions {
    filename: string;
    output?: string;
    compileAsModule?: boolean;
    compress?: boolean;
    electron?: boolean;
    electronMain?: boolean;
    electronRenderer?: boolean;
    electronPath?: string;
    createLoader?: boolean | string;
    loaderFilename?: string;
    /** Write an external source map at `<output>.map` for error stack traces. An existing input source map is rebased, so frames point at the original sources. */
    sourceMap?: boolean;
}

export declare const compileFile: (args: BytenodeOptions | string, output?: string | undefined) => Promise<string>;

export declare const runBytecodeFile: (filename: string) => any;

export declare function addLoaderFile(
    fileToLoad: string,
    loaderFilename?: string | boolean,
    type?: 'module' | 'commonjs',
    sheBang?: RegExpMatchArray | null
): void;

export declare function loaderCode(targetPath: string, sheBang?: RegExpMatchArray | null): string;

export declare function loaderCodeCommonJS(targetPath: string, sheBang?: RegExpMatchArray | null): string;

export declare function loaderCodeModule(
    targetPath: string,
    sheBang?: RegExpMatchArray | null,
    compiledFilePath?: string
): string;

export { };
