import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { executePromptWithLogger } from '../../src/prompt/runner.js';
import { Logger } from '../../src/utils/logger.js';

// Mock the model to return a single list_directory action
vi.mock('../../src/models/index.ts', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    callModel: vi.fn().mockResolvedValue(
      '{"actions":[{"action":"list_directory","args":{"path":".","recursive":false}}]}'
    ),
  };
});

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
    this.events.push({ type: 'tool_result', summary: result && typeof result === 'object' ? { keys: Object.keys(result) } : { value: String(result) } });
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
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-thing-prompt-'));
    // no chdir in workers; we write explicit paths under tmpDir
  });

  afterEach(async () => {
    // best-effort cleanup
    try { await fs.rmdir(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('records agent iteration, model response preview, tool call/result, and completion', async () => {
    // arrange: write a simple prompt file
    const promptPath = path.join(tmpDir, 'test-prompt.md');
    const promptContent = `---\nstatus: draft\nprovider: openai\n---\nPlease list the files in the current directory.`;
    await fs.writeFile(promptPath, promptContent, 'utf8');

    const logger = new TestEventLogger(false);

    // act
    const result = await executePromptWithLogger(promptPath, logger, { maxIterations: 1 });

    // assert result
    expect(result.success).toBe(true);

    // assert event sequence – loose but ordered
    const types = logger.events.map(e => e.type);
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
