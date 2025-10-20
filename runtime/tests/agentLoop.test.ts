import { describe, expect, it } from 'vitest';

import {
  createAgentLoop,
  extractJsonPayload,
  normalizeActionsPayload,
  parseActionPayload,
  type AgentAction,
} from '../src/agentLoop.js';

interface LoggerEntry {
  level: 'log' | 'warn' | 'error';
  args: unknown[];
}

function createLoggerStub() {
  const entries: LoggerEntry[] = [];

  return {
    logger: {
      log: (...args: unknown[]) => entries.push({ level: 'log', args }),
      warn: (...args: unknown[]) => entries.push({ level: 'warn', args }),
      error: (...args: unknown[]) => entries.push({ level: 'error', args }),
    },
    entries,
    byLevel(level: LoggerEntry['level']) {
      return entries.filter((entry) => entry.level === level).map((entry) => entry.args);
    },
  };
}

describe('extractJsonPayload', () => {
  it('returns parsed JSON when provided raw JSON', () => {
    const payload = extractJsonPayload('{"foo": 1}');
    expect(payload).toEqual({ foo: 1 });
  });

  it('parses JSON inside fenced code blocks', () => {
    const payload = extractJsonPayload('```json\n{\n  "bar": "baz"\n}\n```');
    expect(payload).toEqual({ bar: 'baz' });
  });
});

describe('normalizeActionsPayload', () => {
  it('returns array payload unchanged', () => {
    const payload = [{ action: 'read_file', args: { path: 'foo' } }];
    expect(normalizeActionsPayload(payload)).toEqual(payload);
  });

  it('extracts actions array from record payload', () => {
    const payload = { actions: [{ action: 'write_file', args: { path: 'foo', contents: 'bar' } }] };
    expect(normalizeActionsPayload(payload)).toEqual(payload.actions);
  });

  it('normalizes keyed actions object', () => {
    const payload = {
      actions: {
        read_file: { args: { path: 'foo' } },
        write_file: { args: { path: 'foo', contents: 'baz' } },
      },
    };

    expect(normalizeActionsPayload(payload)).toEqual([
      { action: 'read_file', args: { path: 'foo' } },
      { action: 'write_file', args: { path: 'foo', contents: 'baz' } },
    ]);
  });

  it('wraps single action object', () => {
    const payload = { action: 'read_file', args: { path: 'foo' } };
    expect(normalizeActionsPayload(payload)).toEqual([payload]);
  });

  it('normalizes short-hand record payload', () => {
    const payload = {
      read_file: { args: { path: 'foo' } },
      write_file: { args: { path: 'foo', contents: 'baz' } },
    };

    expect(normalizeActionsPayload(payload)).toEqual([
      { action: 'read_file', args: { path: 'foo' } },
      { action: 'write_file', args: { path: 'foo', contents: 'baz' } },
    ]);
  });

  it('throws on unsupported shapes', () => {
    expect(() => normalizeActionsPayload({ hello: 'world' })).toThrow(
      'Unsupported agent response shape.',
    );
  });
});

describe('parseActionPayload', () => {
  it('parses the first two actions and warns about extras', () => {
    const { logger, byLevel } = createLoggerStub();
    const payload = JSON.stringify([
      { action: 'read_file', args: { path: 'a' } },
      { action: 'read_file', args: { path: 'b' } },
      { action: 'write_file', args: { path: 'c', contents: 'd' } },
    ]);

    const actions = parseActionPayload(payload, logger);

    expect(actions).toHaveLength(2);
    expect(actions[0].action).toBe('read_file');
    expect(actions[1].action).toBe('read_file');
    if (actions[0].action === 'read_file') {
      expect(actions[0].args.path).toBe('a');
    }
    if (actions[1].action === 'read_file') {
      expect(actions[1].args.path).toBe('b');
    }
    const warnArgs = byLevel('warn');
    expect(warnArgs).toHaveLength(1);
    expect(String(warnArgs[0][0])).toContain('Truncating to the first two');
  });

  it('logs errors before throwing on invalid payloads', () => {
    const { logger, byLevel } = createLoggerStub();

    expect(() => parseActionPayload('not json', logger)).toThrow();

    expect(byLevel('error')).toHaveLength(2);
  });
});

describe('createAgentLoop helpers', () => {
  it('executes read_file actions with truncation', async () => {
    const readCalls: string[] = [];
    const longContents = 'a'.repeat(6005);
    const loop = createAgentLoop({
      readFile: async (path) => {
        readCalls.push(path);
        return { contents: longContents, resolvedPath: `/abs/${path}` };
      },
      writeFile: async () => {
        throw new Error('writeFile should not be called');
      },
      listDirectory: async () => {
        throw new Error('listDirectory should not be called');
      },
      runNpmScript: async () => {
        throw new Error('runNpmScript should not be called');
      },
      loadSystemPrompt: async () => 'system',
      callModel: async () => 'never used',
      config: { provider: 'openai', maxIterations: 1, userPrompt: 'prompt' },
      logger: console,
    });

    const action: AgentAction = { action: 'read_file', args: { path: 'file.txt' } };
    const result = await loop.executeAction(action);

    expect(readCalls).toEqual(['file.txt']);
    expect(result.continueLoop).toBe(true);
    expect(result.historyInjection).toContain('Respond with the next JSON action.');
    expect(result.observation).toContain('...[truncated 5 characters]');
  });

  it('executes write_file actions and stops the loop', async () => {
    const writeCalls: { path: string; contents: string }[] = [];
    const loop = createAgentLoop({
      readFile: async () => {
        throw new Error('readFile should not be called');
      },
      writeFile: async (path, contents) => {
        writeCalls.push({ path, contents });
        return `/abs/${path}`;
      },
      listDirectory: async () => {
        throw new Error('listDirectory should not be called');
      },
      runNpmScript: async () => {
        throw new Error('runNpmScript should not be called');
      },
      loadSystemPrompt: async () => 'system',
      callModel: async () => 'never used',
      config: { provider: 'openai', maxIterations: 1, userPrompt: 'prompt' },
      logger: console,
    });

    const action: AgentAction = {
      action: 'write_file',
      args: { path: 'out.txt', contents: 'data' },
    };
    const result = await loop.executeAction(action);

    expect(writeCalls).toEqual([{ path: 'out.txt', contents: 'data' }]);
    expect(result.continueLoop).toBe(false);
    expect(result.historyInjection).toBeUndefined();
  });

  it('catches tool errors and surfaces observation without crashing', async () => {
    const loggerStub = createLoggerStub();
    const loop = createAgentLoop({
      readFile: async () => {
        throw new Error("ENOENT: no such file or directory, open '/abs/missing.txt'");
      },
      writeFile: async () => {
        throw new Error('writeFile should not be called');
      },
      listDirectory: async () => {
        throw new Error('listDirectory should not be called');
      },
      runNpmScript: async () => {
        throw new Error('runNpmScript should not be called');
      },
      loadSystemPrompt: async () => 'system',
      callModel: async () => 'never used',
      config: { provider: 'openai', maxIterations: 1, userPrompt: 'prompt' },
      logger: loggerStub.logger,
    });

    const action: AgentAction = { action: 'read_file', args: { path: 'missing.txt' } };
    const result = await loop.executeAction(action);

    expect(result.continueLoop).toBe(true);
    expect(result.observation).toContain('tool_error encountered');
    expect(result.observation).toContain('action: read_file');
    expect(result.observation).toContain('ENOENT');

    // Ensure an error log was emitted
    expect(loggerStub.byLevel('error').length).toBeGreaterThan(0);
  });
});

type ConversationEntryClone = { role: string; content: string };

describe('runAgentLoop', () => {
  it('runs the loop with injected dependencies', async () => {
    const readCalls: string[] = [];
    const writeCalls: { path: string; contents: string }[] = [];
    const callModelCalls: {
      provider: string;
      systemPrompt: string;
      history: ConversationEntryClone[];
    }[] = [];

    const loggerStub = createLoggerStub();

    const loop = createAgentLoop({
      readFile: async (path) => {
        readCalls.push(path);
        return { contents: 'file contents', resolvedPath: `/abs/${path}` };
      },
      writeFile: async (path, contents) => {
        writeCalls.push({ path, contents });
        return `/abs/${path}`;
      },
      listDirectory: async () => {
        throw new Error('listDirectory should not be called');
      },
      runNpmScript: async () => {
        throw new Error('runNpmScript should not be called');
      },
      loadSystemPrompt: async () => 'System Prompt',
      callModel: async (provider, systemPrompt, history) => {
        callModelCalls.push({
          provider,
          systemPrompt,
          history: history.map((entry) => ({
            role: entry.role,
            content: entry.content,
          })) as ConversationEntryClone[],
        });

        return JSON.stringify([
          { action: 'read_file', args: { path: 'note.txt' } },
          { action: 'write_file', args: { path: 'note.txt', contents: 'updated' } },
        ]);
      },
      config: { provider: 'openai', maxIterations: 3, userPrompt: 'Please help' },
      logger: loggerStub.logger,
    });

    await loop.runAgentLoop();

    expect(callModelCalls).toHaveLength(1);
    expect(callModelCalls[0]).toMatchObject({ provider: 'openai', systemPrompt: 'System Prompt' });
    expect(callModelCalls[0].history).toEqual([{ role: 'user', content: 'Please help' }]);
    expect(readCalls).toEqual(['note.txt']);
    expect(writeCalls).toEqual([{ path: 'note.txt', contents: 'updated' }]);
    const logMessages = loggerStub.byLevel('log').map((args) => args.map(String).join(' '));
    expect(logMessages.some((message) => message.includes('Loop finished'))).toBe(true);
  });

  it('handles invalid JSON model responses by injecting parse_error and continuing', async () => {
    const callModelCalls: { history: ConversationEntryClone[] }[] = [];
    const historySnapshots: ConversationEntryClone[][] = [];
    let callCount = 0;

    const loggerStub = createLoggerStub();

    const loop = createAgentLoop({
      readFile: async () => ({ contents: 'ok', resolvedPath: '/abs/x' }),
      writeFile: async () => '/abs/x',
      listDirectory: async () => ({
        resolvedPath: '/',
        entries: [],
        truncated: false,
        pattern: undefined,
        recursive: false,
        limit: 200,
      }),
      runNpmScript: async () => ({
        script: 'noop',
        npmScript: 'noop',
        command: 'npm',
        args: [],
        cwd: '/',
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: '',
        stdoutTruncated: false,
        stdoutOverflow: 0,
        stderrTruncated: false,
        stderrOverflow: 0,
      }),
      loadSystemPrompt: async () => 'system',
      callModel: async () => {
        // First call returns invalid JSON, second call returns a valid action to end loop
        callCount += 1;
        if (callCount === 1) {
          return 'not json {"oops": '; // invalid JSON
        }
        return JSON.stringify([
          { action: 'write_file', args: { path: 'out.txt', contents: 'data' } },
        ]);
      },
      config: { provider: 'openai', maxIterations: 3, userPrompt: 'Please help' },
      logger: loggerStub.logger,
    });

    await loop.runAgentLoop();

    // Expect that an error was logged about invalid JSON
    const errorLogs = loggerStub.byLevel('error').map((args) => args.map(String).join(' '));
    expect(errorLogs.some((m) => m.includes('Invalid JSON from model'))).toBe(true);
  });

  it('executes list_directory actions and keeps the loop running', async () => {
    const loop = createAgentLoop({
      readFile: async () => {
        throw new Error('readFile should not be called');
      },
      writeFile: async () => {
        throw new Error('writeFile should not be called');
      },
      listDirectory: async () => ({
        resolvedPath: '/workspace',
        entries: [
          { path: 'src/', type: 'directory' as const },
          { path: 'src/index.ts', type: 'file' as const },
        ],
        truncated: false,
        pattern: undefined,
        recursive: false,
        limit: 200,
      }),
      runNpmScript: async () => {
        throw new Error('runNpmScript should not be called');
      },
      loadSystemPrompt: async () => 'system',
      callModel: async () => 'never used',
      config: { provider: 'openai', maxIterations: 1, userPrompt: 'prompt' },
      logger: console,
    });

    const action: AgentAction = {
      action: 'list_directory',
      args: { path: '.', recursive: false, pattern: undefined, maxResults: 200 },
    };
    const result = await loop.executeAction(action);

    expect(result.continueLoop).toBe(true);
    expect(result.observation).toContain('list_directory succeeded');
    expect(result.observation).toContain('src/index.ts');
  });

  it('executes run_npm_script actions and reports output', async () => {
    const loop = createAgentLoop({
      readFile: async () => {
        throw new Error('readFile should not be called');
      },
      writeFile: async () => {
        throw new Error('writeFile should not be called');
      },
      listDirectory: async () => {
        throw new Error('listDirectory should not be called');
      },
      runNpmScript: async () => ({
        script: 'runtime:test',
        npmScript: 'runtime:test',
        command: 'npm',
        args: ['run', 'runtime:test', '--', '--run'],
        cwd: '/workspace',
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: 'ok',
        stderr: '',
        stdoutTruncated: false,
        stdoutOverflow: 0,
        stderrTruncated: false,
        stderrOverflow: 0,
      }),
      loadSystemPrompt: async () => 'system',
      callModel: async () => 'never used',
      config: { provider: 'openai', maxIterations: 1, userPrompt: 'prompt' },
      logger: console,
    });

    const action: AgentAction = {
      action: 'run_npm_script',
      args: { script: 'runtime:test', flags: { run: true } },
    };
    const result = await loop.executeAction(action);

    expect(result.continueLoop).toBe(true);
    expect(result.observation).toContain('run_npm_script completed');
    expect(result.observation).toContain('exit_code: 0');
    expect(result.historyInjection).toBeDefined();
  });
});
