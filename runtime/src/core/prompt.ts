/**
 * Prompt front matter schema and parsing utilities
 */

import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

export const PromptCleanupSchema = z
  .object({
    deleteAfterRun: z.boolean().optional().default(false),
    toggleStatusOnComplete: z.enum(['done', 'archived']).optional(),
  })
  .strict();

export const PromptFrontMatterSchema = z
  .object({
    status: z.enum(['draft', 'active', 'done', 'archived']).default('draft'),
  })
  .strict();

export type PromptFrontMatter = z.infer<typeof PromptFrontMatterSchema>;

export interface ParsedPrompt {
  frontMatter: PromptFrontMatter;
  body: string;
  filePath?: string;
}

/**
 * Parse a prompt string with YAML front matter. Returns front matter + body.
 */
export function parsePromptString(input: string, filePath?: string): ParsedPrompt {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith('---')) {
    throw new Error('Prompt is missing YAML front matter. Expected to start with ---');
  }

  // Find end of front matter
  const fmEnd = trimmed.indexOf('\n---', 3);
  if (fmEnd === -1) {
    throw new Error('Front matter not closed with ---');
  }

  const fmBlock = trimmed.slice(3, fmEnd).trim();
  const body = trimmed.slice(fmEnd + 4).replace(/^\s*\n/, '');

  let fm: unknown;
  try {
    fm = yaml.load(fmBlock) ?? {};
  } catch (err: any) {
    throw new Error(`Invalid YAML front matter: ${err.message}`);
  }

  const parsed = PromptFrontMatterSchema.safeParse(fm);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid front matter: ${issues}`);
  }

  return { frontMatter: parsed.data, body, filePath };
}

/**
 * Read and parse a prompt Markdown file from disk.
 */
export async function parsePromptFile(filePath: string): Promise<ParsedPrompt> {
  const content = await fs.readFile(filePath, 'utf8');
  return parsePromptString(content, path.resolve(filePath));
}

/**
 * Minimal formatter to update the status in front matter and return new content.
 * If no status field exists, it will be added.
 */
export function updatePromptStatus(content: string, status: PromptFrontMatter['status']): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return content; // not a front-matter doc

  const fmEnd = trimmed.indexOf('\n---', 3);
  if (fmEnd === -1) return content;

  const prefixWhitespace = content.slice(0, content.indexOf('---'));
  const fmBlock = trimmed.slice(3, fmEnd).trim();
  const body = trimmed.slice(fmEnd + 4);

  let fm: any = {};
  try {
    fm = yaml.load(fmBlock) ?? {};
  } catch {
    return content;
  }
  fm.status = status;
  const nextFm = yaml.dump(fm, { lineWidth: 100 });
  return `${prefixWhitespace}---\n${nextFm}---${body.startsWith('\n') ? '' : '\n'}${body}`;
}
