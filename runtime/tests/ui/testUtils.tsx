import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { UIProvider } from '../../src/cli/ui/state/uiStore.js';

/**
 * Test utilities for Ink TUI components
 */

/**
 * Creates a test provider that wraps components with UI state
 */
export function createTestProvider(cwd = '/test') {
  return function TestProvider({ children }: { children: React.ReactNode }) {
    return (
      <UIProvider cwd={cwd}>
        {children}
      </UIProvider>
    );
  };
}

/**
 * Renders a component with the UI provider for integration tests
 */
export function renderWithProvider(
  component: React.ReactElement,
  cwd = '/test'
) {
  const TestProvider = createTestProvider(cwd);
  
  return render(
    <TestProvider>
      {component}
    </TestProvider>
  );
}

/**
 * Mock choices for testing
 */
export const mockPipelineChoices = [
  { title: 'Simple Task Pipeline', value: '/test/simple-task.yaml' },
  { title: 'File Processing Pipeline', value: '/test/file-process.yaml' },
  { title: 'Agent Test Pipeline', value: '/test/agent-test.yaml' },
];

export const mockPromptChoices = [
  { title: 'Code Review Prompt', value: '/test/prompts/code-review.md' },
  { title: 'Documentation Prompt', value: '/test/prompts/docs.md' },
];

/**
 * Creates a simple header component for testing
 */
export const createTestHeader = () => (
  <Text>Test Header</Text>
);

/**
 * Helper to get the rendered text content from ink-testing-library
 */
export function getRenderedText(result: ReturnType<typeof render>) {
  return result.lastFrame();
}

/**
 * Helper to assert that text appears in the rendered output
 */
export function expectTextInOutput(result: ReturnType<typeof render>, text: string) {
  const output = getRenderedText(result);
  if (!output?.includes(text)) {
    throw new Error(`Expected text "${text}" not found in output:\n${output}`);
  }
}

/**
 * Helper to assert that text does NOT appear in the rendered output
 */
export function expectTextNotInOutput(result: ReturnType<typeof render>, text: string) {
  const output = getRenderedText(result);
  if (output?.includes(text)) {
    throw new Error(`Unexpected text "${text}" found in output:\n${output}`);
  }
}

/**
 * Mock functions for testing
 */
export const mockCallbacks = {
  onChange: () => {},
  onSubmit: () => {},
  onBack: () => {},
  onSelect: () => {},
};