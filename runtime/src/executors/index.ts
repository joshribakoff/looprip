/**
 * Main pipeline executor
 */

import { Pipeline, PipelineState, ExecutionContext, NodeOutput, Node } from '../types/index.js';
import { NodeExecutor } from './base.js';
import { TaskExecutor } from './task.js';
import { AgentExecutor } from './agent.js';
import { GateExecutor } from './gate.js';

export class PipelineExecutor {
  private taskExecutor = new TaskExecutor();
  private agentExecutor: AgentExecutor;
  private gateExecutor = new GateExecutor();

  constructor(anthropicApiKey?: string) {
    this.agentExecutor = new AgentExecutor(anthropicApiKey);
  }

  async execute(
    pipeline: Pipeline,
    context: ExecutionContext
  ): Promise<{ success: boolean; outputs: NodeOutput[] }> {
    const state: PipelineState = {
      nodes: {},
      changedFiles: new Set(),
      workingDirectory: context.workingDirectory,
      userPrompt: context.userPrompt
    };

    const outputs: NodeOutput[] = [];

    console.log(`\nExecuting pipeline: ${pipeline.name || 'Unnamed'}`);
    if (pipeline.description) {
      console.log(`Description: ${pipeline.description}`);
    }
    console.log(`Nodes: ${pipeline.nodes.length}\n`);

    for (const node of pipeline.nodes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Node: ${node.id} (${node.type})`);
      if (node.description) {
        console.log(`Description: ${node.description}`);
      }
      console.log('='.repeat(60));

      const executor = this.getExecutor(node);
      const output = await executor.execute(node, state, context);
      
      outputs.push(output);
      state.nodes[node.id] = output;

      if (output.success) {
        console.log(`✓ ${node.id} completed in ${output.duration}ms`);
      } else {
        console.error(`✗ ${node.id} failed: ${output.error}`);
        
        // Gates and failed nodes stop the pipeline
        return { success: false, outputs };
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Pipeline completed successfully');
    console.log(`Total nodes: ${outputs.length}`);
    console.log(`Total time: ${outputs.reduce((sum, o) => sum + o.duration, 0)}ms`);
    console.log(`Files changed: ${state.changedFiles.size}`);
    console.log('='.repeat(60));

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
