import React, {createContext, useContext, useReducer} from 'react';

// Shared UI mode across screens
export type Mode = 'main-menu' | 'select' | 'custom-path' | 'enter-prompt' | 'running' | 'summary' | 'create-prompt';

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
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_CUSTOM_PATH'; value: string }
  | { type: 'SET_USER_PROMPT'; value: string }
  | { type: 'SET_MESSAGE'; value: string }
  | { type: 'SET_STATUS'; value: UIStatus }
  | { type: 'SET_LAST_RESULT'; value: boolean | null }
  | { type: 'SET_NOTICE'; value: Notice }
  | { type: 'SET_SCROLL_OFFSET'; value: number };

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

function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_INDEX':
      return { ...state, index: action.index };
    case 'SET_CUSTOM_PATH':
      return { ...state, customPath: action.value };
    case 'SET_USER_PROMPT':
      return { ...state, userPrompt: action.value };
    case 'SET_MESSAGE':
      return { ...state, message: action.value };
    case 'SET_STATUS':
      return { ...state, status: action.value };
    case 'SET_LAST_RESULT':
      return { ...state, lastResultSuccess: action.value };
    case 'SET_NOTICE':
      return { ...state, notice: action.value };
    case 'SET_SCROLL_OFFSET':
      return { ...state, scrollOffset: action.value };
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

// Convenience setters
export const actions = {
  setMode: (mode: Mode): UIAction => ({ type: 'SET_MODE', mode }),
  setIndex: (index: number): UIAction => ({ type: 'SET_INDEX', index }),
  setCustomPath: (value: string): UIAction => ({ type: 'SET_CUSTOM_PATH', value }),
  setUserPrompt: (value: string): UIAction => ({ type: 'SET_USER_PROMPT', value }),
  setMessage: (value: string): UIAction => ({ type: 'SET_MESSAGE', value }),
  setStatus: (value: UIStatus): UIAction => ({ type: 'SET_STATUS', value }),
  setLastResult: (value: boolean | null): UIAction => ({ type: 'SET_LAST_RESULT', value }),
  setNotice: (value: Notice): UIAction => ({ type: 'SET_NOTICE', value }),
  setScrollOffset: (value: number): UIAction => ({ type: 'SET_SCROLL_OFFSET', value }),
};
