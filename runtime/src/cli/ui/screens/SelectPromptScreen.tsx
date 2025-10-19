import React from 'react';
import { Box, Text } from 'ink';

export type PromptChoice = { title: string; value: string };

export type Notice = { text: string; color?: 'green' | 'red' | 'yellow' } | null;

type Props = {
  header: React.ReactNode;
  choices: PromptChoice[];
  index: number;
  notice: Notice;
};

export function SelectPromptScreen({ header, choices, index, notice }: Props) {
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text bold>Select a prompt to run:</Text>
      </Box>
      {notice && (
        <Box marginTop={1}>
          <Text color={notice.color}>{notice.text}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        {choices.length === 0 ? (
          <Text dimColor>No prompts found in the prompts directory.</Text>
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
        <Text dimColor>↑/↓: navigate • Enter: select • r: refresh • q/Esc: back to main menu</Text>
      </Box>
    </Box>
  );
}

export default SelectPromptScreen;
