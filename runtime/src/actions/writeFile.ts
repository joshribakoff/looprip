import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function writeFileAction(targetPath: string, contents: string): Promise<string> {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  try {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, contents, 'utf8');
    return resolvedPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error';
    throw new Error(`Failed to write file at ${resolvedPath}: ${message}`);
  }
}
