import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import type { FileSystem, DirentLike, StatsLike } from './types.js';

function toDirentLike(d: Dirent): DirentLike {
  return {
    name: d.name,
    isDirectory: () => d.isDirectory(),
    isFile: () => d.isFile(),
  };
}

export class NodeFileSystem implements FileSystem {
  async readFile(path: string, _encoding?: 'utf8'): Promise<string> {
    return fs.readFile(path, 'utf8');
  }

  async writeFile(path: string, data: string, _encoding?: 'utf8'): Promise<void> {
    await fs.writeFile(path, data, 'utf8');
  }

  async mkdir(path: string, options: { recursive: boolean }): Promise<void> {
    await fs.mkdir(path, { recursive: options.recursive });
  }

  async readdir(path: string, _options?: { withFileTypes: true }): Promise<DirentLike[]> {
    const dirents = await fs.readdir(path, { withFileTypes: true });
    return dirents.map(toDirentLike);
  }

  async stat(path: string): Promise<StatsLike> {
    const s = await fs.stat(path);
    return {
      isDirectory: () => s.isDirectory(),
      isFile: () => s.isFile?.() ?? !s.isDirectory(),
    };
  }

  async access(path: string): Promise<void> {
    await fs.access(path);
  }
}
