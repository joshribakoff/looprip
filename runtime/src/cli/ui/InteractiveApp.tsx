import React, { useEffect } from 'react';
import { Box, Text, useInput, useApp, Spacer } from 'ink';
import path from 'path';
import fs from 'fs/promises';
import { PipelineParser } from '../../core/parser.js';
import MainMenuScreen, { MAIN_MENU_CHOICES } from './screens/MainMenuScreen.js';
import SelectScreen from './screens/SelectScreen.js';
import SelectPromptScreen from './screens/SelectPromptScreen.js';
import StatusScreen from './screens/StatusScreen.js';
import CustomPathScreen from './screens/CustomPathScreen.js';
import EnterPromptScreen from './screens/EnterPromptScreen.js';
import CreatePromptScreen from './screens/CreatePromptScreen.js';
import JobListScreen from './screens/JobListScreen.js';
import JobDetailScreen from './screens/JobDetailScreen.js';
import { usePipelineDiscovery } from './hooks/usePipelineDiscovery.js';
import { usePromptDiscovery } from './hooks/usePromptDiscovery.js';
// Removed unused pipeline/prompt runner hooks in favor of background job manager
import { useJobManager } from './hooks/useJobManager.js';
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
  const { exit } = useApp();
  const cwd = process.cwd();
  const { choices, refreshChoices } = usePipelineDiscovery(cwd);
  const { choices: promptChoices, refreshChoices: refreshPromptChoices } = usePromptDiscovery(cwd);
  const {
    mode,
    index,
    customPath,
    userPrompt,
    message,
    status,
    lastResultSuccess,
    scrollOffset,
    jobs,
    selectedJobId,
  } = useUiState();
  const dispatch = useUiDispatch();
  const { logger: _logger } = useInkLogger();
  const { queueJob, queuePrompt, resumeJob, getLogPaths } = useJobManager();
  // Toast/notice shown when returning to the main menu
  const { notice } = useUiState();

  // Keep index in range when choices change
  useEffect(() => {
    if (mode === 'select') {
      dispatch(actions.choicesChanged(choices.length));
    } else if (mode === 'select-prompt') {
      dispatch(actions.choicesChanged(promptChoices.length));
    }
  }, [choices.length, promptChoices.length, mode, dispatch]);

  const handleMainMenuSelect = () => {
    const choice = MAIN_MENU_CHOICES[index];
    if (!choice) return;
    if (choice.value === 'quit') {
      exit();
    } else if (choice.value === 'run-pipeline') {
      dispatch(actions.navigateToSelectPipeline());
    } else if (choice.value === 'run-prompt') {
      dispatch(actions.navigateToSelectPrompt());
    } else if (choice.value === 'view-jobs') {
      dispatch(actions.navigateToJobList());
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
    } else if (mode === 'select-prompt') {
      if (key.upArrow) dispatch(actions.navigateUp());
      else if (key.downArrow) dispatch(actions.navigateDown(promptChoices.length - 1));
      else if (key.return) handlePromptSelect();
      else if (input === 'r') void refreshPromptChoices();
      else if (input === 'q' || key.escape) dispatch(actions.navigateToMainMenu());
    } else if (mode === 'job-list') {
      if (key.upArrow) dispatch(actions.navigateUp());
      else if (key.downArrow) dispatch(actions.navigateDown(jobs.length - 1));
      else if (key.return) handleJobListSelect();
      else if (key.escape) dispatch(actions.navigateToMainMenu());
    } else if (mode === 'job-detail') {
      if (key.upArrow) dispatch(actions.scrollUp());
      else if (key.downArrow) dispatch(actions.scrollDown());
      else if (input === 'f') dispatch(actions.toggleAutoFollow());
      else if (input === 'r') handleResumeJob();
      else if (input === 'n') handleStartFreshJob();
      else if (key.escape) dispatch(actions.navigateToJobList());
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

  const handlePromptSelect = async () => {
    const choice = promptChoices[index];
    if (!choice) return;
    await runPrompt(choice.value);
  };

  const handleJobListSelect = () => {
    const job = jobs[index];
    if (!job) return;
    dispatch(actions.navigateToJobDetail(job.run.id));
  };

  const handleResumeJob = async () => {
    if (!selectedJobId) return;
    const job = jobs.find((j) => j.run.id === selectedJobId);
    if (!job) return;
    if (job.run.status !== 'failed' && job.run.status !== 'interrupted') return;

    try {
      await resumeJob(selectedJobId);
      // Job will be updated via the polling mechanism
    } catch (err: any) {
      // Could show an error notice
      console.error('Failed to resume job:', err);
    }
  };

  const handleStartFreshJob = async () => {
    if (!selectedJobId) return;
    const job = jobs.find((j) => j.run.id === selectedJobId);
    if (!job) return;
    if (job.run.status !== 'failed' && job.run.status !== 'interrupted') return;

    try {
      // Queue a new job with the same pipeline and prompt
      await queueJob(job.run.pipelinePath, job.run.pipelineName, job.run.userPrompt);
      dispatch(actions.navigateToJobList());
    } catch (err: any) {
      console.error('Failed to start fresh job:', err);
    }
  };

  const runPipeline = async (selectedPath: string) => {
    const exists = await fs
      .stat(selectedPath)
      .then((s) => s.isFile())
      .catch(() => false);
    if (!exists) {
      dispatch(actions.pipelineNotFound(selectedPath));
      return;
    }
    try {
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(selectedPath);
      const needsPrompt = detectNeedsPrompt(pipeline);
      if (needsPrompt && !userPrompt) {
        dispatch(actions.navigateToEnterPrompt(selectedPath));
        return;
      }

      // Queue the job to run in the background
      const pipelineName = pipeline.name || path.basename(selectedPath, '.yaml');
      const runId = await queueJob(selectedPath, pipelineName, userPrompt || undefined);

      // Navigate straight to the job detail with live logs; user can Esc to see the job list
      dispatch(actions.navigateToJobDetail(runId));
    } catch (err: any) {
      dispatch(actions.pipelineFailed(err?.message || String(err)));
    }
  };

  const runPrompt = async (selectedPath: string) => {
    try {
      // Queue prompt as a background job and navigate to job list
      const promptName = path.basename(selectedPath);
      const runId = await queuePrompt(selectedPath, promptName);
      // Go to the job detail to show live logs immediately
      dispatch(actions.navigateToJobDetail(runId));
    } catch (err: any) {
      dispatch(actions.promptExecutionFailed(err?.message || String(err)));
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

  const wrapInBorder = (content: React.ReactNode) => (
    <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
      {content}
    </Box>
  );

  if (mode === 'main-menu') {
    return wrapInBorder(<MainMenuScreen header={header} index={index} notice={notice} />);
  }

  if (mode === 'create-prompt') {
    return wrapInBorder(<CreatePromptScreen header={header} />);
  }

  if (mode === 'select-prompt') {
    return wrapInBorder(
      <SelectPromptScreen header={header} choices={promptChoices} index={index} notice={notice} />,
    );
  }

  if (mode === 'custom-path') {
    return wrapInBorder(
      <CustomPathScreen
        header={header}
        value={customPath}
        onChange={(v: string) => dispatch(actions.inputChanged('customPath', v))}
        onBack={() => dispatch(actions.returnFromScreen())}
        onSubmit={(val: string) => {
          const abs = path.resolve(cwd, val.trim());
          void runPipeline(abs);
        }}
      />,
    );
  }

  if (mode === 'enter-prompt') {
    return wrapInBorder(
      <EnterPromptScreen
        header={header}
        value={userPrompt}
        onChange={(v: string) => dispatch(actions.inputChanged('userPrompt', v))}
        onBack={() => dispatch(actions.returnFromScreen())}
        onSubmit={() => onSubmitPrompt()}
      />,
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
        scrollOffset={scrollOffset}
      />,
    );
  }

  if (mode === 'job-list') {
    return wrapInBorder(<JobListScreen header={header} jobs={jobs} index={index} />);
  }

  if (mode === 'job-detail') {
    const job = jobs.find((j) => j.run.id === selectedJobId);
    if (!job) {
      return wrapInBorder(
        <Box flexDirection="column">
          {header}
          <Box marginTop={1}>
            <Text color="red">Job not found</Text>
          </Box>
        </Box>,
      );
    }
    const logPaths = getLogPaths(job.run.id);
    return wrapInBorder(
      <JobDetailScreen
        header={header}
        job={job}
        scrollOffset={scrollOffset}
        logFilePaths={logPaths}
      />,
    );
  }

  // Select mode
  return wrapInBorder(
    <SelectScreen header={header} choices={choices} index={index} notice={notice} />,
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
