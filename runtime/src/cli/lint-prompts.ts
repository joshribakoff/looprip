import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parsePromptString } from '../core/prompt';

/**
 * Lint all files under /prompts to ensure they:
 * - have .md or .txt extension
 * - start with YAML front matter delimited by --- and closed with ---
 * - front matter parses and matches PromptFrontMatterSchema
 */

// Executed from runtime/ via npm script; repo root is one level up
const ROOT = path.resolve(process.cwd(), '..');
const PROMPTS_DIR = path.join(ROOT, 'prompts');

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fp);
    } else {
      yield fp;
    }
  }
}

async function lint(): Promise<number> {
  const errors: string[] = [];
  try {
    const stat = await fs.stat(PROMPTS_DIR);
    if (!stat.isDirectory()) {
      console.error(`prompts/ is not a directory: ${PROMPTS_DIR}`);
      return 1;
    }
  } catch (e) {
    console.error(`prompts/ directory not found at ${PROMPTS_DIR}`);
    return 1;
  }

  const allowedExt = new Set(['.md']);

  for await (const filePath of walk(PROMPTS_DIR)) {
    // Skip repository docs inside prompts folder
    const base = path.basename(filePath);
    if (base.toLowerCase() === 'readme.md') continue;

    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExt.has(ext)) {
      errors.push(`${path.relative(ROOT, filePath)}: invalid extension '${ext}'. Expected .md`);
      continue;
    }

    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (e: any) {
      errors.push(`${path.relative(ROOT, filePath)}: failed to read file: ${e.message}`);
      continue;
    }

    const trimmed = content.trimStart();
    if (!trimmed.startsWith('---')) {
      errors.push(
        `${path.relative(ROOT, filePath)}: missing YAML front matter. File must start with ---`,
      );
      continue;
    }

    const fmEnd = trimmed.indexOf('\n---', 3);
    if (fmEnd === -1) {
      errors.push(`${path.relative(ROOT, filePath)}: front matter not closed with ---`);
      continue;
    }

    try {
      // parsePromptString validates YAML and schema
      parsePromptString(content, filePath);
    } catch (e: any) {
      errors.push(`${path.relative(ROOT, filePath)}: ${e.message}`);
      continue;
    }
  }

  if (errors.length > 0) {
    console.error('\nPrompt lint failed:');
    for (const msg of errors) console.error(`- ${msg}`);
    return 1;
  }

  console.log('Prompt lint passed.');
  return 0;
}

lint().then((code) => {
  process.exit(code);
});
