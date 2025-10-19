import React from 'react';
import {Box, Text} from 'ink';

type Props = {
  header: React.ReactNode;
  mode: 'running' | 'summary';
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  lastResultSuccess: boolean | null;
};

export function StatusScreen({ header, mode, status, message, lastResultSuccess }: Props) {
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>{status === 'loading' ? 'Running…' : ''}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      {mode === 'summary' && (
        <Box marginTop={1}>
          <Text dimColor>{lastResultSuccess === true || lastResultSuccess === false ? 'Enter: back • q: quit' : 'q: quit'}</Text>
        </Box>
      )}
    </Box>
  );
}

export default StatusScreen;
