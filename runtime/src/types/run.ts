/**
 * Types for managing pipeline runs and their artifacts
 */

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted';

export interface RunMetadata {
  id: string;
  pipelinePath: string;
  pipelineName: string;
  userPrompt?: string;
  status: RunStatus;
  createdAt: string; // ISO 8601 UTC timestamp
  startedAt?: string; // ISO 8601 UTC timestamp
  completedAt?: string; // ISO 8601 UTC timestamp
  error?: string;
  artifactsDir: string;
}

export interface LogEntry {
  timestamp: string; // ISO 8601 UTC timestamp
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string; // e.g., 'pipeline', 'node', 'agent', 'tool'
  message: string;
  data?: Record<string, any>;
}

export interface ToolCallLogEntry extends LogEntry {
  category: 'tool';
  data: {
    toolName: string;
    input: any;
    output?: any;
    error?: string;
  };
}

export interface NodeExecutionLogEntry extends LogEntry {
  category: 'node';
  data: {
    nodeId: string;
    nodeType: string;
    phase: 'start' | 'success' | 'failed';
    duration?: number;
    error?: string;
  };
}

export interface AgentIterationLogEntry extends LogEntry {
  category: 'agent';
  data: {
    iteration: number;
    maxIterations: number;
    action?: string;
  };
}

export type StructuredLogEntry = 
  | LogEntry 
  | ToolCallLogEntry 
  | NodeExecutionLogEntry 
  | AgentIterationLogEntry;
