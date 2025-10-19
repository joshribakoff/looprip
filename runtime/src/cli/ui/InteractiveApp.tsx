import React, {useEffect} from 'react';
import {Box, Text, useInput, useApp, Spacer} from 'ink';
import path from 'path';
import fs from 'fs/promises';
import {PipelineParser} from '../../core/parser.js';
import MainMenuScreen, { MAIN_MENU_CHOICES } from './screens/MainMenuScreen.js';
import SelectScreen from './screens/SelectScreen.js';
import StatusScreen from './screens/StatusScreen.js';
import CustomPathScreen from './screens/CustomPathScreen.js';
import EnterPromptScreen from './screens/EnterPromptScreen.js';
import CreatePromptScreen from './screens/CreatePromptScreen.js';
import { usePipelineDiscovery } from './hooks/usePipelineDiscovery.js';
import { usePipelineRunner } from './hooks/usePipelineRunner.js';
import { UIProvider, useUiDispatch, useUiState, actions } from './state/uiStore.js';
import { LoggerProvider, useInkLogger } from './logger/InkLogger.js';

function detectNeedsPrompt(pipeline: any): boolean {
  const containsPromptVar = (val: any): boolean => {
    if (typeof val === 'string') return val.includes('{{prompt}}');
    if (Array.isArray(val)) return val.some(containsPromptVar);
    if (val && typeof val === 'object') return Object.values(val).some(containsPromptVar);
    return false;
  };
  return containsPromptVar(pipeline);
}

// Mode type is defined in the UI store; local alias removed

function AppInner() {
  const {exit} = useApp();
  const cwd = process.cwd();
  const { choices, refreshChoices } = usePipelineDiscovery(cwd);
  const { mode, index, customPath, userPrompt, message, status, lastResultSuccess, scrollOffset } = useUiState();
  const dispatch = useUiDispatch();
  const { logger } = useInkLogger();
  const { executePipeline } = usePipelineRunner(logger);
  // Toast/notice shown when returning to the main menu
  const { notice } = useUiState();

  // Keep index in range when choices change
  useEffect(() => {
    dispatch(actions.choicesChanged(choices.length));
  }, [choices.length, dispatch]);

  const handleMainMenuSelect = () => {
    const choice = MAIN_MENU_CHOICES[index];
    if (!choice) return;
    if (choice.value === 'quit') {
      exit();
    } else if (choice.value === 'run-pipeline') {
      dispatch(actions.navigateToSelectPipeline());
    } else if (choice.value === 'create-prompt') {
      dispatch(actions.navigateToCreatePrompt());
    }
  };

  useInput((input: string, key: any) => {
    if (mode === 'main-menu') {
      if (key.upArrow) dispatch(actions.navigateUp());
      else if (key.downArrow) dispatch(actions.navigateDown(MAIN_MENU_CHOICES.length - 1));
      else if (key.return) handleMainMenuSelect();
      else if (input === 'q' || key.escape) exit();
    } else if (mode === 'select') {
      if (key.upArrow) dispatch(actions.navigateUp());
      else if (key.downArrow) dispatch(actions.navigateDown(choices.length - 1));
      else if (key.return) handleSelect();
      else if (input === 'r') void refreshChoices();
      else if (input === 'q' || key.escape) dispatch(actions.navigateToMainMenu());
    } else if (mode === 'custom-path') {
      if (key.escape) dispatch(actions.returnFromScreen());
    } else if (mode === 'enter-prompt') {
      if (key.escape) dispatch(actions.returnFromScreen());
    } else if (mode === 'running') {
      if (key.upArrow) dispatch(actions.scrollUp());
      else if (key.downArrow) dispatch(actions.scrollDown());
    } else if (mode === 'summary') {
      if (key.upArrow) dispatch(actions.scrollUp());
      else if (key.downArrow) dispatch(actions.scrollDown());
      else if (input === 'q' || key.escape) exit();
      else if (key.return) dispatch(actions.navigateToMainMenu());
    }
  });

  const handleSelect = async () => {
    const choice = choices[index];
    if (!choice) return;
    if (choice.value === '__custom__') {
      dispatch(actions.navigateToCustomPath());
      return;
    }
    if (choice.value === '__create_prompt__') {
      dispatch(actions.navigateToCreatePrompt());
      return;
    }
    await runPipeline(choice.value);
  };

  const runPipeline = async (selectedPath: string) => {
    const exists = await fs.stat(selectedPath).then((s) => s.isFile()).catch(() => false);
    if (!exists) {
      dispatch(actions.pipelineNotFound(selectedPath));
      return;
    }
    try {
      dispatch(actions.pipelineLoadingStarted(selectedPath));
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(selectedPath);
      const needsPrompt = detectNeedsPrompt(pipeline);
      if (needsPrompt && !userPrompt) {
        dispatch(actions.navigateToEnterPrompt(selectedPath));
        return;
      }
      dispatch(actions.pipelineExecutionStarted());
      const { success } = await executePipeline(pipeline, { cwd, userPrompt: userPrompt || undefined });
      dispatch(actions.pipelineCompleted(success, success ? '✔ Pipeline completed' : '✖ Pipeline failed'));
    } catch (err: any) {
      dispatch(actions.pipelineFailed(err?.message || String(err)));
    }
  };

  // When in prompt mode, pressing Enter should proceed to run pipeline with stored path
  const onSubmitPrompt = async () => {
    const pathToRun = message && !message.startsWith('\u001b') ? message : undefined;
    if (pathToRun) {
      await runPipeline(pathToRun);
    } else {
      dispatch(actions.returnFromScreen());
    }
  };

  const header = (
    <Box>
      <Text bold>Agent Pipeline</Text>
      <Spacer />
      <Text dimColor>q: quit</Text>
    </Box>
  );

  if (mode === 'main-menu') {
    return (
      <MainMenuScreen header={header} index={index} notice={notice} />
    );
  }

  if (mode === 'create-prompt') {
    return <CreatePromptScreen header={header} />;
  }

  if (mode === 'custom-path') {
    return (
      <CustomPathScreen
        header={header}
        value={customPath}
        onChange={(v: string) => dispatch(actions.inputChanged('customPath', v))}
        onBack={() => dispatch(actions.returnFromScreen())}
        onSubmit={(val: string) => {
          const abs = path.resolve(cwd, val.trim());
          void runPipeline(abs);
        }}
      />
    );
  }

  if (mode === 'enter-prompt') {
    return (
      <EnterPromptScreen
        header={header}
        value={userPrompt}
        onChange={(v: string) => dispatch(actions.inputChanged('userPrompt', v))}
        onBack={() => dispatch(actions.returnFromScreen())}
        onSubmit={() => onSubmitPrompt()}
      />
    );
  }

  if (mode === 'running' || mode === 'summary') {
    return (
      <StatusScreen
        header={header}
        mode={mode}
        status={status}
        message={message}
        lastResultSuccess={lastResultSuccess}
        scrollOffset={scrollOffset}
      />
    );
  }

  // Select mode
  return (
    <SelectScreen header={header} choices={choices} index={index} notice={notice} />
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
