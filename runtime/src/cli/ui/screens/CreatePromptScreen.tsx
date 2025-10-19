import React from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';

type PathInfo = { rel: string; abs: string; exists: boolean } | null;

type Props = {
  header: React.ReactNode;
  defaultPath: string;
  value: string;
  createPathInfo: PathInfo;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void | Promise<void>;
  onBack?: () => void;
};

export function CreatePromptScreen({ header, defaultPath, value, createPathInfo, onChange, onSubmit, onBack }: Props) {
  const info = createPathInfo;
  const invalid = !!info?.exists;
  useInput((input, key) => {
    if (key.escape && onBack) onBack();
  });
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>New prompt path (edit if desired): </Text>
        <TextInput value={value || defaultPath} onChange={onChange} onSubmit={onSubmit} />
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
