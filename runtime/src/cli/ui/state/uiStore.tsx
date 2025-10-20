import React, { createContext, useContext, useReducer } from 'react';
import { RunMetadata } from '../../../types/run.js';

// Shared UI mode across screens
export type Mode =
  | 'main-menu'
  | 'select'
  | 'custom-path'
  | 'enter-prompt'
  | 'running'
  | 'summary'
  | 'create-prompt'
  | 'select-prompt'
  | 'job-list'
  | 'job-detail';

export type Notice = { text: string; color?: 'green' | 'red' | 'yellow' } | null;

export type UIStatus = 'idle' | 'loading' | 'success' | 'error';

export interface JobInfo {
  run: RunMetadata;
  logLines: string[];
  autoFollow: boolean;
}

export type UIState = {
  cwd: string;
  mode: Mode;
  message: string;
  status: UIStatus;
  lastResultSuccess: boolean | null;
  notice: Notice;
  // The pipeline path currently awaiting a prompt, if any
  pendingPipelinePath?: string;
  // Job management state
  scrollOffset: number;
  jobs: JobInfo[];
  selectedJobId: string | null;
  index: number;
  // Input field state
  customPath: string;
  userPrompt: string;
};

export type UIAction =
  // Navigation events
  | { type: 'NAVIGATE_TO_MAIN_MENU' }
  | { type: 'NAVIGATE_TO_SELECT_PIPELINE' }
  | { type: 'NAVIGATE_TO_SELECT_PROMPT' }
  | { type: 'NAVIGATE_TO_CREATE_PROMPT' }
  | { type: 'NAVIGATE_TO_CUSTOM_PATH' }
  | { type: 'NAVIGATE_TO_ENTER_PROMPT'; pipelinePath: string }
  | { type: 'NAVIGATE_TO_JOB_LIST' }
  | { type: 'NAVIGATE_TO_JOB_DETAIL'; jobId: string }
  | { type: 'RETURN_FROM_SCREEN' }
  // Input events
  | { type: 'INPUT_CHANGED'; field: 'customPath' | 'userPrompt'; value: string }
  // Pipeline lifecycle events
  | { type: 'PIPELINE_LOADING_STARTED'; path: string }
  | { type: 'PIPELINE_EXECUTION_STARTED' }
  | { type: 'PIPELINE_COMPLETED'; success: boolean; message: string }
  | { type: 'PIPELINE_FAILED'; error: string }
  | { type: 'PIPELINE_NOT_FOUND'; path: string }
  // Job events
  | { type: 'JOB_QUEUED'; run: RunMetadata }
  | { type: 'JOB_STARTED'; runId: string }
  | { type: 'JOB_UPDATED'; runId: string; run: RunMetadata; newLogLines?: string[] }
  | { type: 'JOB_COMPLETED'; runId: string; success: boolean }
  | { type: 'JOB_FAILED'; runId: string; error: string }
  | { type: 'JOBS_LOADED'; runs: RunMetadata[] }
  // Prompt events
  | { type: 'PROMPT_CREATED'; filePath: string; relativePath: string }
  | { type: 'PROMPT_EXECUTION_STARTED'; path: string }
  | { type: 'PROMPT_EXECUTION_COMPLETED'; success: boolean; message: string }
  | { type: 'PROMPT_EXECUTION_FAILED'; error: string }
  // System events
  | { type: 'NOTICE_DISMISSED' };

export function createInitialState(params: { cwd: string }): UIState {
  return {
    cwd: params.cwd,
    mode: 'main-menu',
    message: '',
    status: 'idle',
    lastResultSuccess: null,
    notice: null,
    pendingPipelinePath: undefined,
    scrollOffset: 0,
    jobs: [],
    selectedJobId: null,
    index: 0,
    customPath: '',
    userPrompt: '',
  };
}

export function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    // Navigation
    case 'NAVIGATE_TO_MAIN_MENU':
      return {
        ...state,
        mode: 'main-menu',
        notice: null,
        pendingPipelinePath: undefined,
      };
    case 'NAVIGATE_TO_SELECT_PIPELINE':
      return { ...state, mode: 'select', notice: null };
    case 'NAVIGATE_TO_SELECT_PROMPT':
      return { ...state, mode: 'select-prompt', notice: null };
    case 'NAVIGATE_TO_CREATE_PROMPT':
      return { ...state, mode: 'create-prompt' };
    case 'NAVIGATE_TO_CUSTOM_PATH':
      return { ...state, mode: 'custom-path' };
    case 'NAVIGATE_TO_JOB_LIST':
      return { ...state, mode: 'job-list', index: 0, notice: null };
    case 'NAVIGATE_TO_JOB_DETAIL':
      return { ...state, mode: 'job-detail', selectedJobId: action.jobId, scrollOffset: 0 };
    case 'NAVIGATE_TO_ENTER_PROMPT':
      return {
        ...state,
        mode: 'enter-prompt',
        pendingPipelinePath: action.pipelinePath,
        status: 'idle',
      };
    case 'RETURN_FROM_SCREEN':
      return { ...state, mode: 'select', customPath: '', userPrompt: '' };

    // Input
    case 'INPUT_CHANGED':
      return { ...state, [action.field]: action.value };

    // Pipeline lifecycle
    case 'PIPELINE_LOADING_STARTED':
      return {
        ...state,
        mode: 'running',
        status: 'loading',
        message: `Loading pipeline: ${action.path}`,
      };
    case 'PIPELINE_EXECUTION_STARTED':
      return { ...state, mode: 'running', status: 'loading' };
    case 'PIPELINE_COMPLETED':
      return {
        ...state,
        mode: 'summary',
        status: action.success ? 'success' : 'error',
        message: action.message,
        lastResultSuccess: action.success,
      };
    case 'PIPELINE_FAILED':
      return {
        ...state,
        mode: 'summary',
        status: 'error',
        message: action.error,
        lastResultSuccess: false,
      };
    case 'PIPELINE_NOT_FOUND':
      return {
        ...state,
        mode: 'summary',
        status: 'error',
        message: `Pipeline not found: ${action.path}`,
        lastResultSuccess: false,
      };

    // Jobs
    case 'JOB_QUEUED': {
      const newJob: JobInfo = { run: action.run, logLines: [], autoFollow: true };
      return { ...state, jobs: [...state.jobs, newJob] };
    }
    case 'JOB_STARTED':
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.run.id === action.runId ? { ...j, run: { ...j.run, status: 'running' } } : j,
        ),
      };
    case 'JOB_UPDATED': {
      return {
        ...state,
        jobs: state.jobs.map((j) => {
          if (j.run.id === action.runId) {
            const newLogLines = action.newLogLines || [];
            const updatedLogLines = [...j.logLines, ...newLogLines];
            return { ...j, run: action.run, logLines: updatedLogLines };
          }
          return j;
        }),
      };
    }
    case 'JOB_COMPLETED':
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.run.id === action.runId ? { ...j, run: { ...j.run, status: 'completed' } } : j,
        ),
      };
    case 'JOB_FAILED':
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.run.id === action.runId
            ? { ...j, run: { ...j.run, status: 'failed', error: action.error } }
            : j,
        ),
      };
    case 'JOBS_LOADED': {
      const jobs: JobInfo[] = action.runs.map((run) => ({
        run,
        logLines: [],
        autoFollow: false,
      }));
      return { ...state, jobs };
    }

    // Prompts
    case 'PROMPT_CREATED':
      return {
        ...state,
        mode: 'main-menu',
        notice: {
          text: `Prompt created: ${action.relativePath} (also at ${action.filePath})`,
          color: 'green',
        },
      };
    case 'PROMPT_EXECUTION_STARTED':
      return {
        ...state,
        mode: 'running',
        status: 'loading',
        message: `Running prompt: ${action.path}`,
      };
    case 'PROMPT_EXECUTION_COMPLETED':
      return {
        ...state,
        mode: 'summary',
        status: action.success ? 'success' : 'error',
        message: action.message,
        lastResultSuccess: action.success,
      };
    case 'PROMPT_EXECUTION_FAILED':
      return {
        ...state,
        mode: 'summary',
        status: 'error',
        message: action.error,
        lastResultSuccess: false,
      };

    // System
    case 'NOTICE_DISMISSED':
      return { ...state, notice: null };

    default:
      return state;
  }
}

const StateCtx = createContext<UIState | undefined>(undefined);
const DispatchCtx = createContext<React.Dispatch<UIAction> | undefined>(undefined);

export function UIProvider({ cwd, children }: { cwd: string; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState({ cwd }));
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useUiState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useUiState must be used within UIProvider');
  return ctx;
}

export function useUiDispatch() {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error('useUiDispatch must be used within UIProvider');
  return ctx;
}

// Semantic action creators
export const actions = {
  // Navigation
  navigateToMainMenu: (): UIAction => ({ type: 'NAVIGATE_TO_MAIN_MENU' }),
  navigateToSelectPipeline: (): UIAction => ({ type: 'NAVIGATE_TO_SELECT_PIPELINE' }),
  navigateToSelectPrompt: (): UIAction => ({ type: 'NAVIGATE_TO_SELECT_PROMPT' }),
  navigateToCreatePrompt: (): UIAction => ({ type: 'NAVIGATE_TO_CREATE_PROMPT' }),
  navigateToCustomPath: (): UIAction => ({ type: 'NAVIGATE_TO_CUSTOM_PATH' }),
  navigateToEnterPrompt: (pipelinePath: string): UIAction => ({
    type: 'NAVIGATE_TO_ENTER_PROMPT',
    pipelinePath,
  }),
  navigateToJobList: (): UIAction => ({ type: 'NAVIGATE_TO_JOB_LIST' }),
  navigateToJobDetail: (jobId: string): UIAction => ({ type: 'NAVIGATE_TO_JOB_DETAIL', jobId }),
  returnFromScreen: (): UIAction => ({ type: 'RETURN_FROM_SCREEN' }),

  // Input
  inputChanged: (field: 'customPath' | 'userPrompt', value: string): UIAction => ({
    type: 'INPUT_CHANGED',
    field,
    value,
  }),

  // Pipeline lifecycle
  pipelineLoadingStarted: (path: string): UIAction => ({ type: 'PIPELINE_LOADING_STARTED', path }),
  pipelineExecutionStarted: (): UIAction => ({ type: 'PIPELINE_EXECUTION_STARTED' }),
  pipelineCompleted: (success: boolean, message: string): UIAction => ({
    type: 'PIPELINE_COMPLETED',
    success,
    message,
  }),
  pipelineFailed: (error: string): UIAction => ({ type: 'PIPELINE_FAILED', error }),
  pipelineNotFound: (path: string): UIAction => ({ type: 'PIPELINE_NOT_FOUND', path }),

  // Jobs
  jobQueued: (run: RunMetadata): UIAction => ({ type: 'JOB_QUEUED', run }),
  jobStarted: (runId: string): UIAction => ({ type: 'JOB_STARTED', runId }),
  jobUpdated: (runId: string, run: RunMetadata, newLogLines?: string[]): UIAction => ({
    type: 'JOB_UPDATED',
    runId,
    run,
    newLogLines,
  }),
  jobCompleted: (runId: string, success: boolean): UIAction => ({
    type: 'JOB_COMPLETED',
    runId,
    success,
  }),
  jobFailed: (runId: string, error: string): UIAction => ({ type: 'JOB_FAILED', runId, error }),
  jobsLoaded: (runs: RunMetadata[]): UIAction => ({ type: 'JOBS_LOADED', runs }),

  // Prompts
  promptCreated: (filePath: string, relativePath: string): UIAction => ({
    type: 'PROMPT_CREATED',
    filePath,
    relativePath,
  }),
  promptExecutionStarted: (path: string): UIAction => ({ type: 'PROMPT_EXECUTION_STARTED', path }),
  promptExecutionCompleted: (success: boolean, message: string): UIAction => ({
    type: 'PROMPT_EXECUTION_COMPLETED',
    success,
    message,
  }),
  promptExecutionFailed: (error: string): UIAction => ({ type: 'PROMPT_EXECUTION_FAILED', error }),

  // System
  noticeDismissed: (): UIAction => ({ type: 'NOTICE_DISMISSED' }),
};
