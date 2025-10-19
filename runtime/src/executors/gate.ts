/**
 * Gate node executor - validates pipeline quality gates
 */

import { spawn } from 'child_process';
import { GateNode, NodeOutput, PipelineState, ExecutionContext } from '../types/index.js';
import { NodeExecutor } from './base.js';
import { TemplateEngine } from '../core/template.js';

export class GateExecutor implements NodeExecutor {
  private templateEngine = new TemplateEngine();

  async execute(
    node: GateNode,
    state: PipelineState,
    context: ExecutionContext
  ): Promise<NodeOutput> {
    const startTime = Date.now();
    
    try {
      // Interpolate command with current state
      const command = this.templateEngine.interpolate(node.command, state);
      
      if (context.verbose) {
        console.log(`Gate check: ${command}`);
      }
      
      // Execute the command
      await this.runCommand(
        command,
        context.workingDirectory,
        context.environment
      );
      
      const endTime = Date.now();
      
      return {
        nodeId: node.id,
        type: 'gate',
        success: true,
        startTime,
        endTime,
        duration: endTime - startTime
      };
    } catch (error: any) {
      const endTime = Date.now();
      
      return {
        nodeId: node.id,
        type: 'gate',
        success: false,
        error: node.message || error.message,
        startTime,
        endTime,
        duration: endTime - startTime
      };
    }
  }

  private runCommand(
    command: string,
    cwd: string,
    env: Record<string, string>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Gate check failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}
