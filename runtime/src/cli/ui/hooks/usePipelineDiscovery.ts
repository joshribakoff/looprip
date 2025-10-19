import {useEffect, useState} from 'react';
import fs from 'fs/promises';
import path from 'path';

export type PipelineChoice = { title: string; value: string };

async function findPipelineFiles(baseDir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // ignore unreadable dirs
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (/^pipeline\.ya?ml$/i.test(entry.name)) {
          results.push(full);
        }
      }
    }
  }
  await walk(baseDir);
  return results.sort();
}

export function usePipelineDiscovery(cwd: string) {
  const [choices, setChoices] = useState<PipelineChoice[]>([]);

  const refreshChoices = async (): Promise<PipelineChoice[]> => {
    const found = await findPipelineFiles(cwd);
    const nextChoices: PipelineChoice[] = [
      ...found.map((abs) => ({ title: path.relative(cwd, abs) || abs, value: abs })),
      { title: 'Enter custom path…', value: '__custom__' },
      { title: 'Create new prompt…', value: '__create_prompt__' },
    ];
    setChoices(nextChoices);
    return nextChoices;
  };

  useEffect(() => {
    void refreshChoices();
  }, [cwd]);

  return { choices, refreshChoices } as const;
}

export default usePipelineDiscovery;
