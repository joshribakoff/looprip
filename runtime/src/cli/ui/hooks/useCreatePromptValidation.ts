import {useEffect, useMemo, useState} from 'react';
import path from 'path';
import fs from 'fs/promises';

export type PathInfo = { rel: string; abs: string; exists: boolean } | null;

export function useCreatePromptValidation(params: {
  cwd: string;
  mode: string;
  inputValue: string;
  ensureMd: (fp: string) => string;
}) {
  const { cwd, mode, inputValue, ensureMd } = params;
  const defaultPath = useMemo(() => path.join('prompts', 'new-prompt.md'), []);
  const [createPathInfo, setCreatePathInfo] = useState<PathInfo>(null);

  useEffect(() => {
    if (mode !== 'create-prompt') return;
    let cancelled = false;
    const typed = (inputValue && inputValue.trim()) || defaultPath;
    const normalized = ensureMd(typed);
    const abs = path.resolve(cwd, normalized);
    const rel = path.relative(cwd, abs) || abs;
    (async () => {
      const exists = await fs.stat(abs).then((s) => s.isFile()).catch(() => false);
      if (!cancelled) setCreatePathInfo({ rel, abs, exists });
    })();
    return () => { cancelled = true; };
  }, [cwd, defaultPath, ensureMd, inputValue, mode]);

  return { defaultPath, createPathInfo } as const;
}

export default useCreatePromptValidation;
