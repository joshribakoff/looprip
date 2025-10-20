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
        message: '',
        status: 'idle',
        lastResultSuccess: null,
        notice: null,
        pendingPipelinePath: undefined,
      });
    });
  });

  describe('reducer', () => {
    describe('navigation actions', () => {
      it('should handle NAVIGATE_TO_MAIN_MENU', () => {
        const state = { ...initialState, mode: 'select' as const };
        const action: UIAction = actions.navigateToMainMenu();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('main-menu');
        expect(newState.notice).toBe(null);
      });

      it('should handle NAVIGATE_TO_SELECT_PIPELINE', () => {
        const state = { ...initialState, mode: 'main-menu' as const };
        const action: UIAction = actions.navigateToSelectPipeline();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('select');
      });

      it('should handle NAVIGATE_TO_ENTER_PROMPT', () => {
        const state = { ...initialState };
        const action: UIAction = actions.navigateToEnterPrompt('/test/pipeline.yaml');

        const newState = reducer(state, action);
        expect(newState.mode).toBe('enter-prompt');
        expect(newState.pendingPipelinePath).toBe('/test/pipeline.yaml');
      });

      it('should handle RETURN_FROM_SCREEN', () => {
        const state = { ...initialState, mode: 'custom-path' as const };
        const action: UIAction = actions.returnFromScreen();

        const newState = reducer(state, action);
        expect(newState.mode).toBe('select');
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
      expect(actions.navigateToMainMenu()).toEqual({ type: 'NAVIGATE_TO_MAIN_MENU' });
      expect(actions.navigateToSelectPipeline()).toEqual({ type: 'NAVIGATE_TO_SELECT_PIPELINE' });
      expect(actions.navigateToEnterPrompt('/x')).toEqual({
        type: 'NAVIGATE_TO_ENTER_PROMPT',
        pipelinePath: '/x',
      });
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
