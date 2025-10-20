import fs from 'fs/promises';
import { useApp } from 'ink';
import { PipelineParser } from '../../../core/parser.js';
import { useUiDispatch, useUiState, actions } from '../state/uiStore.js';
import { useInkLogger } from '../logger/InkLogger.js';
import { usePipelineRunner } from '../hooks/usePipelineRunner.js';
import { usePromptRunner } from '../hooks/usePromptRunner.js';
import { useJobManager } from '../hooks/useJobManager.js';

function detectNeedsPrompt(pipeline: any): boolean {
  const containsPromptVar = (val: any): boolean => {
    if (typeof val === 'string') return val.includes('{{prompt}}');
    if (Array.isArray(val)) return val.some(containsPromptVar);
    if (val && typeof val === 'object') return Object.values(val).some(containsPromptVar);
    return false;
  };
  return containsPromptVar(pipeline);
}

export function useUiController() {
  const dispatch = useUiDispatch();
  const state = useUiState();
  const { cwd } = state;
  const { exit } = useApp();
  const { logger } = useInkLogger();
  const { executePipeline } = usePipelineRunner(logger);
  const { executePrompt } = usePromptRunner(logger);
  const { getLogPaths } = useJobManager();

  async function ensurePathExists(filePath: string): Promise<boolean> {
    return fs
      .stat(filePath)
      .then((s) => s.isFile())
      .catch(() => false);
  }

  async function runPipelineAt(pathToPipeline: string, userPrompt?: string) {
    const exists = await ensurePathExists(pathToPipeline);
    if (!exists) {
      dispatch(actions.pipelineNotFound(pathToPipeline));
      return;
    }
    try {
      dispatch(actions.pipelineLoadingStarted(pathToPipeline));
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(pathToPipeline);
      const needsPrompt = detectNeedsPrompt(pipeline);
      if (needsPrompt && !userPrompt) {
        dispatch(actions.navigateToEnterPrompt(pathToPipeline));
        return;
      }
      dispatch(actions.pipelineExecutionStarted());
      const { success } = await executePipeline(pipeline, {
        cwd,
        userPrompt: userPrompt || undefined,
      });
      dispatch(
        actions.pipelineCompleted(
          success,
          success ? '✔ Pipeline completed' : '✖ Pipeline failed',
        ),
      );
    } catch (err: any) {
      dispatch(actions.pipelineFailed(err?.message || String(err)));
    }
  }

  async function onMainMenuSelect(value: string) {
    switch (value) {
      case 'quit':
        exit();
        return;
      case 'run-pipeline':
        dispatch(actions.navigateToSelectPipeline());
        return;
      case 'run-prompt':
        dispatch(actions.navigateToSelectPrompt());
        return;
      case 'view-jobs':
        dispatch(actions.navigateToJobList());
        return;
      case 'create-prompt':
        dispatch(actions.navigateToCreatePrompt());
        return;
      default:
        return;
    }
  }

  async function onPipelineSelected(path: string) {
    await runPipelineAt(path);
  }

  async function onCustomPathSubmitted(absPath: string) {
    await runPipelineAt(absPath);
  }

  async function onEnterPromptSubmitted(promptText: string) {
    const pathToRun = state.pendingPipelinePath;
    if (!pathToRun) {
      dispatch(actions.returnFromScreen());
      return;
    }
    await runPipelineAt(pathToRun, promptText);
  }

  async function onPromptSelected(promptPath: string) {
    try {
      dispatch(actions.promptExecutionStarted(promptPath));
      const { success } = await executePrompt(promptPath);
      dispatch(
        actions.promptExecutionCompleted(
          success,
          success ? '✔ Prompt executed successfully' : '✖ Prompt execution failed',
        ),
      );
    } catch (err: any) {
      dispatch(actions.promptExecutionFailed(err?.message || String(err)));
    }
  }

  function onBack() {
    dispatch(actions.returnFromScreen());
  }

  function onBackToMenu() {
    dispatch(actions.navigateToMainMenu());
  }

  return {
    onMainMenuSelect,
    onPipelineSelected,
    onCustomPathSubmitted,
    onEnterPromptSubmitted,
    onPromptSelected,
    onBack,
    onBackToMenu,
    goToCustomPath: () => dispatch(actions.navigateToCustomPath()),
    goToCreatePrompt: () => dispatch(actions.navigateToCreatePrompt()),
    goToMainMenu: () => dispatch(actions.navigateToMainMenu()),
    quit: () => exit(),
    getLogPaths,
  } as const;
}

export default useUiController;
