/**
 * Logger that writes both structured JSONL and plain text logs to disk
 * Extends the base Logger class to maintain compatibility
 */

import { Logger } from './logger.js';
import { RunManager } from './runManager.js';
import { LogEntry, StructuredLogEntry } from '../types/run.js';

export class RunLogger extends Logger {
  private runId: string;
  private runManager: RunManager;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(runId: string, runManager: RunManager, verbose: boolean = false) {
    super(verbose);
    this.runId = runId;
    this.runManager = runManager;
  }

  /**
   * Create a structured log entry with UTC timestamp
   */
  private createEntry(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: Record<string, any>
  ): StructuredLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
  }

  /**
   * Log a message at the given level with structured output
   * Uses a queue to ensure writes happen in order and don't get dropped
   */
  private logStructured(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: Record<string, any>
  ): void {
    const entry = this.createEntry(level, category, message, data);

    // Queue the write operation to ensure it completes
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        // Write to structured log
        await this.runManager.appendStructuredLog(this.runId, entry);

        // Write to plain text log
        const plainMessage = data 
          ? `[${level.toUpperCase()}] [${category}] ${message} ${JSON.stringify(data)}`
          : `[${level.toUpperCase()}] [${category}] ${message}`;
        await this.runManager.appendPlainLog(this.runId, plainMessage);
      } catch (error) {
        // Log to console if file write fails
        console.error('[RunLogger] Failed to write log:', error);
      }
    });
  }

  /**
   * Log at debug level
   */
  debugStructured(category: string, message: string, data?: Record<string, any>): void {
    this.logStructured('debug', category, message, data);
  }

  /**
   * Log at info level
   */
  infoStructured(category: string, message: string, data?: Record<string, any>): void {
    this.logStructured('info', category, message, data);
  }

  /**
   * Log at warn level
   */
  warnStructured(category: string, message: string, data?: Record<string, any>): void {
    this.logStructured('warn', category, message, data);
  }

  /**
   * Log at error level
   */
  errorStructured(category: string, message: string, data?: Record<string, any>): void {
    this.logStructured('error', category, message, data);
  }

  // Override base Logger methods to add structured logging

  // Generic message methods
  override loading(message: string): void {
    super.loading(message);
    this.infoStructured('system', message);
  }

  override info(message: string): void {
    super.info(message);
    this.infoStructured('system', message);
  }

  override warning(message: string): void {
    super.warning(message);
    this.warnStructured('system', message);
  }

  override error(message: string, details?: string): void {
    super.error(message, details);
    this.errorStructured('system', message, details ? { details } : undefined);
  }

  override pipelineStart(name: string, description?: string): void {
    super.pipelineStart(name, description);
    this.infoStructured('pipeline', `Starting pipeline: ${name}`, { description });
  }

  override pipelineSuccess(nodeCount: number, totalTime: number, filesChanged: number): void {
    super.pipelineSuccess(nodeCount, totalTime, filesChanged);
    this.infoStructured('pipeline', 'Pipeline completed successfully', {
      nodeCount,
      totalTime,
      filesChanged,
    });
  }

  override pipelineFailed(): void {
    super.pipelineFailed();
    this.errorStructured('pipeline', 'Pipeline failed');
  }

  override nodeStart(nodeId: string, nodeType: string, description?: string): void {
    super.nodeStart(nodeId, nodeType, description);
    const entry = this.createEntry('info', 'node', `Starting node: ${nodeId}`, {
      nodeId,
      nodeType,
      phase: 'start',
      description,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendStructuredLog(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId, 
        `[INFO] [node] Starting node: ${nodeId} (${nodeType})${description ? ` - ${description}` : ''}`
      );
    });
  }

  override nodeSuccess(nodeId: string, duration: number): void {
    super.nodeSuccess(nodeId, duration);
    const entry = this.createEntry('info', 'node', `Node completed: ${nodeId}`, {
      nodeId,
      nodeType: 'unknown',
      phase: 'success',
      duration,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendStructuredLog(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId,
        `[INFO] [node] Node completed: ${nodeId} (${duration}ms)`
      );
    });
  }

  override nodeFailed(nodeId: string, error: string, duration: number): void {
    super.nodeFailed(nodeId, error, duration);
    const entry = this.createEntry('error', 'node', `Node failed: ${nodeId}`, {
      nodeId,
      nodeType: 'unknown',
      phase: 'failed',
      duration,
      error,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendStructuredLog(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId,
        `[ERROR] [node] Node failed: ${nodeId} - ${error} (${duration}ms)`
      );
    });
  }

  override agentPrompt(prompt: string): void {
    super.agentPrompt(prompt);
    this.debugStructured('agent', 'Agent prompt', { prompt });
  }

  override agentTools(tools: string[]): void {
    super.agentTools(tools);
    this.debugStructured('agent', 'Agent tools', { tools });
  }

  override agentIteration(iteration: number, maxIterations: number): void {
    super.agentIteration(iteration, maxIterations);
    const entry = this.createEntry('info', 'agent', `Agent iteration ${iteration}/${maxIterations}`, {
      iteration,
      maxIterations,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendStructuredLog(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId,
        `[INFO] [agent] Agent iteration ${iteration}/${maxIterations}`
      );
    });
  }

  override agentToolCall(toolName: string, input: any): void {
    super.agentToolCall(toolName, input);
    const entry = this.createEntry('info', 'tool', `Tool call: ${toolName}`, {
      toolName,
      input,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendStructuredLog(this.runId, entry);
      await this.runManager.appendToolCall(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId,
        `[INFO] [tool] Tool call: ${toolName} ${JSON.stringify(input)}`
      );
    });
  }

  override agentToolResult(result: any): void {
    super.agentToolResult(result);
    const entry = this.createEntry('info', 'tool', 'Tool result', {
      toolName: 'unknown',
      output: result,
    });
    this.writeQueue = this.writeQueue.then(async () => {
      await this.runManager.appendToolCall(this.runId, entry);
      await this.runManager.appendPlainLog(
        this.runId,
        `[INFO] [tool] Tool result: ${JSON.stringify(result)}`
      );
    });
  }

  override agentJsonRetry(errorMessage: string, retryCount: number, maxRetries: number): void {
    super.agentJsonRetry(errorMessage, retryCount, maxRetries);
    this.warnStructured('agent', `JSON parsing retry ${retryCount}/${maxRetries}`, {
      errorMessage,
      retryCount,
      maxRetries,
    });
  }

  /**
   * Flush all pending writes - call this before the process exits
   */
  async flush(): Promise<void> {
    await this.writeQueue;
  }

  /**
   * Get log file paths for display in UI
   */
  getLogPaths(): { structured: string; plain: string; toolCalls: string } {
    return {
      structured: this.runManager.getStructuredLogsPath(this.runId),
      plain: this.runManager.getPlainLogsPath(this.runId),
      toolCalls: this.runManager.getToolCallsPath(this.runId),
    };
  }
}
