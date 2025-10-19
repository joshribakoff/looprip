import React from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';

type Props = {
  header: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

export function EnterPromptScreen({ header, value, onChange, onSubmit }: Props) {
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>Enter prompt required by this pipeline: </Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Esc: back</Text>
      </Box>
    </Box>
  );
}

export default EnterPromptScreen;
