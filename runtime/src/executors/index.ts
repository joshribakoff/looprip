/**
 * Main pipeline executor
 */

import { Pipeline, PipelineState, ExecutionContext, NodeOutput, Node } from '../types/index.js';
import { NodeExecutor } from './base.js';
import { TaskExecutor } from './task.js';
import { AgentExecutor } from './agent.js';
import { GateExecutor } from './gate.js';
import { Logger } from '../utils/logger.js';

export class PipelineExecutor {
  private taskExecutor: TaskExecutor;
  private agentExecutor: AgentExecutor;
  private gateExecutor: GateExecutor;
  private logger: Logger;

  constructor(anthropicApiKey?: string, logger?: Logger) {
    this.logger = logger || new Logger();
    this.taskExecutor = new TaskExecutor(this.logger);
    this.agentExecutor = new AgentExecutor(anthropicApiKey, this.logger);
    this.gateExecutor = new GateExecutor(this.logger);
  }

  async execute(
    pipeline: Pipeline,
    context: ExecutionContext,
  ): Promise<{ success: boolean; outputs: NodeOutput[] }> {
    const state: PipelineState = {
      nodes: {},
      changedFiles: new Set(),
      workingDirectory: context.workingDirectory,
      userPrompt: context.userPrompt,
    };

    const outputs: NodeOutput[] = [];

    this.logger.pipelineStart(pipeline.name || 'Unnamed', pipeline.description);

    for (const node of pipeline.nodes) {
      this.logger.nodeStart(node.id, node.type, node.description);

      const executor = this.getExecutor(node);
      const output = await executor.execute(node, state, context);

      outputs.push(output);
      state.nodes[node.id] = output;

      if (output.success) {
        this.logger.nodeSuccess(node.id, output.duration);
      } else {
        this.logger.nodeFailed(node.id, output.error || 'Unknown error', output.duration);
        this.logger.pipelineFailed();

        // Gates and failed nodes stop the pipeline
        return { success: false, outputs };
      }
    }

    const totalTime = outputs.reduce((sum, o) => sum + o.duration, 0);
    this.logger.pipelineSuccess(outputs.length, totalTime, state.changedFiles.size);

    return { success: true, outputs };
  }

  private getExecutor(node: Node): NodeExecutor {
    switch (node.type) {
      case 'task':
        return this.taskExecutor;
      case 'agent':
        return this.agentExecutor;
      case 'gate':
        return this.gateExecutor;
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }
}
