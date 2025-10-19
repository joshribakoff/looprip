/**
 * Base executor interface for running nodes
 */

import { Node, NodeOutput, PipelineState, ExecutionContext } from '../types/index.js';

export interface NodeExecutor {
  execute(
    node: Node,
    state: PipelineState,
    context: ExecutionContext
  ): Promise<NodeOutput>;
}
