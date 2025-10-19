/**
 * Core type definitions for the agent pipeline runtime
 */

export interface Pipeline {
  name?: string;
  description?: string;
  nodes: Node[];
}

export type Node = TaskNode | AgentNode | GateNode;

export interface BaseNode {
  id: string;
  type: 'task' | 'agent' | 'gate';
  description?: string;
}

export interface TaskNode extends BaseNode {
  type: 'task';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  track_changes?: boolean;
}

export interface AgentNode extends BaseNode {
  type: 'agent';
  model?: string;
  prompt: string;
  tools: string[];
  output_schema: string;
  context?: {
    include_changed_files?: boolean;
    include_previous_outputs?: boolean;
  };
}

export interface GateNode extends BaseNode {
  type: 'gate';
  command: string;
  message?: string;
}

export interface PipelineState {
  nodes: Record<string, NodeOutput>;
  changedFiles: Set<string>;
  workingDirectory: string;
  userPrompt?: string;
}

export interface NodeOutput {
  nodeId: string;
  type: string;
  success: boolean;
  output?: any;
  error?: string;
  changedFiles?: string[];
  startTime: number;
  endTime: number;
  duration: number;
}

export interface ExecutionContext {
  workingDirectory: string;
  environment: Record<string, string>;
  userPrompt?: string;
  verbose: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any, context: ExecutionContext) => Promise<any>;
}
