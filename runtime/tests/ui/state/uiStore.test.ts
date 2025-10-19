import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  actions,
  reducer,
  type UIAction,
} from '../../../src/cli/ui/state/uiStore.js';

describe('uiStore', () => {
  const initialState = createInitialState({ cwd: '/test' });

  describe('createInitialState', () => {
    it('should create initial state with correct defaults', () => {
      const state = createInitialState({ cwd: '/test/project' });

      expect(state).toEqual({
        cwd: '/test/project',
        mode: 'main-menu',
        index: 0,
        customPath: '',
        userPrompt: '',
        message: '',
        status: 'idle',
        lastResultSuccess: null,
        notice: null,
        scrollOffset: 0,
      });
    });
  });

  describe('reducer', () => {
    describe('navigation actions', () => {
      it('should handle NAVIGATE_UP', () => {
        const state = { ...initialState, index: 2 };
        const action: UIAction = actions.navigateUp();

        const newState = reducer(state, action);
        expect(newState.index).toBe(1);
      });

      it('should handle NAVIGATE_UP at index 0', () => {
        const state = { ...initialState, index: 0 };
        const action: UIAction = actions.navigateUp();

        const newState = reducer(state, action);
        expect(newState.index).toBe(0); // Should not go below 0
      });

      it('should handle NAVIGATE_DOWN', () => {
        const state = { ...initialState, index: 0 };
        const action: UIAction = actions.navigateDown(5);

        const newState = reducer(state, action);
        expect(newState.index).toBe(1);
      });

      it('should handle NAVIGATE_DOWN at max index', () => {
        const state = { ...initialState, index: 4 };
        const action: UIAction = actions.navigateDown(4);

        const newState = reducer(state, action);
        expect(newState.index).toBe(0); // Wraps to 0 when at max
      });
      it('should handle NAVIGATE_TO_MAIN_MENU', () => {
        const state = { ...initialState, mode: 'select' as const };
        const action: UIAction = actions.navigateToMainMenu();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('main-menu');
        expect(newState.index).toBe(0);
        expect(newState.notice).toBe(null);
      });

      it('should handle NAVIGATE_TO_SELECT_PIPELINE', () => {
        const state = { ...initialState, mode: 'main-menu' as const };
        const action: UIAction = actions.navigateToSelectPipeline();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('select');
        expect(newState.index).toBe(0);
      });

      it('should handle NAVIGATE_TO_ENTER_PROMPT', () => {
        const state = { ...initialState };
        const action: UIAction = actions.navigateToEnterPrompt('/test/pipeline.yaml');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('enter-prompt');
        expect(newState.userPrompt).toBe('');
      });

      it('should handle RETURN_FROM_SCREEN', () => {
        const state = { ...initialState, mode: 'custom-path' as const };
        const action: UIAction = actions.returnFromScreen();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('select');
        expect(newState.customPath).toBe('');
        expect(newState.userPrompt).toBe('');
      });
    });

    describe('input actions', () => {
      it('should handle INPUT_CHANGED for customPath', () => {
        const state = { ...initialState };
        const action: UIAction = actions.inputChanged('customPath', '/new/path');

        const newState = reducer(state, action);
        expect(newState.customPath).toBe('/new/path');
      });

      it('should handle INPUT_CHANGED for userPrompt', () => {
        const state = { ...initialState };
        const action: UIAction = actions.inputChanged('userPrompt', 'New prompt text');

        const newState = reducer(state, action);
        expect(newState.userPrompt).toBe('New prompt text');
      });

      it('should handle SCROLL_UP', () => {
        const state = { ...initialState, scrollOffset: 5 };
        const action: UIAction = actions.scrollUp();

        const newState = reducer(state, action);
        expect(newState.scrollOffset).toBe(4);
      });

      it('should handle SCROLL_UP at minimum', () => {
        const state = { ...initialState, scrollOffset: 0 };
        const action: UIAction = actions.scrollUp();

        const newState = reducer(state, action);
        expect(newState.scrollOffset).toBe(0); // Should not go below 0
      });

      it('should handle SCROLL_DOWN', () => {
        const state = { ...initialState, scrollOffset: 0 };
        const action: UIAction = actions.scrollDown();

        const newState = reducer(state, action);
        expect(newState.scrollOffset).toBe(1);
      });
    });

    describe('pipeline lifecycle actions', () => {
      it('should handle PIPELINE_LOADING_STARTED', () => {
        const state = { ...initialState };
        const action: UIAction = actions.pipelineLoadingStarted('/test/pipeline.yaml');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('running');
        expect(newState.status).toBe('loading');
        expect(newState.message).toBe('Loading pipeline: /test/pipeline.yaml');
      });

      it('should handle PIPELINE_EXECUTION_STARTED', () => {
        const state = { ...initialState };
        const action: UIAction = actions.pipelineExecutionStarted();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('running');
        expect(newState.status).toBe('loading');
        // The actual reducer doesn't set a message for this action
      });
      it('should handle PIPELINE_COMPLETED with success', () => {
        const state = { ...initialState, mode: 'running' as const };
        const action: UIAction = actions.pipelineCompleted(true, 'Pipeline completed successfully');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('summary');
        expect(newState.status).toBe('success');
        expect(newState.message).toBe('Pipeline completed successfully');
        expect(newState.lastResultSuccess).toBe(true);
        expect(newState.scrollOffset).toBe(0);
        // The actual reducer doesn't set notice for PIPELINE_COMPLETED
      });
      it('should handle PIPELINE_COMPLETED with failure', () => {
        const state = { ...initialState, mode: 'running' as const };
        const action: UIAction = actions.pipelineCompleted(false, 'Pipeline failed');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('summary');
        expect(newState.status).toBe('error');
        expect(newState.message).toBe('Pipeline failed');
        expect(newState.lastResultSuccess).toBe(false);
        expect(newState.scrollOffset).toBe(0);
        // The actual reducer doesn't set notice for PIPELINE_COMPLETED
      });
      it('should handle PIPELINE_FAILED', () => {
        const state = { ...initialState, mode: 'running' as const };
        const action: UIAction = actions.pipelineFailed('Network error');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('summary');
        expect(newState.status).toBe('error');
        expect(newState.message).toBe('Network error');
        expect(newState.lastResultSuccess).toBe(false);
      });

      it('should handle PIPELINE_NOT_FOUND', () => {
        const state = { ...initialState };
        const action: UIAction = actions.pipelineNotFound('/missing/pipeline.yaml');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('summary');
        expect(newState.status).toBe('error');
        expect(newState.message).toBe('Pipeline not found: /missing/pipeline.yaml');
        expect(newState.lastResultSuccess).toBe(false);
      });
    });

    describe('prompt lifecycle actions', () => {
      it('should handle PROMPT_CREATED', () => {
        const state = { ...initialState };
        const action: UIAction = actions.promptCreated('/test/prompts/new.md', 'prompts/new.md');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('main-menu');
        expect(newState.index).toBe(0);
        expect(newState.customPath).toBe('');
        expect(newState.notice).toEqual({
          text: 'Prompt created: prompts/new.md (also at /test/prompts/new.md)',
          color: 'green',
        });
      });
      it('should handle PROMPT_EXECUTION_STARTED', () => {
        const state = { ...initialState };
        const action: UIAction = actions.promptExecutionStarted('/test/prompt.md');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('running');
        expect(newState.status).toBe('loading');
        expect(newState.message).toBe('Running prompt: /test/prompt.md');
      });
      it('should handle PROMPT_EXECUTION_COMPLETED', () => {
        const state = { ...initialState, mode: 'running' as const };
        const action: UIAction = actions.promptExecutionCompleted(
          true,
          'Prompt executed successfully',
        );

        const newState = reducer(state, action);
        expect(newState.mode).toBe('summary');
        expect(newState.status).toBe('success');
        expect(newState.message).toBe('Prompt executed successfully');
        expect(newState.lastResultSuccess).toBe(true);
      });
    });

    describe('system actions', () => {
      it('should handle CHOICES_CHANGED', () => {
        const state = { ...initialState, index: 5 };
        const action: UIAction = actions.choicesChanged(3);

        const newState = reducer(state, action);
        expect(newState.index).toBe(2); // Should clamp to new length - 1
      });

      it('should handle CHOICES_CHANGED with empty list', () => {
        const state = { ...initialState, index: 5 };
        const action: UIAction = actions.choicesChanged(0);

        const newState = reducer(state, action);
        expect(newState.index).toBe(0); // Should reset to 0
      });

      it('should handle NOTICE_DISMISSED', () => {
        const state = {
          ...initialState,
          notice: { text: 'Test notice', color: 'green' as const },
        };
        const action: UIAction = actions.noticeDismissed();

        const newState = reducer(state, action);
        expect(newState.notice).toBe(null);
      });
    });

    describe('unknown actions', () => {
      it('should return unchanged state for unknown actions', () => {
        const state = { ...initialState };
        // @ts-expect-error Testing unknown action
        const action = { type: 'UNKNOWN_ACTION' } as UIAction;

        const newState = reducer(state, action);
        expect(newState).toBe(state); // Should return exact same reference
      });
    });
  });

  describe('action creators', () => {
    it('should create correct navigation actions', () => {
      expect(actions.navigateUp()).toEqual({ type: 'NAVIGATE_UP' });
      expect(actions.navigateDown(5)).toEqual({ type: 'NAVIGATE_DOWN', maxIndex: 5 });
      expect(actions.navigateToMainMenu()).toEqual({ type: 'NAVIGATE_TO_MAIN_MENU' });
    });

    it('should create correct input actions', () => {
      expect(actions.inputChanged('customPath', '/test')).toEqual({
        type: 'INPUT_CHANGED',
        field: 'customPath',
        value: '/test',
      });
      expect(actions.scrollUp()).toEqual({ type: 'SCROLL_UP' });
    });

    it('should create correct pipeline actions', () => {
      expect(actions.pipelineCompleted(true, 'Success')).toEqual({
        type: 'PIPELINE_COMPLETED',
        success: true,
        message: 'Success',
      });
      expect(actions.pipelineFailed('Error')).toEqual({
        type: 'PIPELINE_FAILED',
        error: 'Error',
      });
    });
  });
});
