/**
 * Task node executor - runs shell commands
 */

import { spawn } from 'child_process';
import { stat, readdir } from 'fs/promises';
import { join } from 'path';
import { TaskNode, NodeOutput, PipelineState, ExecutionContext } from '../types/index.js';
import { NodeExecutor } from './base.js';
import { TemplateEngine } from '../core/template.js';
import { Logger } from '../utils/logger.js';

export class TaskExecutor implements NodeExecutor {
  private templateEngine = new TemplateEngine();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async execute(
    node: TaskNode,
    state: PipelineState,
    context: ExecutionContext,
  ): Promise<NodeOutput> {
    const startTime = Date.now();

    try {
      // Interpolate command with current state
      const command = this.templateEngine.interpolate(node.command, state);

      this.logger.taskCommand(command);

      // Get file modification times before execution if tracking changes
      const beforeFiles = node.track_changes
        ? await this.getFileTimestamps(node.cwd || context.workingDirectory)
        : new Map();

      // Execute the command
      const output = await this.runCommand(command, node.cwd || context.workingDirectory, {
        ...context.environment,
        ...node.env,
      });

      // Detect changed files if tracking enabled
      const changedFiles = node.track_changes
        ? await this.detectChangedFiles(node.cwd || context.workingDirectory, beforeFiles)
        : [];

      // Update global changed files set
      for (const file of changedFiles) {
        state.changedFiles.add(file);
      }

      this.logger.taskFilesChanged(changedFiles);

      const endTime = Date.now();

      return {
        nodeId: node.id,
        type: 'task',
        success: true,
        output: output.stdout,
        changedFiles,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    } catch (error: any) {
      const endTime = Date.now();

      return {
        nodeId: node.id,
        type: 'task',
        success: false,
        error: error.message,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    }
  }

  private runCommand(
    command: string,
    cwd: string,
    env: Record<string, string>,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        this.logger.writeStdout(text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        this.logger.writeStderr(text);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async getFileTimestamps(dir: string): Promise<Map<string, number>> {
    const timestamps = new Map<string, number>();

    try {
      await this.walkDirectory(dir, async (filePath) => {
        try {
          const stats = await stat(filePath);
          timestamps.set(filePath, stats.mtimeMs);
        } catch {
          // Ignore files we can't stat
        }
      });
    } catch {
      // Ignore errors walking directory
    }

    return timestamps;
  }

  private async detectChangedFiles(
    dir: string,
    beforeFiles: Map<string, number>,
  ): Promise<string[]> {
    const changedFiles: string[] = [];

    await this.walkDirectory(dir, async (filePath) => {
      try {
        const stats = await stat(filePath);
        const beforeTime = beforeFiles.get(filePath);

        if (!beforeTime || stats.mtimeMs > beforeTime) {
          changedFiles.push(filePath);
        }
      } catch {
        // Ignore files we can't stat
      }
    });

    return changedFiles;
  }

  private async walkDirectory(
    dir: string,
    callback: (filePath: string) => Promise<void>,
  ): Promise<void> {
    // Skip node_modules and hidden directories
    const basename = dir.split('/').pop() || '';
    if (basename.startsWith('.') || basename === 'node_modules') {
      return;
    }

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, callback);
        } else if (entry.isFile()) {
          await callback(fullPath);
        }
      }
    } catch {
      // Ignore directories we can't read
    }
  }
}
