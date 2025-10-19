import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface CreatePromptOptions {
  /** Working directory to resolve relative paths. Defaults to process.cwd() */
  cwd?: string;
  /** The name (without .md) or relative/absolute path to create. */
  input?: string;
  /** Directory to place the prompt in if input is only a bare name. Defaults to "prompts" under cwd. */
  dir?: string;
  /** Try to open the created file in VS Code (best-effort). */
  openInEditor?: boolean;
}

export interface CreatePromptResult {
  filePath: string;
  created: boolean; // false if it already existed
}

const DEFAULT_TEMPLATE = `---
status: draft
---

<!-- Write your prompt below. This file uses YAML front matter above and Markdown body. -->

`;

function isPathLike(input: string): boolean {
  return input.includes('/') || input.includes('\\') || input.startsWith('.') || input.startsWith('~');
}

function ensureMd(filePath: string): string {
  return filePath.toLowerCase().endsWith('.md') ? filePath : `${filePath}.md`;
}

export async function createPrompt(options: CreatePromptOptions = {}): Promise<CreatePromptResult> {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.dir ?? 'prompts';
  const rawInput = (options.input ?? '').trim();

  let targetPath: string;
  if (!rawInput) {
    // Default to prompts/new-prompt.md to nudge the user
    targetPath = path.resolve(cwd, baseDir, 'new-prompt.md');
  } else if (isPathLike(rawInput)) {
    // Treat as a path (relative to cwd)
    targetPath = path.resolve(cwd, ensureMd(rawInput));
  } else {
    // Treat as a bare name inside baseDir
    targetPath = path.resolve(cwd, baseDir, ensureMd(rawInput));
  }

  const dirName = path.dirname(targetPath);
  await fs.mkdir(dirName, { recursive: true });

  let created = false;
  try {
    await fs.access(targetPath);
    // File exists; do not overwrite
  } catch {
    await fs.writeFile(targetPath, DEFAULT_TEMPLATE, 'utf8');
    created = true;
  }

  if (options.openInEditor) {
    // Best-effort open without crashing if commands are missing
    const trySpawn = (cmd: string, args: string[]): Promise<boolean> =>
      new Promise((resolve) => {
        let ok = true;
        try {
          const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
          child.on('error', () => { ok = false; resolve(false); });
          // If spawn succeeds synchronously, unref and resolve true on next tick
          child.unref();
          // Resolve true if no immediate error
          setImmediate(() => { if (ok) resolve(true); });
        } catch {
          resolve(false);
        }
      });

    // Try VS Code CLI first, then macOS app opener
    const openedViaCode = await trySpawn('code', [targetPath]);
    if (!openedViaCode && process.platform === 'darwin') {
      await trySpawn('open', ['-a', 'Visual Studio Code', targetPath]);
    }
  }

  return { filePath: targetPath, created };
}
