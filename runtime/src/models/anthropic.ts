import Anthropic from '@anthropic-ai/sdk';

import { config } from '../config.js';

export type ConversationEntry = {
  role: 'user' | 'assistant';
  content: string;
};

export async function callAnthropicModel(
  systemPrompt: string,
  history: ConversationEntry[],
): Promise<string> {
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
