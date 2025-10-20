import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type PipelineChoice = { title: string; value: string };

export type Notice = { text: string; color?: 'green' | 'red' | 'yellow' } | null;

type Props = {
  header: React.ReactNode;
  choices: PipelineChoice[];
  notice: Notice;
  onSelect: (value: string) => void;
  onRefresh?: () => void | Promise<void>;
  onBack?: () => void;
};

export function SelectScreen({ header, choices, notice, onSelect, onRefresh, onBack }: Props) {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => (i > 0 ? i - 1 : i));
    else if (key.downArrow)
      setIndex((i) => (choices.length > 0 ? (i < choices.length - 1 ? i + 1 : 0) : 0));
    else if (key.return) {
      const choice = choices[index];
      if (choice) onSelect(choice.value);
    } else if (input === 'r' && onRefresh) onRefresh();
    else if ((input === 'q' || key.escape) && onBack) onBack();
  });
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text bold>Select a pipeline to run:</Text>
      </Box>
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
        <Text dimColor>↑/↓: navigate • Enter: select • r: refresh • q/Esc: back to main menu</Text>
      </Box>
    </Box>
  );
}

export default SelectScreen;
