import React, {createContext, useContext, useReducer} from 'react';

// Shared UI mode across screens
export type Mode = 'main-menu' | 'select' | 'custom-path' | 'enter-prompt' | 'running' | 'summary' | 'create-prompt' | 'select-prompt';

export type Notice = { text: string; color?: 'green' | 'red' | 'yellow' } | null;

export type UIStatus = 'idle' | 'loading' | 'success' | 'error';

export type UIState = {
  cwd: string;
  mode: Mode;
  index: number;
  customPath: string;
  userPrompt: string;
  message: string;
  status: UIStatus;
  lastResultSuccess: boolean | null;
  notice: Notice;
  scrollOffset: number;
};

export type UIAction =
  // Navigation events
  | { type: 'NAVIGATE_UP' }
  | { type: 'NAVIGATE_DOWN'; maxIndex: number }
  | { type: 'NAVIGATE_TO_MAIN_MENU' }
  | { type: 'NAVIGATE_TO_SELECT_PIPELINE' }
  | { type: 'NAVIGATE_TO_SELECT_PROMPT' }
  | { type: 'NAVIGATE_TO_CREATE_PROMPT' }
  | { type: 'NAVIGATE_TO_CUSTOM_PATH' }
  | { type: 'NAVIGATE_TO_ENTER_PROMPT'; pipelinePath: string }
  | { type: 'RETURN_FROM_SCREEN' }
  // Input events
  | { type: 'INPUT_CHANGED'; field: 'customPath' | 'userPrompt'; value: string }
  | { type: 'SCROLL_UP' }
  | { type: 'SCROLL_DOWN' }
  // Pipeline lifecycle events
  | { type: 'PIPELINE_LOADING_STARTED'; path: string }
  | { type: 'PIPELINE_EXECUTION_STARTED' }
  | { type: 'PIPELINE_COMPLETED'; success: boolean; message: string }
  | { type: 'PIPELINE_FAILED'; error: string }
  | { type: 'PIPELINE_NOT_FOUND'; path: string }
  // Prompt events
  | { type: 'PROMPT_CREATED'; filePath: string; relativePath: string }
  | { type: 'PROMPT_SUBMITTED' }
  | { type: 'PROMPT_EXECUTION_STARTED'; path: string }
  | { type: 'PROMPT_EXECUTION_COMPLETED'; success: boolean; message: string }
  | { type: 'PROMPT_EXECUTION_FAILED'; error: string }
  // System events
  | { type: 'CHOICES_CHANGED'; newLength: number }
  | { type: 'NOTICE_DISMISSED' };

export function createInitialState(params: { cwd: string }): UIState {
  return {
    cwd: params.cwd,
    mode: 'main-menu',
    index: 0,
    customPath: '',
    userPrompt: '',
    message: '',
    status: 'idle',
    lastResultSuccess: null,
    notice: null,
    scrollOffset: 0,
  };
}

export function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    // Navigation
    case 'NAVIGATE_UP':
      return { ...state, index: state.index > 0 ? state.index - 1 : state.index };
    case 'NAVIGATE_DOWN':
      return { ...state, index: state.index < action.maxIndex ? state.index + 1 : 0 };
    case 'NAVIGATE_TO_MAIN_MENU':
      return { ...state, mode: 'main-menu', index: 0, notice: null, customPath: '', userPrompt: '' };
    case 'NAVIGATE_TO_SELECT_PIPELINE':
      return { ...state, mode: 'select', index: 0, notice: null };
    case 'NAVIGATE_TO_SELECT_PROMPT':
      return { ...state, mode: 'select-prompt', index: 0, notice: null };
    case 'NAVIGATE_TO_CREATE_PROMPT':
      return { ...state, mode: 'create-prompt', customPath: '' };
    case 'NAVIGATE_TO_CUSTOM_PATH':
      return { ...state, mode: 'custom-path', customPath: '' };
    case 'NAVIGATE_TO_ENTER_PROMPT':
      return { ...state, mode: 'enter-prompt', message: action.pipelinePath, status: 'idle' };
    case 'RETURN_FROM_SCREEN':
      return { ...state, mode: 'select', customPath: '', userPrompt: '' };
    
    // Input
    case 'INPUT_CHANGED':
      return { ...state, [action.field]: action.value };
    case 'SCROLL_UP':
      return { ...state, scrollOffset: Math.max(0, state.scrollOffset - 1) };
    case 'SCROLL_DOWN':
      return { ...state, scrollOffset: state.scrollOffset + 1 };
    
    // Pipeline lifecycle
    case 'PIPELINE_LOADING_STARTED':
      return { ...state, mode: 'running', status: 'loading', message: `Loading pipeline: ${action.path}` };
    case 'PIPELINE_EXECUTION_STARTED':
      return { ...state, mode: 'running', status: 'loading' };
    case 'PIPELINE_COMPLETED':
      return { ...state, mode: 'summary', status: action.success ? 'success' : 'error', message: action.message, lastResultSuccess: action.success, scrollOffset: 0 };
    case 'PIPELINE_FAILED':
      return { ...state, mode: 'summary', status: 'error', message: action.error, lastResultSuccess: false };
    case 'PIPELINE_NOT_FOUND':
      return { ...state, mode: 'summary', status: 'error', message: `Pipeline not found: ${action.path}`, lastResultSuccess: false };
    
    // Prompts
    case 'PROMPT_CREATED':
      return { ...state, mode: 'main-menu', index: 0, customPath: '', notice: { text: `Prompt created: ${action.relativePath} (also at ${action.filePath})`, color: 'green' } };
    case 'PROMPT_SUBMITTED':
      return { ...state, userPrompt: '' };
    case 'PROMPT_EXECUTION_STARTED':
      return { ...state, mode: 'running', status: 'loading', message: `Running prompt: ${action.path}` };
    case 'PROMPT_EXECUTION_COMPLETED':
      return { ...state, mode: 'summary', status: action.success ? 'success' : 'error', message: action.message, lastResultSuccess: action.success, scrollOffset: 0 };
    case 'PROMPT_EXECUTION_FAILED':
      return { ...state, mode: 'summary', status: 'error', message: action.error, lastResultSuccess: false };
    
    // System
    case 'CHOICES_CHANGED':
      return { ...state, index: Math.min(state.index, Math.max(0, action.newLength - 1)) };
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
  navigateUp: (): UIAction => ({ type: 'NAVIGATE_UP' }),
  navigateDown: (maxIndex: number): UIAction => ({ type: 'NAVIGATE_DOWN', maxIndex }),
  navigateToMainMenu: (): UIAction => ({ type: 'NAVIGATE_TO_MAIN_MENU' }),
  navigateToSelectPipeline: (): UIAction => ({ type: 'NAVIGATE_TO_SELECT_PIPELINE' }),
  navigateToSelectPrompt: (): UIAction => ({ type: 'NAVIGATE_TO_SELECT_PROMPT' }),
  navigateToCreatePrompt: (): UIAction => ({ type: 'NAVIGATE_TO_CREATE_PROMPT' }),
  navigateToCustomPath: (): UIAction => ({ type: 'NAVIGATE_TO_CUSTOM_PATH' }),
  navigateToEnterPrompt: (pipelinePath: string): UIAction => ({ type: 'NAVIGATE_TO_ENTER_PROMPT', pipelinePath }),
  returnFromScreen: (): UIAction => ({ type: 'RETURN_FROM_SCREEN' }),
  
  // Input
  inputChanged: (field: 'customPath' | 'userPrompt', value: string): UIAction => ({ type: 'INPUT_CHANGED', field, value }),
  scrollUp: (): UIAction => ({ type: 'SCROLL_UP' }),
  scrollDown: (): UIAction => ({ type: 'SCROLL_DOWN' }),
  
  // Pipeline lifecycle
  pipelineLoadingStarted: (path: string): UIAction => ({ type: 'PIPELINE_LOADING_STARTED', path }),
  pipelineExecutionStarted: (): UIAction => ({ type: 'PIPELINE_EXECUTION_STARTED' }),
  pipelineCompleted: (success: boolean, message: string): UIAction => ({ type: 'PIPELINE_COMPLETED', success, message }),
  pipelineFailed: (error: string): UIAction => ({ type: 'PIPELINE_FAILED', error }),
  pipelineNotFound: (path: string): UIAction => ({ type: 'PIPELINE_NOT_FOUND', path }),
  
  // Prompts
  promptCreated: (filePath: string, relativePath: string): UIAction => ({ type: 'PROMPT_CREATED', filePath, relativePath }),
  promptSubmitted: (): UIAction => ({ type: 'PROMPT_SUBMITTED' }),
  promptExecutionStarted: (path: string): UIAction => ({ type: 'PROMPT_EXECUTION_STARTED', path }),
  promptExecutionCompleted: (success: boolean, message: string): UIAction => ({ type: 'PROMPT_EXECUTION_COMPLETED', success, message }),
  promptExecutionFailed: (error: string): UIAction => ({ type: 'PROMPT_EXECUTION_FAILED', error }),
  
  // System
  choicesChanged: (newLength: number): UIAction => ({ type: 'CHOICES_CHANGED', newLength }),
  noticeDismissed: (): UIAction => ({ type: 'NOTICE_DISMISSED' }),
};
