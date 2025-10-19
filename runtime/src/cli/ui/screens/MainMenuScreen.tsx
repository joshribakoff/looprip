import React from 'react';
import {Box, Text} from 'ink';

export type MainMenuChoice = { title: string; value: string };

type Props = {
  header: React.ReactNode;
  index: number;
  notice: { text: string; color?: 'green' | 'red' | 'yellow' } | null;
};

const MAIN_MENU_CHOICES: MainMenuChoice[] = [
  { title: 'Run a pipeline', value: 'run-pipeline' },
  { title: 'Run a prompt', value: 'run-prompt' },
  { title: 'View jobs', value: 'view-jobs' },
  { title: 'Create a prompt', value: 'create-prompt' },
  { title: 'Quit', value: 'quit' },
];

export function MainMenuScreen({ header, index, notice }: Props) {
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
