import React from 'react';
import { Box, Text, Spacer } from 'ink';
import path from 'path';
import MainMenuScreen from './screens/MainMenuScreen.js';
import SelectScreen from './screens/SelectScreen.js';
import SelectPromptScreen from './screens/SelectPromptScreen.js';
import StatusScreen from './screens/StatusScreen.js';
import CustomPathScreen from './screens/CustomPathScreen.js';
import EnterPromptScreen from './screens/EnterPromptScreen.js';
import CreatePromptScreen from './screens/CreatePromptScreen.js';
import { usePipelineDiscovery } from './hooks/usePipelineDiscovery.js';
import { usePromptDiscovery } from './hooks/usePromptDiscovery.js';
import { UIProvider, useUiState } from './state/uiStore.js';
import { LoggerProvider } from './logger/InkLogger.js';
import { useUiController } from './controller/useUiController.js';

function AppInner() {
  const cwd = process.cwd();
  const { choices, refreshChoices } = usePipelineDiscovery(cwd);
  const { choices: promptChoices, refreshChoices: refreshPromptChoices } = usePromptDiscovery(cwd);
  const { mode, status, message, lastResultSuccess } = useUiState();
  const { onMainMenuSelect, onCustomPathSubmitted, onEnterPromptSubmitted, onPromptSelected, onBack, goToCustomPath, goToCreatePrompt, onPipelineSelected, goToMainMenu, quit } =
    useUiController();
  const { notice } = useUiState();

  const header = (
    <Box>
      <Text bold>Agent Pipeline</Text>
      <Spacer />
      <Text dimColor>q: quit</Text>
    </Box>
  );

  const wrapInBorder = (content: React.ReactNode) => (
    <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
      {content}
    </Box>
  );

  if (mode === 'main-menu') {
    return wrapInBorder(
      <MainMenuScreen
        header={header}
        notice={notice}
        onSelect={(value) => onMainMenuSelect(value)}
      />,
    );
  }

  if (mode === 'create-prompt') {
    return wrapInBorder(<CreatePromptScreen header={header} />);
  }

  if (mode === 'select-prompt') {
    return wrapInBorder(
      <SelectPromptScreen
        header={header}
        choices={promptChoices}
        notice={notice}
        onRefresh={() => {
          void refreshPromptChoices();
        }}
        onSelect={(value) => onPromptSelected(value)}
        onBack={() => onBack()}
      />,
    );
  }

  if (mode === 'custom-path') {
    return wrapInBorder(
      <CustomPathScreen
        header={header}
        onBack={() => onBack()}
        onSubmit={(val: string) => {
          const abs = path.resolve(cwd, val.trim());
          void onCustomPathSubmitted(abs);
        }}
      />,
    );
  }

  if (mode === 'enter-prompt') {
    return wrapInBorder(
      <EnterPromptScreen header={header} onBack={() => onBack()} onSubmit={onEnterPromptSubmitted} />,
    );
  }

  if (mode === 'running' || mode === 'summary') {
    return wrapInBorder(
      <StatusScreen
        header={header}
        mode={mode}
        status={status}
        message={message}
        lastResultSuccess={lastResultSuccess}
        onBackToMenu={() => goToMainMenu()}
        onQuit={() => quit()}
      />,
    );
  }

  // Select mode
  return wrapInBorder(
    <SelectScreen
      header={header}
      choices={choices}
      notice={notice}
      onRefresh={() => {
        void refreshChoices();
      }}
      onBack={() => goToMainMenu()}
      onSelect={(value: string) => {
        if (value === '__custom__') {
          goToCustomPath();
        } else if (value === '__create_prompt__') {
          goToCreatePrompt();
        } else {
          void onPipelineSelected(value);
        }
      }}
    />,
  );
}

export function InteractiveApp() {
  const cwd = process.cwd();
  return (
    <UIProvider cwd={cwd}>
      <LoggerProvider>
        <AppInner />
      </LoggerProvider>
    </UIProvider>
  );
}
