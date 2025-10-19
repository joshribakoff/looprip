import { useCallback } from 'react';
import { parsePromptFile } from '../../../core/prompt.js';
import { callModel, type ConversationEntry } from '../../../models/index.js';
import type { Provider } from '../../../config.js';
import { loadSystemPrompt } from '../../../utils/systemPrompt.js';
import type { Logger } from '../../../utils/logger.js';

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
          
          // For now, we'll just log the response
          // In a full implementation, we would parse and execute actions here
          // This is a simplified version to get the integration working
          
          // Check if we should continue
          // For now, we'll just run once and stop
          logger.info(`Agent loop completed after ${iteration + 1} iteration(s)`);
          break;
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
