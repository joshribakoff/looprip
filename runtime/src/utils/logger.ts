/**
 * Colorful logger utility with emojis
 */

import {
  bold,
  blue,
  cyan,
  dim,
  gray,
  green,
  magenta,
  red,
  white,
  yellow,
} from './terminalStyles.js';

export class Logger {
  constructor(private verbose: boolean = false) {}

  // Section headers
  section(title: string) {
    console.log('\n' + bold(cyan('━'.repeat(60))));
    console.log(bold(cyan(`  ${title}`)));
    console.log(bold(cyan('━'.repeat(60))));
  }

  // Pipeline-level messages
  pipelineStart(name: string, description?: string) {
    console.log('\n' + bold(magenta('🚀 Starting Pipeline')));
    console.log(white(`   ${name}`));
    if (description) {
      console.log(gray(`   ${description}`));
    }
  }

  pipelineSuccess(nodeCount: number, totalTime: number, filesChanged: number) {
    console.log('\n' + bold(cyan('━'.repeat(60))));
    console.log(bold(green('✓ Pipeline Completed Successfully')));
    console.log(white(`  Nodes executed: ${bold(nodeCount.toString())}`));
    console.log(white(`  Total time: ${bold(totalTime + 'ms')}`));
    console.log(white(`  Files changed: ${bold(filesChanged.toString())}`));
    console.log(bold(cyan('━'.repeat(60))));
  }

  pipelineFailed() {
    console.log('\n' + bold(red('━'.repeat(60))));
    console.log(bold(red('✗ Pipeline Failed')));
    console.log(bold(red('━'.repeat(60))));
  }

  // Node-level messages
  nodeStart(id: string, type: string, description?: string) {
    const icon = this.getNodeIcon(type);
    console.log('\n' + bold(blue('┌─ ' + icon + ' Node: ')) + bold(white(id)) + dim(` (${type})`));
    if (description) {
      console.log(blue('│  ') + gray(description));
    }
  }

  nodeSuccess(id: string, duration: number) {
    console.log(bold(blue('└─ ')) + green('✓ Completed') + gray(` in ${duration}ms`));
  }

  nodeFailed(id: string, error: string, duration: number) {
    console.log(bold(blue('└─ ')) + red('✗ Failed') + gray(` after ${duration}ms`));
    console.log(red('   Error: ') + white(error));
  }

  // Task-specific messages
  taskCommand(command: string) {
    if (this.verbose) {
      console.log(blue('│  ') + dim('Executing: ') + yellow(command));
    }
  }

  taskFilesChanged(files: string[]) {
    if (files.length > 0 && this.verbose) {
      console.log(blue('│  ') + dim(`Changed ${files.length} file(s)`));
    }
  }

  // Gate-specific messages
  gateCheck(command: string) {
    if (this.verbose) {
      console.log(blue('│  ') + dim('Gate check: ') + yellow(command));
    }
  }

  // Agent-specific messages
  agentPrompt(prompt: string) {
    if (this.verbose) {
      console.log(blue('│  ') + dim('Prompt: ') + white(prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')));
    }
  }

  agentTools(tools: string[]) {
    if (this.verbose) {
      console.log(blue('│  ') + dim('Tools: ') + cyan(tools.join(', ')));
    }
  }

  agentIteration(current: number, max: number) {
    if (this.verbose) {
      console.log(blue('│  ') + dim(`Iteration ${current}/${max}`));
    }
  }

  agentToolCall(toolName: string, input?: any) {
    if (!this.verbose) {
      return;
    }

    let detail = '';
    if (input && typeof input === 'object') {
      const path = typeof input.path === 'string' ? input.path : typeof input.file_path === 'string' ? input.file_path : undefined;
      if (path) {
        detail = gray(` (${path})`);
      } else {
        const keys = Object.keys(input).filter(key => key !== 'content');
        if (keys.length > 0) {
          detail = gray(` (${keys.join(', ')})`);
        }
      }
    }

    console.log(blue('│  ') + magenta('🔧 Tool: ') + white(toolName) + detail);
  }

  agentToolResult(result: any) {
    if (!this.verbose) {
      return;
    }

    if (result && typeof result === 'object' && !Array.isArray(result)) {
      if (typeof result.content === 'string') {
        console.log(blue('│  ') + dim('   Result: ') + gray(`content length ${result.content.length}`));
        return;
      }

      if ('success' in result && typeof result.success === 'boolean' && Object.keys(result).length === 1) {
        console.log(blue('│  ') + dim('   Result: ') + gray(result.success ? 'success' : 'failed'));
        return;
      }
    }

    const serialized = JSON.stringify(result);
    if (typeof serialized === 'string') {
      const preview = serialized.slice(0, 100);
      console.log(blue('│  ') + dim('   Result: ') + gray(preview + (serialized.length > 100 ? '...' : '')));
    } else {
      console.log(blue('│  ') + dim('   Result: ') + gray(String(result)));
    }
  }

  agentJsonRetry(error: string, attempt: number, max: number) {
    if (this.verbose) {
      console.log(blue('│  ') + yellow(`Invalid JSON, retry ${attempt}/${max}`) + (error ? gray(` (${error})`) : ''));
    } else {
      console.log(blue('│  ') + yellow(`Invalid JSON, retry ${attempt}/${max}`));
    }
  }

  // Validation messages
  validationStart(path: string) {
    console.log('\n' + blue('🔍 Validating pipeline: ') + white(path));
  }

  validationSuccess() {
    console.log(green('✓ Pipeline is valid\n'));
  }

  validationInfo(label: string, value: string) {
    console.log(dim(`  ${label}: `) + white(value));
  }

  validationNode(id: string, type: string, details: string[] = []) {
    console.log(dim('\n  Node: ') + white(id) + dim(` (${type})`));
    details.forEach(detail => {
      console.log(dim('    ' + detail));
    });
  }

  // Loading messages
  loading(message: string) {
    console.log(blue('📂 ' + message));
  }

  // Info messages
  info(message: string) {
    console.log(blue('ℹ  ') + white(message));
  }

  // Warning messages
  warning(message: string) {
    console.log(yellow('⚠  ' + message));
  }

  // Error messages
  error(message: string, details?: string) {
    console.log(red('✗ Error: ') + white(message));
    if (details && this.verbose) {
      console.log(gray(details));
    }
  }

  // Dry run messages
  dryRun() {
    console.log(yellow('\n⚠  Dry run mode - pipeline will not be executed\n'));
  }

  // Helper to get node icon
  private getNodeIcon(type: string): string {
    switch (type) {
      case 'task':
        return '⚙️ ';
      case 'agent':
        return '🤖';
      case 'gate':
        return '🚦';
      default:
        return '📦';
    }
  }

  // Stream writers used by executors; override in Ink mode to avoid writing to TTY directly
  writeStdout(text: string) {
    process.stdout.write(text);
  }

  writeStderr(text: string) {
    process.stderr.write(text);
  }
}
