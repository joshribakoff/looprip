import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

type Props = {
  header: React.ReactNode;
  onSubmit: (v: string) => void;
  onBack?: () => void;
};

export function CustomPathScreen({ header, onSubmit, onBack }: Props) {
  const [value, setValue] = useState('');
  useInput((input, key) => {
    if (key.escape && onBack) onBack();
  });
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>Enter path to pipeline YAML: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Esc: back</Text>
      </Box>
    </Box>
  );
}

export default CustomPathScreen;
