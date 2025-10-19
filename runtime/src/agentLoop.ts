import { z } from 'zod';

import { readFileAction, readFileArgsSchema } from './actions/readFile.js';
import { writeFileAction, writeFileArgsSchema } from './actions/writeFile.js';
import { config, type AgentRuntimeConfig } from './config.js';
import { callModel, type ConversationEntry } from './models/index.js';
import { loadSystemPrompt } from './utils/systemPrompt.js';

const agentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('read_file'),
    args: readFileArgsSchema,
  }),
  z.object({
    action: z.literal('write_file'),
    args: writeFileArgsSchema,
  }),
]);

export type AgentAction = z.infer<typeof agentActionSchema>;
const READ_FILE_TRUNCATION_LIMIT = 6000;

export type AgentLoopConfig = Pick<AgentRuntimeConfig, 'provider' | 'maxIterations' | 'userPrompt'>;

export interface AgentLoopLogger {
  log: (...values: unknown[]) => void;
  warn: (...values: unknown[]) => void;
  error: (...values: unknown[]) => void;
}

export interface AgentLoopDeps {
  readFile: typeof readFileAction;
  writeFile: typeof writeFileAction;
  loadSystemPrompt: typeof loadSystemPrompt;
  callModel: typeof callModel;
  config: AgentLoopConfig;
  logger?: AgentLoopLogger;
}

export function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      return JSON.parse(match[1]);
    }
  }

  return JSON.parse(trimmed);
}

export function normalizeActionsPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.actions)) {
      return record.actions;
    }

    if (record.actions && typeof record.actions === 'object') {
      return Object.entries(record.actions as Record<string, unknown>).map(([action, value]) => {
        const args = value && typeof value === 'object' && 'args' in (value as Record<string, unknown>)
          ? (value as { args: unknown }).args
          : value;
        return { action, args };
      });
    }

    if ('action' in record) {
      return [record];
    }

    const entries = Object.entries(record);
    if (entries.length > 0 && entries.every(([key]) => key === 'read_file' || key === 'write_file')) {
      return entries.map(([action, value]) => {
        const args = value && typeof value === 'object' && 'args' in (value as Record<string, unknown>)
          ? (value as { args: unknown }).args
          : value;
        return { action, args };
      });
    }
  }

  throw new Error('Unsupported agent response shape.');
}

export function parseActionPayload(rawResponse: string, logger: AgentLoopLogger = console): AgentAction[] {
  try {
    const payload = extractJsonPayload(rawResponse);
    const rawActions = normalizeActionsPayload(payload);
    if (rawActions.length > 2) {
      logger.warn('[agent] Received more than two actions. Truncating to the first two.');
    }

    return rawActions.slice(0, 2).map((rawAction) => agentActionSchema.parse(rawAction));
  } catch (error) {
    logger.error('[agent] Failed to parse agent response. Raw payload follows:');
    logger.error(rawResponse);
    throw error;
  }
}

export function createAgentLoop(deps: AgentLoopDeps) {
  const {
    readFile,
    writeFile,
    loadSystemPrompt: loadPrompt,
    callModel: callModelFn,
    config: loopConfig,
    logger = console,
  } = deps;

  async function executeAction(action: AgentAction): Promise<{ observation: string; continueLoop: boolean; historyInjection?: string }> {
    if (action.action === 'read_file') {
      const { path } = action.args;
      const { contents, resolvedPath } = await readFile(path);
      const truncated = contents.length > READ_FILE_TRUNCATION_LIMIT
        ? `${contents.slice(0, READ_FILE_TRUNCATION_LIMIT)}\n...[truncated ${contents.length - READ_FILE_TRUNCATION_LIMIT} characters]`
        : contents;
      const observation = `Observation: read_file succeeded.\npath: ${resolvedPath}\ncontents:\n${truncated}`;
      return {
        observation,
        continueLoop: true,
        historyInjection: `${observation}\nRespond with the next JSON action.`,
      };
    }

    const { path, contents } = action.args;
    const resolvedPath = await writeFile(path, contents);
    const observation = `Observation: write_file succeeded at ${resolvedPath}.`;
    return {
      observation,
      continueLoop: false,
      historyInjection: undefined,
    };
  }

  async function runAgentLoop(): Promise<void> {
    const systemPrompt = await loadPrompt();

    const history: ConversationEntry[] = [
      {
        role: 'user',
        content: loopConfig.userPrompt,
      },
    ];

    for (let iteration = 0; iteration < loopConfig.maxIterations; iteration += 1) {
      const rawReply = await callModelFn(loopConfig.provider, systemPrompt, history);
      history.push({ role: 'assistant', content: rawReply });

      const actions = parseActionPayload(rawReply, logger);

      let shouldContinue = false;

      for (const [index, action] of actions.entries()) {
        logger.log(`\n[agent] Iteration ${iteration + 1}.${index + 1}: ${action.action}`);
        const result = await executeAction(action);
        logger.log(`[agent] ${result.observation}`);

        if (result.historyInjection && iteration + 1 < loopConfig.maxIterations) {
          history.push({ role: 'user', content: result.historyInjection });
        }

        shouldContinue = result.continueLoop;

        if (!shouldContinue) {
          break;
        }
      }

      if (!shouldContinue || iteration + 1 >= loopConfig.maxIterations) {
        break;
      }
    }

    logger.log('\n[agent] Loop finished.');
  }

  return {
    runAgentLoop,
    executeAction,
  };
}

const defaultAgentLoop = createAgentLoop({
  readFile: readFileAction,
  writeFile: writeFileAction,
  loadSystemPrompt,
  callModel,
  config,
  logger: console,
});

export async function runAgentLoop(): Promise<void> {
  return defaultAgentLoop.runAgentLoop();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentLoop().catch((error) => {
    console.error('[agent] Loop failed:', error);
    process.exitCode = 1;
  });
}
