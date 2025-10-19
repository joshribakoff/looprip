import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';

import { readFileAction } from './actions/readFile.js';
import { writeFileAction } from './actions/writeFile.js';
import { config, type Provider } from './config.js';

const systemPrompt = [
  'You are a coding agent running inside a local runtime.',
  'Always respond with JSON only. Never include prose or commentary.',
  'Output must follow this schema exactly:',
  '{',
  '  "actions": [',
  '    { "action": "read_file", "args": { "path": "<relative-or-absolute-path>" } }',
  '  ]',
  '}',
  'Guidelines:',
  '- Valid actions: "read_file" and "write_file".',
  '- Always return an "actions" array, even for a single action.',
  '- Use the key "path" for file paths. Do not invent new argument names.',
  '- For "write_file", include "contents" with the full file text.',
  '- Return at most two actions.',
  '- If you need to read a file, request that before attempting a write.',
].join('\n');

const readFileArgsSchema = z
  .object({
    path: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.path ?? value.file_path), {
    message: 'read_file requires "path"',
  })
  .transform((value) => ({ path: value.path ?? value.file_path! }));

const writeFileArgsSchema = z
  .object({
    path: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
    contents: z.string().optional(),
    content: z.string().optional(),
  })
  .refine((value) => Boolean((value.path ?? value.file_path) && (value.contents ?? value.content)), {
    message: 'write_file requires "path" and "contents"',
  })
  .transform((value) => ({
    path: value.path ?? value.file_path!,
    contents: value.contents ?? value.content!,
  }));

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

type ConversationEntry = {
  role: 'user' | 'assistant';
  content: string;
};

async function callModel(provider: Provider, history: ConversationEntry[]): Promise<string> {
    console.log('[agent] calling  model:', provider);
  if (provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for the OpenAI provider.');
    }

    const client = new OpenAI({ apiKey: config.openaiApiKey });
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    ];

    console.log(1,messages)
    const completion = await client.chat.completions.create({
        model: config.openaiModel,
        messages,
        temperature: 0,
    });
    console.log(2)

    const choice = completion.choices?.[0]?.message?.content;
    if (!choice) {
      throw new Error('OpenAI returned an empty response.');
    }

    return choice.trim();
  }

  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for the Anthropic provider.');
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const response = await client.messages.create({
    model: config.anthropicModel,
    system: systemPrompt,
    max_tokens: 1024,
    temperature: 0,
    messages: history.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
  });

  const textPart = response.content.find((part) => part.type === 'text');
  if (!textPart || !textPart.text) {
    throw new Error('Anthropic returned an empty response.');
  }

  return textPart.text.trim();
}

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
  const history: ConversationEntry[] = [
    {
      role: 'user',
      content: config.userPrompt,
    },
  ];

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    const rawReply = await callModel(config.provider, history);
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
