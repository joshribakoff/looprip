import type { Provider } from '../config.js';
import { callAnthropicModel, type ConversationEntry as AnthropicEntry } from './anthropic.js';
import { callOpenAIModel, type ConversationEntry as OpenAIEntry } from './openai.js';

export type ConversationEntry = AnthropicEntry | OpenAIEntry;

export async function callModel(
  provider: Provider,
  systemPrompt: string,
  history: ConversationEntry[],
): Promise<string> {
  console.log('[agent] calling  model:', provider);

  if (provider === 'openai') {
    return callOpenAIModel(systemPrompt, history);
  }

  return callAnthropicModel(systemPrompt, history);
}
