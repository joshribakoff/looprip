import path from 'node:path';
import { z } from 'zod';
import type { FsActionOptions } from '../fs/types.js';
import { NodeFileSystem } from '../fs/nodeFs.js';

export const readFileArgsSchema = z
  .object({
    path: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.path ?? value.file_path), {
    message: 'read_file requires "path"',
  })
  .transform((value) => ({ path: value.path ?? value.file_path! }));

export type ReadFileArgs = z.infer<typeof readFileArgsSchema>;

export async function readFileAction(targetPath: string, options: FsActionOptions = {}): Promise<{ contents: string; resolvedPath: string }> {
  const fs = options.fs ?? new NodeFileSystem();
  const cwd = options.cwd ?? process.cwd();
  const resolvedPath = path.resolve(cwd, targetPath);
  try {
    const contents = await fs.readFile(resolvedPath, 'utf8');
    return { contents, resolvedPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    throw new Error(`Failed to read file at ${resolvedPath}: ${message}`);
  }
}
