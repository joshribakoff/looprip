import 'dotenv/config';

export type Provider = 'openai' | 'anthropic';

export interface AgentRuntimeConfig {
  provider: Provider;
  openaiApiKey?: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  maxIterations: number;
  userPrompt: string;
}

const providerEnv = (process.env.AGENT_PROVIDER ?? process.env.PROVIDER ?? 'openai').toLowerCase();
const provider: Provider = providerEnv === 'anthropic' ? 'anthropic' : 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022';

const maxIterations = Number.parseInt(process.env.AGENT_MAX_ITERATIONS ?? '2', 10);
const safeMaxIterations = Number.isNaN(maxIterations) ? 2 : Math.max(1, Math.min(maxIterations, 5));

const userPrompt = process.env.AGENT_USER_PROMPT ?? 'Refactor utils.ts to use async/await where possible.';

export const config: AgentRuntimeConfig = {
  provider,
  openaiApiKey,
  openaiModel,
  anthropicApiKey,
  anthropicModel,
  maxIterations: safeMaxIterations,
  userPrompt,
};
