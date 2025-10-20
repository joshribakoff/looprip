import { parsePromptFile } from '../core/prompt.js';
import { callModel as defaultCallModel, type ConversationEntry } from '../models/index.js';
import type { Provider } from '../config.js';
import { loadSystemPrompt } from '../utils/systemPrompt.js';
import type { Logger } from '../utils/logger.js';
import { listDirectoryAction } from '../actions/listDirectory.js';
import { readFileAction } from '../actions/readFile.js';
import { runNpmScriptAction } from '../actions/runNpmScript.js';
import { writeFileAction } from '../actions/writeFile.js';
import {
  agentActionSchema,
  isAgentActionName,
  type AgentAction,
} from '../actions/agentActionSchema.js';
import type { FileSystem } from '../fs/types.js';
import { NodeFileSystem } from '../fs/nodeFs.js';

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
        const args =
          value && typeof value === 'object' && 'args' in (value as Record<string, unknown>)
            ? (value as { args: unknown }).args
            : value;
        return { action, args };
      });
    }

    if ('action' in record) {
      return [record];
    }

    const entries = Object.entries(record);
    if (entries.length > 0 && entries.every(([key]) => isAgentActionName(key))) {
      return entries.map(([action, value]) => {
        const args =
          value && typeof value === 'object' && 'args' in (value as Record<string, unknown>)
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
      // eslint-disable-next-line no-console
      console.warn('[agent] Received more than two actions. Truncating to the first two.');
    }
    return rawActions
      .slice(0, 2)
      .map((rawAction) => agentActionSchema.parse(rawAction) as AgentAction);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[agent] Failed to parse agent response. Raw payload follows:');
    // eslint-disable-next-line no-console
    console.error(rawResponse);
    throw error;
  }
}

async function executeAction(
  action: AgentAction,
  logger: Logger,
  deps: { fs: FileSystem; cwd: string },
): Promise<{ observation: string; continueLoop: boolean; historyInjection?: string }> {
  try {
    switch (action.action) {
      case 'read_file': {
        const { path } = action.args;
        logger.agentToolCall('read_file', { path });
        const { contents, resolvedPath } = await readFileAction(path, {
          fs: deps.fs,
          cwd: deps.cwd,
        });
        const limit = 6000;
        const truncated =
          contents.length > limit
            ? `${contents.slice(0, limit)}\n...[truncated ${contents.length - limit} characters]`
            : contents;
        const observation = `Observation: read_file succeeded.\npath: ${resolvedPath}\ncontents:\n${truncated}`;
        logger.agentToolResult({
          path: resolvedPath,
          previewLength: Math.min(contents.length, limit),
        });
        logger.info(`Read file: ${resolvedPath}`);
        return {
          observation,
          continueLoop: true,
          historyInjection: `${observation}\nRespond with the next JSON action.`,
        };
      }

      case 'write_file': {
        const { path, contents } = action.args;
        logger.agentToolCall('write_file', { path });
        const resolvedPath = await writeFileAction(path, contents, { fs: deps.fs, cwd: deps.cwd });
        const observation = `Observation: write_file succeeded at ${resolvedPath}.`;
        logger.agentToolResult({
          path: resolvedPath,
          bytes: typeof contents === 'string' ? contents.length : 0,
        });
        logger.info(`Wrote file: ${resolvedPath}`);
        return {
          observation,
          continueLoop: false,
          historyInjection: undefined,
        };
      }

      case 'list_directory': {
        logger.agentToolCall('list_directory', action.args);
        const result = await listDirectoryAction(action.args, { fs: deps.fs, cwd: deps.cwd });
        const entriesText =
          result.entries.length > 0
            ? result.entries.map((entry) => `- [${entry.type}] ${entry.path}`).join('\n')
            : '- [empty] (no entries matched)';
        const truncatedNote = result.truncated ? `\n...[truncated to ${result.limit} entries]` : '';
        const patternLine = `pattern: ${result.pattern ?? '<none>'}`;
        const observation = `Observation: list_directory succeeded.\npath: ${result.resolvedPath}\n${patternLine}\nrecursive: ${result.recursive}\nentries:\n${entriesText}${truncatedNote}`;
        logger.agentToolResult({ count: result.entries.length, truncated: result.truncated });
        logger.info(
          `Listed directory: ${result.resolvedPath} (${result.entries.length}${result.truncated ? '+' : ''} entries)`,
        );
        return {
          observation,
          continueLoop: true,
          historyInjection: `${observation}\nRespond with the next JSON action.`,
        };
      }

      case 'run_npm_script': {
        logger.agentToolCall('run_npm_script', action.args);
        const result = await runNpmScriptAction(action.args);
        const stdoutSuffix = result.stdoutTruncated
          ? `\n...[truncated ${result.stdoutOverflow} characters]`
          : '';
        const stderrSuffix = result.stderrTruncated
          ? `\n...[truncated ${result.stderrOverflow} characters]`
          : '';
        const stdoutBlock = result.stdout
          ? `${result.stdout}${stdoutSuffix}`
          : `[no stdout]${stdoutSuffix}`;
        const stderrBlock = result.stderr
          ? `${result.stderr}${stderrSuffix}`
          : `[no stderr]${stderrSuffix}`;
        const observation = [
          'Observation: run_npm_script completed.',
          `script: ${result.script}`,
          `exit_code: ${result.exitCode ?? 'null'}`,
          `signal: ${result.signal ?? 'null'}`,
          `timed_out: ${result.timedOut}`,
          'stdout:',
          stdoutBlock,
          'stderr:',
          stderrBlock,
        ].join('\n');
        logger.agentToolResult({ exitCode: result.exitCode, timedOut: result.timedOut });
        logger.info(`Ran npm script: ${result.npmScript} (exit ${result.exitCode ?? 'null'})`);
        return {
          observation,
          continueLoop: true,
          historyInjection: `${observation}\nRespond with the next JSON action.`,
        };
      }

      default:
        throw new Error(`Unsupported action: ${(action as { action: string }).action}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    logger.error(`[agent] Tool error during action: ${action.action} -> ${msg}`);
    const observation = [
      'Observation: tool_error encountered.',
      `action: ${action.action}`,
      `error: ${msg}`,
    ].join('\n');

    return {
      observation,
      continueLoop: true,
      historyInjection: `${observation}\nRespond with the next JSON action.`,
    };
  }
}

export interface PromptRunnerConfig {
  maxIterations?: number;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  fs?: FileSystem;
  cwd?: string;
  callModel?: typeof defaultCallModel;
}

export async function executePromptWithLogger(
  promptPath: string,
  logger: Logger,
  config?: PromptRunnerConfig,
): Promise<{ success: boolean }> {
  logger.info(`Loading prompt from: ${promptPath}`);

  // Parse the prompt file
  const fs = config?.fs ?? new NodeFileSystem();
  const cwd = config?.cwd ?? process.cwd();
  const parsed = await parsePromptFile(promptPath, fs);
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
    const callModel = config?.callModel ?? defaultCallModel;
    const rawReply = await callModel(provider, systemPrompt, history);
    history.push({ role: 'assistant', content: rawReply });

    logger.info(`Model response received (${rawReply.length} chars)`);
    logger.info(`Response preview: ${rawReply.slice(0, 200)}...`);

    // Parse and execute actions
    let actions: AgentAction[] = [];
    try {
      actions = parseActionPayload(rawReply);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      logger.error('[agent] Invalid JSON from model. Will inject parse_error and continue.');
      const observation = ['Observation: parse_error encountered.', `error: ${msg}`].join('\n');
      const injection = `${observation}\nRespond with the next JSON action.`;
      if (iteration + 1 < maxIterations) {
        history.push({ role: 'user', content: injection });
        // Skip executing actions this iteration
        continue;
      } else {
        logger.info(`Agent loop completed after ${iteration + 1} iteration(s)`);
        break;
      }
    }

    let shouldContinue = false;

    for (const [index, action] of actions.entries()) {
      logger.info(`Executing action ${index + 1}/${actions.length}: ${action.action}`);
      const result = await executeAction(action, logger, { fs, cwd });
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
}
