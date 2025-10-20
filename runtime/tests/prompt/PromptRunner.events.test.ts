import { describe, it, expect } from 'vitest';
import path from 'path';
import { executePromptWithLogger } from '../../src/prompt/runner.js';
import { Logger } from '../../src/utils/logger.js';
import { InMemoryFileSystem } from '../../src/fs/memoryFs.js';

// Fake model that returns a single list_directory action
const fakeCallModel = async () =>
  '{"actions":[{"action":"list_directory","args":{"path":".","recursive":false}}]}';

type Event =
  | { type: 'agent_iteration'; iteration: number; max: number }
  | { type: 'model_response'; preview: string }
  | { type: 'tool_call'; name: string; input: any }
  | { type: 'tool_result'; summary: any }
  | { type: 'info'; message: string }
  | { type: 'error'; message: string };

class TestEventLogger extends Logger {
  public events: Event[] = [];

  override agentIteration(iteration: number, max: number): void {
    this.events.push({ type: 'agent_iteration', iteration, max });
  }

  override agentToolCall(toolName: string, input?: any): void {
    this.events.push({ type: 'tool_call', name: toolName, input });
  }

  override agentToolResult(result: any): void {
    // keep it small; we only care that a result occurred
    this.events.push({
      type: 'tool_result',
      summary:
        result && typeof result === 'object'
          ? { keys: Object.keys(result) }
          : { value: String(result) },
    });
  }

  override info(message: string): void {
    // capture model response preview line distinctly
    if (message.startsWith('Response preview:')) {
      this.events.push({ type: 'model_response', preview: message });
    } else {
      this.events.push({ type: 'info', message });
    }
  }

  override error(message: string): void {
    this.events.push({ type: 'error', message });
  }
}

describe('PromptRunner event sequence (happy path)', () => {
  it('records agent iteration, model response preview, tool call/result, and completion', async () => {
    // arrange: create an in-memory FS with a prompt & a directory structure
    const cwd = path.resolve('/virtual/project');
    const promptPath = path.join(cwd, 'test-prompt.md');
    const promptContent = `---\nstatus: draft\nprovider: openai\n---\nPlease list the files in the current directory.`;
    const memfs = new InMemoryFileSystem({
      [promptPath]: promptContent,
      [path.join(cwd, 'src/index.ts')]: 'console.log("hi")',
      [path.join(cwd, 'README.md')]: '# Readme',
    });

    const logger = new TestEventLogger(false);

    // act
    const result = await executePromptWithLogger(promptPath, logger, {
      maxIterations: 1,
      fs: memfs,
      cwd,
      callModel: fakeCallModel as any,
    });

    // assert result
    expect(result.success).toBe(true);

    // assert event sequence – loose but ordered
    const types = logger.events.map((e) => e.type);
    expect(types).toContain('agent_iteration');
    expect(types).toContain('model_response');
    expect(types).toContain('tool_call');
    expect(types).toContain('tool_result');
    expect(types).toContain('info'); // completion message

    // order checks: iteration -> model_response -> tool_call -> tool_result
    const idx = (t: Event['type']) => types.indexOf(t);
    expect(idx('agent_iteration')).toBeLessThan(idx('model_response'));
    expect(idx('model_response')).toBeLessThan(idx('tool_call'));
    expect(idx('tool_call')).toBeLessThan(idx('tool_result'));
  });
});

describe('PromptRunner error handling', () => {
  it('does not crash when run_npm_script points to a missing script', async () => {
    // fake model instructs the agent to run a non-existent npm script
    const fakeModelMissingScript = async () =>
      JSON.stringify([
        { action: 'run_npm_script', args: { script: 'this-script-does-not-exist-123', flags: {} } },
      ]);

    const cwd = path.resolve('/virtual/project');
    const promptPath = path.join(cwd, 'test-prompt.md');
    const promptContent = `---\nstatus: draft\nprovider: openai\n---\nTry running a missing script.`;
    const memfs = new InMemoryFileSystem({
      [promptPath]: promptContent,
    });

    const logger = new TestEventLogger(false);

    const result = await executePromptWithLogger(promptPath, logger, {
      maxIterations: 1,
      fs: memfs,
      cwd,
      callModel: fakeModelMissingScript as any,
    });

    expect(result.success).toBe(true);

    // Ensure an error from the tool was captured and surfaced as an observation, not a crash
    const errorEvents = logger.events.filter((e) => e.type === 'error') as Extract<
      (typeof logger.events)[number],
      { type: 'error'; message: string }
    >[];
    expect(errorEvents.length).toBeGreaterThan(0);
    expect(errorEvents.some((e) => e.message.includes('Tool error during action'))).toBe(true);

    const infoEvents = logger.events.filter((e) => e.type === 'info') as Extract<
      (typeof logger.events)[number],
      { type: 'info'; message: string }
    >[];
    expect(infoEvents.some((e) => e.message.includes('Observation: tool_error encountered.'))).toBe(
      true,
    );
  });
});
