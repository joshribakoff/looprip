export interface StatsLike {
  isDirectory(): boolean;
  isFile?(): boolean;
}

export interface DirentLike {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

export interface FileSystem {
  readFile(path: string, encoding?: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding?: 'utf8'): Promise<void>;
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  readdir(path: string, options?: { withFileTypes: true }): Promise<DirentLike[]>;
  stat(path: string): Promise<StatsLike>;
  access?(path: string): Promise<void>;
}

export interface FsActionOptions {
  fs?: FileSystem;
  cwd?: string;
}
