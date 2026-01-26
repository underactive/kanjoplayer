/// <reference types="vite/client" />

// CSS modules
declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// Optional peer dependencies
declare module '@ffmpeg/ffmpeg' {
  export class FFmpeg {
    load(): Promise<void>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
    deleteFile(path: string): Promise<void>;
    exec(args: string[]): Promise<number>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    terminate(): void;
  }
}

declare module '@ffmpeg/util' {
  export function fetchFile(url: string): Promise<Uint8Array>;
}
