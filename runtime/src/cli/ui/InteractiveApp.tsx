import React, {useEffect} from 'react';
import {Box, Text, useInput, useApp, Spacer} from 'ink';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import {PipelineParser} from '../../core/parser.js';
import { createPrompt } from '../createPrompt.js';
import SelectScreen from './screens/SelectScreen.js';
import StatusScreen from './screens/StatusScreen.js';
import CustomPathScreen from './screens/CustomPathScreen.js';
import EnterPromptScreen from './screens/EnterPromptScreen.js';
import CreatePromptScreen from './screens/CreatePromptScreen.js';
import { usePipelineDiscovery } from './hooks/usePipelineDiscovery.js';
import { useCreatePromptValidation } from './hooks/useCreatePromptValidation.js';
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
  // Helper for .md normalization (mirrors CLI behavior)
  function ensureMd(fp: string) {
    return fp.toLowerCase().endsWith('.md') ? fp : `${fp}.md`;
  }
  const { choices, refreshChoices } = usePipelineDiscovery(cwd);
  const { mode, index, customPath, userPrompt, message, status, lastResultSuccess } = useUiState();
  const dispatch = useUiDispatch();
  const { logger } = useInkLogger();
  const { executePipeline } = usePipelineRunner(logger);
  // Create-prompt validation state moved into hook
  const { defaultPath, createPathInfo } = useCreatePromptValidation({
    cwd,
    mode,
    inputValue: customPath,
    ensureMd,
  });
  // Toast/notice shown when returning to the main menu
  const { notice } = useUiState();

  // Keep index in range when choices change
  useEffect(() => {
    if (index >= choices.length) {
      dispatch(actions.setIndex(Math.max(0, choices.length - 1)));
    }
  }, [choices, index, dispatch]);


  // (validation effect now handled by useCreatePromptValidation)

  useInput((input: string, key: any) => {
    if (mode === 'select') {
      if (key.upArrow) dispatch(actions.setIndex(index > 0 ? index - 1 : choices.length - 1));
      else if (key.downArrow) dispatch(actions.setIndex((index + 1) % Math.max(choices.length || 1, 1)));
      else if (key.return) handleSelect();
      else if (input === 'r') void refreshChoices();
      else if (input === 'q' || key.escape) exit();
    } else if (mode === 'custom-path') {
      if (key.escape) { dispatch(actions.setMode('select')); dispatch(actions.setCustomPath('')); }
    } else if (mode === 'enter-prompt') {
      if (key.escape) { dispatch(actions.setMode('select')); dispatch(actions.setUserPrompt('')); }
    } else if (mode === 'summary') {
      if (input === 'q' || key.escape) exit();
      if (key.return) { dispatch(actions.setMode('select')); dispatch(actions.setLastResult(null)); dispatch(actions.setMessage('')); }
    }
  });

  const handleSelect = async () => {
    const choice = choices[index];
    if (!choice) return;
    if (choice.value === '__custom__') {
      dispatch(actions.setMode('custom-path'));
      return;
    }
    if (choice.value === '__create_prompt__') {
      dispatch(actions.setMode('create-prompt'));
      return;
    }
    await runPipeline(choice.value);
  };

  const runPipeline = async (selectedPath: string) => {
    const exists = await fs.stat(selectedPath).then((s) => s.isFile()).catch(() => false);
    if (!exists) {
      dispatch(actions.setStatus('error'));
      dispatch(actions.setMessage(chalk.red(`Pipeline not found: ${selectedPath}`)));
      dispatch(actions.setMode('summary'));
      return;
    }
    try {
      dispatch(actions.setStatus('loading'));
      dispatch(actions.setMessage(chalk.gray(`Loading pipeline: ${selectedPath}`)));
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(selectedPath);
      const needsPrompt = detectNeedsPrompt(pipeline);
      if (needsPrompt && !userPrompt) {
        // Switch to prompt input first
        dispatch(actions.setMode('enter-prompt'));
        // Stash selected path in message to re-use
        dispatch(actions.setMessage(selectedPath));
        dispatch(actions.setStatus('idle'));
        return;
      }
      dispatch(actions.setMode('running'));
      const { success } = await executePipeline(pipeline, { cwd, userPrompt: userPrompt || undefined });
      dispatch(actions.setLastResult(success));
      dispatch(actions.setStatus(success ? 'success' : 'error'));
      dispatch(actions.setMessage(success ? chalk.green('✔ Pipeline completed') : chalk.red('✖ Pipeline failed')));
      dispatch(actions.setMode('summary'));
    } catch (err: any) {
      dispatch(actions.setLastResult(false));
      dispatch(actions.setStatus('error'));
      dispatch(actions.setMessage(chalk.red(err?.message || String(err))));
      dispatch(actions.setMode('summary'));
    }
  };

  // When in prompt mode, pressing Enter should proceed to run pipeline with stored path
  const onSubmitPrompt = async () => {
    const pathToRun = message && !message.startsWith('\u001b') ? message : undefined;
    if (pathToRun) {
      await runPipeline(pathToRun);
    } else {
      dispatch(actions.setMode('select'));
    }
  };

  const header = (
    <Box>
      <Text bold>Agent Pipeline</Text>
      <Spacer />
      <Text dimColor>q: quit</Text>
    </Box>
  );

  if (mode === 'create-prompt') {
    return (
      <CreatePromptScreen
        header={header}
        defaultPath={defaultPath}
        value={customPath}
        createPathInfo={createPathInfo}
        onChange={(v: string) => dispatch(actions.setCustomPath(v))}
        onBack={() => { dispatch(actions.setCustomPath('')); dispatch(actions.setMode('select')); }}
        onSubmit={async (val: string) => {
          const typed = (val.trim() || defaultPath);
          const normalized = ensureMd(typed);
          const absPath = path.resolve(cwd, normalized);
          const exists = await fs.stat(absPath).then((s) => s.isFile()).catch(() => false);
          if (exists) {
            return;
          }
          const result = await createPrompt({ cwd, input: normalized, openInEditor: true });
          const rel = path.relative(cwd, result.filePath) || result.filePath;
          const abs = path.resolve(result.filePath);
          dispatch(actions.setNotice({ text: `Prompt created: ${rel} (also at ${abs})`, color: 'green' }));
          dispatch(actions.setCustomPath(''));
          dispatch(actions.setMode('select'));
        }}
      />
    );
  }

  if (mode === 'custom-path') {
    return (
      <CustomPathScreen
        header={header}
        value={customPath}
        onChange={(v: string) => dispatch(actions.setCustomPath(v))}
        onBack={() => { dispatch(actions.setMode('select')); dispatch(actions.setCustomPath('')); }}
        onSubmit={(val: string) => {
          const abs = path.resolve(cwd, val.trim());
          dispatch(actions.setCustomPath(''));
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
        onChange={(v: string) => dispatch(actions.setUserPrompt(v))}
        onBack={() => { dispatch(actions.setMode('select')); dispatch(actions.setUserPrompt('')); }}
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
