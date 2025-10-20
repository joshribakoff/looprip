/**
 * Manages pipeline run artifacts, state persistence, and log files
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { RunMetadata, RunStatus, StructuredLogEntry } from '../types/run.js';

export class RunManager {
  private runsBaseDir: string;

  constructor(baseDir?: string) {
    this.runsBaseDir = baseDir || path.join(process.cwd(), '.pipeline-runs');
  }

  /**
   * Create a new run and its artifact directory structure
   */
  async createRun(pipelinePath: string, pipelineName: string, userPrompt?: string): Promise<RunMetadata> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const artifactsDir = path.join(this.runsBaseDir, id);

    await fs.mkdir(artifactsDir, { recursive: true });

    const metadata: RunMetadata = {
      id,
      pipelinePath,
      pipelineName,
      userPrompt,
      status: 'queued',
      createdAt: now,
      artifactsDir,
    };

    await this.saveMetadata(metadata);
    return metadata;
  }

  /**
   * Update run status
   */
  async updateRunStatus(runId: string, status: RunStatus, error?: string): Promise<void> {
    const metadata = await this.loadMetadata(runId);
    const now = new Date().toISOString();

    metadata.status = status;

    if (status === 'running' && !metadata.startedAt) {
      metadata.startedAt = now;
    }

    if (status === 'completed' || status === 'failed' || status === 'interrupted') {
      metadata.completedAt = now;
    }

    if (error) {
      metadata.error = error;
    }

    await this.saveMetadata(metadata);
  }

  /**
   * Save run metadata to JSON file
   */
  async saveMetadata(metadata: RunMetadata): Promise<void> {
    const metadataPath = path.join(metadata.artifactsDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Load run metadata from JSON file
   */
  async loadMetadata(runId: string): Promise<RunMetadata> {
    const artifactsDir = path.join(this.runsBaseDir, runId);
    const metadataPath = path.join(artifactsDir, 'metadata.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List all runs
   */
  async listRuns(): Promise<RunMetadata[]> {
    try {
      const entries = await fs.readdir(this.runsBaseDir, { withFileTypes: true });
      const runs: RunMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const metadata = await this.loadMetadata(entry.name);
            runs.push(metadata);
          } catch {
            // Skip invalid run directories
          }
        }
      }

      // Sort by creation time, newest first
      return runs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get path to structured logs file (JSONL)
   */
  getStructuredLogsPath(runId: string): string {
    return path.join(this.runsBaseDir, runId, 'logs.jsonl');
  }

  /**
   * Get path to plain text logs file
   */
  getPlainLogsPath(runId: string): string {
    return path.join(this.runsBaseDir, runId, 'logs.txt');
  }

  /**
   * Get path to tool calls log file (JSONL)
   */
  getToolCallsPath(runId: string): string {
    return path.join(this.runsBaseDir, runId, 'tool-calls.jsonl');
  }

  /**
   * Append a structured log entry
   */
  async appendStructuredLog(runId: string, entry: StructuredLogEntry): Promise<void> {
    const logPath = this.getStructuredLogsPath(runId);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf-8');
  }

  /**
   * Append a plain text log entry
   */
  async appendPlainLog(runId: string, text: string): Promise<void> {
    const logPath = this.getPlainLogsPath(runId);
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${text}\n`;
    await fs.appendFile(logPath, line, 'utf-8');
  }

  /**
   * Append a tool call entry
   */
  async appendToolCall(runId: string, entry: StructuredLogEntry): Promise<void> {
    const logPath = this.getToolCallsPath(runId);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf-8');
  }

  /**
   * Read all structured log entries for a run
   */
  async readStructuredLogs(runId: string): Promise<StructuredLogEntry[]> {
    try {
      const logPath = this.getStructuredLogsPath(runId);
      const content = await fs.readFile(logPath, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Read plain text logs for a run
   */
  async readPlainLogs(runId: string): Promise<string> {
    try {
      const logPath = this.getPlainLogsPath(runId);
      return await fs.readFile(logPath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  /**
   * Delete a run and all its artifacts
   */
  async deleteRun(runId: string): Promise<void> {
    const artifactsDir = path.join(this.runsBaseDir, runId);
    await fs.rm(artifactsDir, { recursive: true, force: true });
  }

  /**
   * Check if a run can be resumed (interrupted or failed)
   */
  async canResume(runId: string): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata(runId);
      return metadata.status === 'interrupted' || metadata.status === 'failed';
    } catch {
      return false;
    }
  }
}
