import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const DEFAULT_MAX_RESULTS = 200;
const MAX_RESULTS_LIMIT = 1000;
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist']);

export const listDirectoryArgsSchema = z
  .object({
    path: z.string().min(1).optional(),
    directory: z.string().min(1).optional(),
    recursive: z.boolean().optional(),
    pattern: z.string().min(1).optional(),
    max_results: z.number().int().positive().max(MAX_RESULTS_LIMIT).optional(),
    maxResults: z.number().int().positive().max(MAX_RESULTS_LIMIT).optional(),
  })
  .transform((value) => ({
    path: value.path ?? value.directory ?? '.',
    recursive: value.recursive ?? false,
    pattern: value.pattern,
    maxResults: value.max_results ?? value.maxResults ?? DEFAULT_MAX_RESULTS,
  }));

export type ListDirectoryArgs = z.infer<typeof listDirectoryArgsSchema>;

export interface ListDirectoryEntry {
  path: string;
  type: 'file' | 'directory';
}

export interface ListDirectoryResult {
  resolvedPath: string;
  entries: ListDirectoryEntry[];
  truncated: boolean;
  pattern?: string;
  recursive: boolean;
  limit: number;
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function globToRegExp(pattern: string): RegExp {
  let regex = '^';

  for (let index = 0; index < pattern.length;) {
    const char = pattern[index];

    if (char === '*') {
      const next = pattern[index + 1];
      if (next === '*') {
        const afterNext = pattern[index + 2];
        if (afterNext === '/') {
          regex += '(?:.*/)?';
          index += 3;
        } else {
          regex += '.*';
          index += 2;
        }
      } else {
        regex += '[^/]*';
        index += 1;
      }
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      index += 1;
      continue;
    }

    if (/[\\.^$+{}()|\[\]]/.test(char)) {
      regex += `\\${char}`;
    } else {
      regex += char;
    }
    index += 1;
  }

  regex += '$';
  return new RegExp(regex);
}

async function walkDirectory(
  basePath: string,
  currentPath: string,
  args: ListDirectoryArgs,
  entries: ListDirectoryEntry[],
  matcher: RegExp | null,
): Promise<boolean> {
  if (entries.length >= args.maxResults) {
    return true;
  }

  const dirents = await fs.readdir(currentPath, { withFileTypes: true });
  dirents.sort((a, b) => a.name.localeCompare(b.name));

  for (const dirent of dirents) {
    if (entries.length >= args.maxResults) {
      return true;
    }

    if (dirent.isDirectory() && IGNORED_DIRECTORIES.has(dirent.name)) {
      continue;
    }

    const absolutePath = path.join(currentPath, dirent.name);
    const relativeToBase = path.relative(basePath, absolutePath) || dirent.name;
    const normalized = toPosix(relativeToBase);
    const entryType: ListDirectoryEntry['type'] = dirent.isDirectory() ? 'directory' : 'file';
    const candidatePath = entryType === 'directory' ? `${normalized}/` : normalized;

    if (!matcher || matcher.test(candidatePath)) {
      entries.push({
        path: candidatePath || '.',
        type: entryType,
      });

      if (entries.length >= args.maxResults) {
        return true;
      }
    }

    if (dirent.isDirectory() && args.recursive) {
      const truncated = await walkDirectory(basePath, absolutePath, args, entries, matcher);
      if (truncated) {
        return true;
      }
    }
  }

  return false;
}

export async function listDirectoryAction(rawArgs: ListDirectoryArgs): Promise<ListDirectoryResult> {
  const args = rawArgs;
  const resolvedPath = path.resolve(process.cwd(), args.path);

  let stats;

  try {
    stats = await fs.stat(resolvedPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    throw new Error(`Failed to access path ${resolvedPath}: ${message}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`list_directory requires a directory path. Received ${resolvedPath}`);
  }

  const entries: ListDirectoryEntry[] = [];
  const matcher = args.pattern ? globToRegExp(args.pattern) : null;
  const truncated = await walkDirectory(resolvedPath, resolvedPath, args, entries, matcher);

  return {
    resolvedPath,
    entries,
    truncated,
    pattern: args.pattern,
    recursive: args.recursive,
    limit: args.maxResults,
  };
}
