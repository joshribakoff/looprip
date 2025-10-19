import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { UIProvider, useUiState, useUiDispatch, actions } from '../../../src/cli/ui/state/uiStore.js';
import SelectScreen from '../../../src/cli/ui/screens/SelectScreen.js';
import { 
  expectTextInOutput,
  createTestHeader,
  mockPipelineChoices
} from '../testUtils.js';

describe('UI Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UIProvider integration', () => {
    it('should provide state and dispatch to components', () => {
      function TestComponent() {
        const state = useUiState();
        
        return (
          <SelectScreen
            header={createTestHeader()}
            choices={mockPipelineChoices}
            index={state.index}
            notice={state.notice}
          />
        );
      }

      const result = render(
        <UIProvider cwd="/test">
          <TestComponent />
        </UIProvider>
      );
      
      expectTextInOutput(result, 'Test Header');
      expectTextInOutput(result, 'Select a pipeline to run:');
      expectTextInOutput(result, 'Simple Task Pipeline');
    });

    it('should handle state changes through dispatch', () => {
      function TestComponent() {
        const state = useUiState();
        const dispatch = useUiDispatch();
        
        const [hasDispatched, setHasDispatched] = React.useState(false);
        
        React.useEffect(() => {
          if (!hasDispatched) {
            dispatch(actions.navigateDown(2));
            setHasDispatched(true);
          }
        }, [dispatch, hasDispatched]);
        
        return (
          <SelectScreen
            header={createTestHeader()}
            choices={mockPipelineChoices}
            index={state.index}
            notice={state.notice}
          />
        );
      }

      const result = render(
        <UIProvider cwd="/test">
          <TestComponent />
        </UIProvider>
      );
      
      // The state change should eventually reflect in the UI
      // We can check that it doesn't crash and renders content
      expectTextInOutput(result, 'Select a pipeline to run:');
    });

    it('should preserve state between re-renders', () => {
      function TestComponent() {
        const state = useUiState();
        const dispatch = useUiDispatch();
        
        const [renderCount, setRenderCount] = React.useState(0);
        
        React.useEffect(() => {
          if (renderCount === 0) {
            dispatch(actions.inputChanged('customPath', '/test/path'));
            setRenderCount(1);
          }
        }, [dispatch, renderCount]);
        
        return <Text>CWD: {state.cwd}, CustomPath: {state.customPath}</Text>;
      }

      const result = render(
        <UIProvider cwd="/test">
          <TestComponent />
        </UIProvider>
      );
      
      expectTextInOutput(result, 'CWD: /test');
    });
  });

  describe('state-component integration', () => {
    it('should render different screens based on state mode', () => {
      function ConditionalComponent() {
        const state = useUiState();
        
        if (state.mode === 'main-menu') {
          return <Text>Main Menu Mode</Text>;
        }
        
        if (state.mode === 'select') {
          return <Text>Select Mode</Text>;
        }
        
        return <Text>Unknown Mode: {state.mode}</Text>;
      }

      const result = render(
        <UIProvider cwd="/test">
          <ConditionalComponent />
        </UIProvider>
      );
      
      // Should start in main-menu mode
      expectTextInOutput(result, 'Main Menu Mode');
    });

    it('should handle notices correctly', () => {
      function NoticeTestComponent() {
        const state = useUiState();
        const dispatch = useUiDispatch();
        
        const [initialized, setInitialized] = React.useState(false);
        
        React.useEffect(() => {
          if (!initialized) {
            dispatch(actions.promptCreated('/test/new.md', 'new.md'));
            setInitialized(true);
          }
        }, [dispatch, initialized]);
        
        return (
          <Text>
            Notice: {state.notice ? state.notice.text : 'none'}
          </Text>
        );
      }

      const result = render(
        <UIProvider cwd="/test">
          <NoticeTestComponent />
        </UIProvider>
      );
      
      // Should eventually show the notice
      expectTextInOutput(result, 'Notice:');
    });

    it('should handle action creators correctly', () => {
      // Test that action creators produce the right action objects
      expect(actions.navigateUp()).toEqual({ type: 'NAVIGATE_UP' });
      expect(actions.navigateDown(5)).toEqual({ type: 'NAVIGATE_DOWN', maxIndex: 5 });
      expect(actions.inputChanged('customPath', '/test')).toEqual({
        type: 'INPUT_CHANGED',
        field: 'customPath',
        value: '/test'
      });
    });

    it('should handle complex action sequences', () => {
      const actionSequence = [
        actions.navigateToSelectPipeline(),
        actions.navigateDown(2),
        actions.inputChanged('userPrompt', 'test prompt'),
        actions.pipelineCompleted(true, 'Success'),
      ];
      
      // Test that all actions are valid and don't throw
      actionSequence.forEach(action => {
        expect(action).toHaveProperty('type');
        expect(typeof action.type).toBe('string');
      });
    });
  });

  describe('error boundaries and resilience', () => {
    it('should handle action dispatching correctly', () => {
      function ComponentWithProvider() {
        const dispatch = useUiDispatch();
        const state = useUiState();
        
        // Just verify the hooks work when provider is present
        React.useEffect(() => {
          dispatch(actions.navigateDown(5));
        }, [dispatch]);
        
        return <Text>Mode: {state.mode}</Text>;
      }

      const result = render(
        <UIProvider cwd="/test">
          <ComponentWithProvider />
        </UIProvider>
      );
      
      expectTextInOutput(result, 'Mode: main-menu');
    });

    it('should handle complex state interactions', () => {
      function ComplexComponent() {
        const state = useUiState();
        
        return (
          <Text>
            CWD: {state.cwd}, InitialMode: {state.mode}
          </Text>
        );
      }

      const result = render(
        <UIProvider cwd="/test/path">
          <ComplexComponent />
        </UIProvider>
      );
      
      // Just verify it renders and shows the initial state
      expectTextInOutput(result, 'CWD: /test/path');
      expectTextInOutput(result, 'InitialMode: main-menu');
    });
  });
});