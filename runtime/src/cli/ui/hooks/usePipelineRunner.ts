import { useMemo } from 'react';
import { PipelineExecutor } from '../../../executors/index.js';
import { Logger } from '../../../utils/logger.js';

type ExecuteContext = {
  cwd: string;
  userPrompt?: string;
};

export function usePipelineRunner() {
  const logger = useMemo(() => new Logger(false), []);
  const executor = useMemo(() => new PipelineExecutor(process.env.ANTHROPIC_API_KEY, logger), [logger]);

  async function executePipeline(pipeline: any, ctx: ExecuteContext): Promise<{ success: boolean }> {
    const context = {
      workingDirectory: ctx.cwd,
      environment: {},
      userPrompt: ctx.userPrompt,
      verbose: false,
    } as const;
    const result = await executor.execute(pipeline, context);
    return { success: result.success };
  }

  return { executePipeline } as const;
}

export default usePipelineRunner;
