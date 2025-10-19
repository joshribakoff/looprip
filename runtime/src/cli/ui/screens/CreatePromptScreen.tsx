import React from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import path from 'path';
import fs from 'fs/promises';
import { useUiDispatch, useUiState, actions } from '../state/uiStore.js';
import { createPrompt } from '../../createPrompt.js';
import { useCreatePromptValidation } from '../hooks/useCreatePromptValidation.js';

type Props = {
  header: React.ReactNode;
};

export function CreatePromptScreen({ header }: Props) {
  const dispatch = useUiDispatch();
  const { cwd, customPath } = useUiState();
  
  const ensureMd = (fp: string) => {
    return fp.toLowerCase().endsWith('.md') ? fp : `${fp}.md`;
  };

  const { defaultPath, createPathInfo } = useCreatePromptValidation({
    cwd,
    mode: 'create-prompt',
    inputValue: customPath,
    ensureMd,
  });

  const info = createPathInfo;
  const invalid = !!info?.exists;

  const handleSubmit = async (val: string) => {
    const typed = (val.trim() || defaultPath);
    const normalized = ensureMd(typed);
    const absPath = path.resolve(cwd, normalized);
    const exists = await fs.stat(absPath).then((s) => s.isFile()).catch(() => false);
    if (exists) {
      return;
    }
    const result = await createPrompt({ cwd, input: normalized, openInEditor: true });
    const rel = path.relative(cwd, result.filePath) || result.filePath;
    const abs = path.resolve(result.filePath);
    dispatch(actions.promptCreated(abs, rel));
  };

  const handleBack = () => {
    dispatch(actions.navigateToMainMenu());
  };

  useInput((input, key) => {
    if (key.escape) handleBack();
  });

  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>New prompt path (edit if desired): </Text>
        <TextInput 
          value={customPath || defaultPath} 
          onChange={(v: string) => dispatch(actions.inputChanged('customPath', v))} 
          onSubmit={handleSubmit} 
        />
      </Box>
      {info && (
        <Box marginTop={1}>
          <Text color={info.exists ? 'red' : 'green'}>
            {info.exists ? 'Already exists: ' : 'Will create: '}{info.rel}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {invalid ? 'Pick a different name. ' : 'Enter: create. '}Tip: Use backspace to change folder/name. Esc: back
        </Text>
      </Box>
    </Box>
  );
}

export default CreatePromptScreen;
