import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function readFileAction(targetPath: string): Promise<{ contents: string; resolvedPath: string }> {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  try {
    const contents = await fs.readFile(resolvedPath, 'utf8');
    return { contents, resolvedPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error';
    throw new Error(`Failed to read file at ${resolvedPath}: ${message}`);
  }
}
