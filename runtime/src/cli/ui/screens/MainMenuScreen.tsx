import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type MainMenuChoice = { title: string; value: string };

type Props = {
  header: React.ReactNode;
  notice: { text: string; color?: 'green' | 'red' | 'yellow' } | null;
  onSelect: (value: string) => void;
};

const MAIN_MENU_CHOICES: MainMenuChoice[] = [
  { title: 'Run a pipeline', value: 'run-pipeline' },
  { title: 'Run a prompt', value: 'run-prompt' },
  { title: 'Create a prompt', value: 'create-prompt' },
  { title: 'Quit', value: 'quit' },
];

export function MainMenuScreen({ header, notice, onSelect }: Props) {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => (i > 0 ? i - 1 : i));
    else if (key.downArrow) setIndex((i) => (i < MAIN_MENU_CHOICES.length - 1 ? i + 1 : 0));
    else if (key.return) onSelect(MAIN_MENU_CHOICES[index]?.value ?? 'quit');
    else if (input === 'q' || key.escape) onSelect('quit');
  });
  return (
    <Box flexDirection="column">
      {header}
      {notice && (
        <Box marginTop={1}>
          <Text color={notice.color}>{notice.text}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        {MAIN_MENU_CHOICES.map((c, i) => (
          <Text key={c.value} color={i === index ? 'cyan' : undefined}>
            {i === index ? '› ' : '  '}
            {c.title}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑/↓: navigate • Enter: select • q: quit</Text>
      </Box>
    </Box>
  );
}

export { MAIN_MENU_CHOICES };
export default MainMenuScreen;
