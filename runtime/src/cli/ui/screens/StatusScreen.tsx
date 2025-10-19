import React from 'react';
import {Box, Text} from 'ink';
import { ScrollableLogView } from '../components/ScrollableLogView.js';

type Props = {
  header: React.ReactNode;
  mode: 'running' | 'summary';
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  lastResultSuccess: boolean | null;
  scrollOffset: number;
};

export function StatusScreen({ header, mode, status, message, lastResultSuccess, scrollOffset }: Props) {
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>{status === 'loading' ? 'Running…' : ''}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      <ScrollableLogView scrollOffset={scrollOffset} windowHeight={15} />
      {mode === 'summary' && (
        <Box marginTop={1}>
          <Text dimColor>{lastResultSuccess === true || lastResultSuccess === false ? 'Enter: back • q: quit' : 'q: quit'}</Text>
        </Box>
      )}
    </Box>
  );
}

export default StatusScreen;
