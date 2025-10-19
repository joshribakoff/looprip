import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const writeFileArgsSchema = z
  .object({
    path: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
    contents: z.string().optional(),
    content: z.string().optional(),
  })
  .refine((value) => Boolean((value.path ?? value.file_path) && (value.contents ?? value.content)), {
    message: 'write_file requires "path" and "contents"',
  })
  .transform((value) => ({
    path: value.path ?? value.file_path!,
    contents: value.contents ?? value.content!,
  }));

export type WriteFileArgs = z.infer<typeof writeFileArgsSchema>;

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
