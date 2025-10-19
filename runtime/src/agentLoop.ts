import { z } from 'zod';

import { readFileAction, readFileArgsSchema } from './actions/readFile.js';
import { writeFileAction, writeFileArgsSchema } from './actions/writeFile.js';
import { config } from './config.js';
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

type AgentAction = z.infer<typeof agentActionSchema>;

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      return JSON.parse(match[1]);
    }
  }

  return JSON.parse(trimmed);
}

async function executeAction(action: AgentAction): Promise<{ observation: string; continueLoop: boolean; historyInjection?: string }> {
  if (action.action === 'read_file') {
    const { path } = action.args;
    const { contents, resolvedPath } = await readFileAction(path);
    const limit = 6000;
    const truncated = contents.length > limit ? `${contents.slice(0, limit)}\n...[truncated ${contents.length - limit} characters]` : contents;
    const observation = `Observation: read_file succeeded.\npath: ${resolvedPath}\ncontents:\n${truncated}`;
    return {
      observation,
      continueLoop: true,
      historyInjection: `${observation}\nRespond with the next JSON action.`,
    };
  }

  const { path, contents } = action.args;
  const resolvedPath = await writeFileAction(path, contents);
  const observation = `Observation: write_file succeeded at ${resolvedPath}.`;
  return {
    observation,
    continueLoop: false,
    historyInjection: undefined,
  };
}

function parseActionPayload(rawResponse: string): AgentAction[] {
  try {
    const payload = extractJsonPayload(rawResponse);
    const rawActions = normalizeActionsPayload(payload);
    if (rawActions.length > 2) {
      console.warn('[agent] Received more than two actions. Truncating to the first two.');
    }

    return rawActions.slice(0, 2).map((rawAction) => agentActionSchema.parse(rawAction));
  } catch (error) {
    console.error('[agent] Failed to parse agent response. Raw payload follows:');
    console.error(rawResponse);
    throw error;
  }
}

function normalizeActionsPayload(payload: unknown): unknown[] {
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

export async function runAgentLoop(): Promise<void> {
  const systemPrompt = await loadSystemPrompt();
  
  const history: ConversationEntry[] = [
    {
      role: 'user',
      content: config.userPrompt,
    },
  ];

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    const rawReply = await callModel(config.provider, systemPrompt, history);
    history.push({ role: 'assistant', content: rawReply });

    const actions = parseActionPayload(rawReply);

    let shouldContinue = false;

    for (const [index, action] of actions.entries()) {
      console.log(`\n[agent] Iteration ${iteration + 1}.${index + 1}: ${action.action}`);
      const result = await executeAction(action);
      console.log(`[agent] ${result.observation}`);

      if (result.historyInjection && iteration + 1 < config.maxIterations) {
        history.push({ role: 'user', content: result.historyInjection });
      }

      shouldContinue = result.continueLoop;

      if (!shouldContinue) {
        break;
      }
    }

    if (!shouldContinue || iteration + 1 >= config.maxIterations) {
      break;
    }
  }

  console.log('\n[agent] Loop finished.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentLoop().catch((error) => {
    console.error('[agent] Loop failed:', error);
    process.exitCode = 1;
  });
}
