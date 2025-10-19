import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { config } from '../config.js';

export type ConversationEntry = {
  role: 'user' | 'assistant';
  content: string;
};

export async function callOpenAIModel(
  systemPrompt: string,
  history: ConversationEntry[],
): Promise<string> {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for the OpenAI provider.');
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
  ];

  const completion = await client.chat.completions.create({
    model: config.openaiModel,
    messages,
    temperature: 0,
  });

  const choice = completion.choices?.[0]?.message?.content;
  if (!choice) {
    throw new Error('OpenAI returned an empty response.');
  }

  return choice.trim();
}
