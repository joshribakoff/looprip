/**
 * Colorful logger utility with emojis
 */

import chalk from 'chalk';

export class Logger {
  constructor(private verbose: boolean = false) {}

  // Section headers
  section(title: string) {
    console.log('\n' + chalk.bold.cyan('━'.repeat(60)));
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.bold.cyan('━'.repeat(60)));
  }

  // Pipeline-level messages
  pipelineStart(name: string, description?: string) {
    console.log('\n' + chalk.bold.magenta('🚀 Starting Pipeline'));
    console.log(chalk.white(`   ${name}`));
    if (description) {
      console.log(chalk.gray(`   ${description}`));
    }
  }

  pipelineSuccess(nodeCount: number, totalTime: number, filesChanged: number) {
    console.log('\n' + chalk.bold.cyan('━'.repeat(60)));
    console.log(chalk.bold.green('✓ Pipeline Completed Successfully'));
    console.log(chalk.white(`  Nodes executed: ${chalk.bold(nodeCount.toString())}`));
    console.log(chalk.white(`  Total time: ${chalk.bold(totalTime + 'ms')}`));
    console.log(chalk.white(`  Files changed: ${chalk.bold(filesChanged.toString())}`));
    console.log(chalk.bold.cyan('━'.repeat(60)));
  }

  pipelineFailed() {
    console.log('\n' + chalk.bold.red('━'.repeat(60)));
    console.log(chalk.bold.red('✗ Pipeline Failed'));
    console.log(chalk.bold.red('━'.repeat(60)));
  }

  // Node-level messages
  nodeStart(id: string, type: string, description?: string) {
    const icon = this.getNodeIcon(type);
    console.log('\n' + chalk.bold.blue('┌─ ' + icon + ' Node: ') + chalk.bold.white(id) + chalk.dim(` (${type})`));
    if (description) {
      console.log(chalk.blue('│  ') + chalk.gray(description));
    }
  }

  nodeSuccess(id: string, duration: number) {
    console.log(chalk.bold.blue('└─ ') + chalk.green('✓ Completed') + chalk.gray(` in ${duration}ms`));
  }

  nodeFailed(id: string, error: string, duration: number) {
    console.log(chalk.bold.blue('└─ ') + chalk.red('✗ Failed') + chalk.gray(` after ${duration}ms`));
    console.log(chalk.red('   Error: ') + chalk.white(error));
  }

  // Task-specific messages
  taskCommand(command: string) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim('Executing: ') + chalk.yellow(command));
    }
  }

  taskFilesChanged(files: string[]) {
    if (files.length > 0 && this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim(`Changed ${files.length} file(s)`));
    }
  }

  // Gate-specific messages
  gateCheck(command: string) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim('Gate check: ') + chalk.yellow(command));
    }
  }

  // Agent-specific messages
  agentPrompt(prompt: string) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim('Prompt: ') + chalk.white(prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')));
    }
  }

  agentTools(tools: string[]) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim('Tools: ') + chalk.cyan(tools.join(', ')));
    }
  }

  agentIteration(current: number, max: number) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.dim(`Iteration ${current}/${max}`));
    }
  }

  agentToolCall(toolName: string, input: any) {
    if (this.verbose) {
      console.log(chalk.blue('│  ') + chalk.magenta('🔧 Tool: ') + chalk.white(toolName));
    }
  }

  agentToolResult(result: any) {
    if (this.verbose) {
      const preview = JSON.stringify(result).slice(0, 100);
      console.log(chalk.blue('│  ') + chalk.dim('   Result: ') + chalk.gray(preview + (JSON.stringify(result).length > 100 ? '...' : '')));
    }
  }

  // Validation messages
  validationStart(path: string) {
    console.log('\n' + chalk.blue('🔍 Validating pipeline: ') + chalk.white(path));
  }

  validationSuccess() {
    console.log(chalk.green('✓ Pipeline is valid\n'));
  }

  validationInfo(label: string, value: string) {
    console.log(chalk.dim(`  ${label}: `) + chalk.white(value));
  }

  validationNode(id: string, type: string, details: string[] = []) {
    console.log(chalk.dim('\n  Node: ') + chalk.white(id) + chalk.dim(` (${type})`));
    details.forEach(detail => {
      console.log(chalk.dim('    ' + detail));
    });
  }

  // Loading messages
  loading(message: string) {
    console.log(chalk.blue('📂 ' + message));
  }

  // Info messages
  info(message: string) {
    console.log(chalk.blue('ℹ  ') + chalk.white(message));
  }

  // Warning messages
  warning(message: string) {
    console.log(chalk.yellow('⚠  ' + message));
  }

  // Error messages
  error(message: string, details?: string) {
    console.log(chalk.red('✗ Error: ') + chalk.white(message));
    if (details && this.verbose) {
      console.log(chalk.gray(details));
    }
  }

  // Dry run messages
  dryRun() {
    console.log(chalk.yellow('\n⚠  Dry run mode - pipeline will not be executed\n'));
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
}
