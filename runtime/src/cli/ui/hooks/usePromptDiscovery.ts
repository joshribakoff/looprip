import {useEffect, useState} from 'react';
import fs from 'fs/promises';
import path from 'path';
import { parsePromptFile } from '../../../core/prompt.js';

export type PromptChoice = { title: string; value: string };

async function findPromptFiles(baseDir: string): Promise<Array<{ path: string; title: string }>> {
  const promptsDir = path.join(baseDir, 'prompts');
  const results: Array<{ path: string; title: string }> = [];
  
  let entries;
  try {
    entries = await fs.readdir(promptsDir, { withFileTypes: true });
  } catch {
    return results; // prompts directory doesn't exist
  }
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const fullPath = path.join(promptsDir, entry.name);
      try {
        const parsed = await parsePromptFile(fullPath);
        // Filter out archived prompts
        if (parsed.frontMatter.status !== 'archived') {
          const title = entry.name.replace(/\.md$/, '');
          results.push({ path: fullPath, title });
        }
      } catch (err) {
        // Skip invalid prompts
        console.warn(`[usePromptDiscovery] Skipping invalid prompt: ${entry.name}`, err);
      }
    }
  }
  
  return results.sort((a, b) => a.title.localeCompare(b.title));
}

export function usePromptDiscovery(cwd: string) {
  const [choices, setChoices] = useState<PromptChoice[]>([]);

  const refreshChoices = async (): Promise<PromptChoice[]> => {
    const found = await findPromptFiles(cwd);
    const nextChoices: PromptChoice[] = found.map(({ path: fullPath, title }) => ({
      title,
      value: fullPath,
    }));
    setChoices(nextChoices);
    return nextChoices;
  };

  useEffect(() => {
    void refreshChoices();
  }, [cwd]);

  return { choices, refreshChoices } as const;
}

export default usePromptDiscovery;
