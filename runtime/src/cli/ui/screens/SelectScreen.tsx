import React from 'react';
import {Box, Text} from 'ink';

export type PipelineChoice = { title: string; value: string };

export type Notice = { text: string; color?: 'green' | 'red' | 'yellow' } | null;

type Props = {
  header: React.ReactNode;
  choices: PipelineChoice[];
  index: number;
  notice: Notice;
};

export function SelectScreen({ header, choices, index, notice }: Props) {
  return (
    <Box flexDirection="column">
      {header}
      {notice && (
        <Box marginTop={1}>
          <Text color={notice.color}>{notice.text}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        {choices.length === 0 ? (
          <Text dimColor>No pipeline files found. Press "r" to refresh or use custom path.</Text>
        ) : (
          choices.map((c, i) => (
            <Text key={c.value} color={i === index ? 'cyan' : undefined}>
              {i === index ? '› ' : '  '}
              {c.title}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑/↓: navigate • Enter: select • r: refresh • q: quit</Text>
      </Box>
    </Box>
  );
}

export default SelectScreen;
