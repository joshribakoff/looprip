import { useMemo } from 'react';
import { PipelineExecutor } from '../../../executors/index.js';
import { Logger } from '../../../utils/logger.js';

type ExecuteContext = {
  cwd: string;
  userPrompt?: string;
};

export function usePipelineRunner(logger?: Logger) {
  const effectiveLogger = useMemo(() => logger ?? new Logger(false), [logger]);
  const executor = useMemo(() => new PipelineExecutor(process.env.ANTHROPIC_API_KEY, effectiveLogger), [effectiveLogger]);

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
