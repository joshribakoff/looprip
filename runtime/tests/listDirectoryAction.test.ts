import * as fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listDirectoryAction } from '../src/actions/listDirectory.js';

let tempDir: string;

async function createTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'list-dir-action-'));
  return dir;
}

async function removeDir(dir: string | undefined) {
  if (!dir) {
    return;
  }

  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

describe('listDirectoryAction', () => {
  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await removeDir(tempDir);
  });

  it('lists top-level entries without recursion by default', async () => {
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.writeFile(path.join(tempDir, 'README.md'), '# README');

    const result = await listDirectoryAction({ path: tempDir, recursive: false, pattern: undefined, maxResults: 200 });

    expect(result.entries).toEqual(
      expect.arrayContaining([
        { path: 'README.md', type: 'file' },
        { path: 'src/', type: 'directory' },
      ]),
    );
    expect(result.truncated).toBe(false);
  });

  it('supports recursive glob patterns', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, 'main.ts'), '// root');
    await fs.writeFile(path.join(srcDir, 'index.ts'), '// index');
    await fs.writeFile(path.join(srcDir, 'ignore.txt'), 'skip');

    const result = await listDirectoryAction({
      path: tempDir,
      recursive: true,
      pattern: '**/*.ts',
      maxResults: 200,
    });

    const paths = result.entries.map((entry) => entry.path);
    expect(paths).toContain('main.ts');
    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('src/ignore.txt');
  });

  it('enforces the maxResults limit', async () => {
    for (let index = 0; index < 5; index += 1) {
      await fs.writeFile(path.join(tempDir, `file-${index}.txt`), 'content');
    }

    const result = await listDirectoryAction({
      path: tempDir,
      recursive: false,
      pattern: undefined,
      maxResults: 3,
    });

    expect(result.entries).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });
});
