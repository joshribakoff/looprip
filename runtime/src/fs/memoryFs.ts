import path from 'node:path';
import type { DirentLike, FileSystem, StatsLike } from './types.js';

function normalize(p: string): string {
  // Use posix-like normalized absolute-ish strings for consistency
  const np = path.resolve(p);
  return np;
}

class MemDirent implements DirentLike {
  constructor(public name: string, private kind: 'file' | 'directory') {}
  isDirectory(): boolean { return this.kind === 'directory'; }
  isFile(): boolean { return this.kind === 'file'; }
}

class MemStats implements StatsLike {
  constructor(private kind: 'file' | 'directory') {}
  isDirectory(): boolean { return this.kind === 'directory'; }
  isFile(): boolean { return this.kind === 'file'; }
}

export class InMemoryFileSystem implements FileSystem {
  private files = new Map<string, string>();
  private dirs = new Set<string>();

  constructor(initial?: Record<string, string>) {
    // ensure root
    this.dirs.add(normalize('/'));

    if (initial) {
      for (const [p, content] of Object.entries(initial)) {
        const abs = normalize(p);
        this.ensureDir(path.dirname(abs));
        this.files.set(abs, content);
      }
    }
  }

  private ensureDir(dirPath: string): void {
    const current = normalize(dirPath);
    // Walk up creating parents
    const root = path.parse(current).root;
    const stack: string[] = [];
    let cursor = current;
    // iterate until we reach filesystem root
    // eslint-disable-next-line no-constant-condition
    for (;;) {
      stack.push(cursor);
      if (cursor === root) break;
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    for (const p of stack.reverse()) {
      this.dirs.add(p);
    }
  }

  async readFile(p: string, _encoding?: 'utf8'): Promise<string> {
    const abs = normalize(p);
    const v = this.files.get(abs);
    if (v === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${abs}'`);
    }
    return v;
  }

  async writeFile(p: string, data: string, _encoding?: 'utf8'): Promise<void> {
    const abs = normalize(p);
    this.ensureDir(path.dirname(abs));
    this.files.set(abs, data);
  }

  async mkdir(p: string, options: { recursive: boolean }): Promise<void> {
    const abs = normalize(p);
    if (options.recursive) {
      this.ensureDir(abs);
    } else {
      const parent = path.dirname(abs);
      if (!this.dirs.has(parent)) {
        throw new Error(`ENOENT: no such file or directory, mkdir '${abs}'`);
      }
      this.dirs.add(abs);
    }
  }

  async readdir(p: string, _options?: { withFileTypes: true }): Promise<DirentLike[]> {
    const abs = normalize(p);
    if (!this.dirs.has(abs)) {
      throw new Error(`ENOTDIR: not a directory, scandir '${abs}'`);
    }

    const names = new Set<string>();
    const prefix = abs.endsWith(path.sep) ? abs : abs + path.sep;

    for (const d of this.dirs) {
      if (d === abs) continue;
      if (d.startsWith(prefix)) {
        const rest = d.slice(prefix.length);
        const first = rest.split(path.sep)[0];
        if (first) names.add(first);
      }
    }

    for (const f of this.files.keys()) {
      if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        const first = rest.split(path.sep)[0];
        if (first) names.add(first);
      }
    }

    const dirents: DirentLike[] = [];
    for (const name of Array.from(names).sort()) {
      const childPath = path.join(abs, name);
      const kind: 'file' | 'directory' = this.dirs.has(childPath) ? 'directory' : 'file';
      dirents.push(new MemDirent(name, kind));
    }
    return dirents;
  }

  async stat(p: string): Promise<StatsLike> {
    const abs = normalize(p);
    if (this.dirs.has(abs)) {
      return new MemStats('directory');
    }
    if (this.files.has(abs)) {
      return new MemStats('file');
    }
    throw new Error(`ENOENT: no such file or directory, stat '${abs}'`);
  }

  async access(p: string): Promise<void> {
    const abs = normalize(p);
    if (this.dirs.has(abs) || this.files.has(abs)) return;
    throw new Error(`ENOENT: no such file or directory, access '${abs}'`);
  }
}
