import { useCallback } from 'react';
import { z } from 'zod';
import { parsePromptFile } from '../../../core/prompt.js';
import { callModel, type ConversationEntry } from '../../../models/index.js';
import type { Provider } from '../../../config.js';
import { loadSystemPrompt } from '../../../utils/systemPrompt.js';
import type { Logger } from '../../../utils/logger.js';
import { readFileAction, readFileArgsSchema } from '../../../actions/readFile.js';
import { writeFileAction, writeFileArgsSchema } from '../../../actions/writeFile.js';

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

async function executeAction(action: AgentAction, logger: Logger): Promise<{ observation: string; continueLoop: boolean; historyInjection?: string }> {
  if (action.action === 'read_file') {
    const { path } = action.args;
    const { contents, resolvedPath } = await readFileAction(path);
    const limit = 6000;
    const truncated = contents.length > limit ? `${contents.slice(0, limit)}\n...[truncated ${contents.length - limit} characters]` : contents;
    const observation = `Observation: read_file succeeded.\npath: ${resolvedPath}\ncontents:\n${truncated}`;
    logger.info(`Read file: ${resolvedPath}`);
    return {
      observation,
      continueLoop: true,
      historyInjection: `${observation}\nRespond with the next JSON action.`,
    };
  }

  const { path, contents } = action.args;
  const resolvedPath = await writeFileAction(path, contents);
  const observation = `Observation: write_file succeeded at ${resolvedPath}.`;
  logger.info(`Wrote file: ${resolvedPath}`);
  return {
    observation,
    continueLoop: false,
    historyInjection: undefined,
  };
}

interface PromptRunnerConfig {
  maxIterations?: number;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

export function usePromptRunner(logger: Logger, config?: PromptRunnerConfig) {
  const executePrompt = useCallback(
    async (promptPath: string): Promise<{ success: boolean }> => {
      try {
        logger.loading(`Loading prompt from: ${promptPath}`);
        
        // Parse the prompt file
        const parsed = await parsePromptFile(promptPath);
        const { frontMatter, body } = parsed;
        
        // Determine provider and model
        const provider: Provider = frontMatter.provider || 'openai';
        const maxIterations = config?.maxIterations || 5;
        
        logger.info(`Using provider: ${provider}`);
        logger.info(`Max iterations: ${maxIterations}`);
        
        // Load system prompt
        const systemPrompt = await loadSystemPrompt();
        
        // Initialize conversation history with the user's prompt (body only, no front matter)
        const history: ConversationEntry[] = [
          {
            role: 'user',
            content: body,
          },
        ];
        
        logger.info(`Starting agent loop...`);
        
        // Run the agent loop
        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
          logger.agentIteration(iteration + 1, maxIterations);
          
          // Call the model
          const rawReply = await callModel(provider, systemPrompt, history);
          history.push({ role: 'assistant', content: rawReply });
          
          logger.info(`Model response received (${rawReply.length} chars)`);
          logger.info(`Response preview: ${rawReply.slice(0, 200)}...`);
          
          // Parse and execute actions
          const actions = parseActionPayload(rawReply);
          
          let shouldContinue = false;

          for (const [index, action] of actions.entries()) {
            logger.info(`Executing action ${index + 1}/${actions.length}: ${action.action}`);
            const result = await executeAction(action, logger);
            logger.info(result.observation);

            if (result.historyInjection && iteration + 1 < maxIterations) {
              history.push({ role: 'user', content: result.historyInjection });
            }

            shouldContinue = result.continueLoop;

            if (!shouldContinue) {
              break;
            }
          }

          if (!shouldContinue || iteration + 1 >= maxIterations) {
            logger.info(`Agent loop completed after ${iteration + 1} iteration(s)`);
            break;
          }
        }
        
        logger.info(`\nPrompt execution completed successfully`);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error executing prompt`, message);
        throw error;
      }
    },
    [logger, config]
  );

  return { executePrompt };
}

export default usePromptRunner;
