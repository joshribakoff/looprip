import React from 'react';
import {Box, Text, useStdout} from 'ink';
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
  const { stdout } = useStdout();
  // Calculate available height: terminal height minus space for UI elements
  // Header (3 lines) + status (2 lines) + message (2 lines) + scroll indicator (2 lines) + footer (2 lines) + borders/padding (~6 lines) = ~17 lines overhead
  const terminalHeight = stdout.rows || 24; // Default to 24 if not available
  const overhead = 17;
  const availableHeight = Math.max(10, terminalHeight - overhead); // Minimum 10 lines
  
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text>{status === 'loading' ? 'Running…' : ''}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      <ScrollableLogView scrollOffset={scrollOffset} windowHeight={availableHeight} />
      {mode === 'summary' && (
        <Box marginTop={1}>
          <Text dimColor>{lastResultSuccess === true || lastResultSuccess === false ? 'Enter: back • q: quit' : 'q: quit'}</Text>
        </Box>
      )}
    </Box>
  );
}

export default StatusScreen;
