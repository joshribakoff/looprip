#!/usr/bin/env node

/**
 * CLI entry point for agent-pipeline
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { PipelineParser } from '../core/parser.js';
import { PipelineExecutor } from '../executors/index.js';
import { Logger } from '../utils/logger.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import prompts from 'prompts';

const program = new Command();

program
  .name('p')
  .description('Execute agentic pipeline YAML configurations')
  .version('0.1.0');

program
  .command('run')
  .description('Execute a pipeline')
  .argument('<pipeline>', 'Path to pipeline YAML file')
  .option('-p, --prompt <text>', 'User prompt to pass to agent nodes')
  .option('-v, --verbose', 'Show detailed execution info', false)
  .option('--dry-run', 'Validate pipeline without executing', false)
  .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .action(async (pipelinePath: string, options: any) => {
    const logger = new Logger(options.verbose);
    
    try {
      const absolutePath = resolve(process.cwd(), pipelinePath);
      
      logger.loading(`Loading pipeline: ${absolutePath}`);
      
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);
      
      logger.info('Pipeline validated successfully');
      
      if (options.dryRun) {
        logger.dryRun();
        console.log(chalk.bold('Pipeline Structure:'));
        logger.validationInfo('Name', pipeline.name || 'Unnamed');
        logger.validationInfo('Nodes', pipeline.nodes.length.toString());
        for (const node of pipeline.nodes) {
          console.log(chalk.dim(`  • ${node.id}`) + chalk.gray(` (${node.type})`));
        }
        return;
      }
      
      const executor = new PipelineExecutor(options.apiKey, logger);
      const context = {
        workingDirectory: process.cwd(),
        environment: {},
        userPrompt: options.prompt,
        verbose: options.verbose
      };
      
      const result = await executor.execute(pipeline, context);
      
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(error.message, error.stack);
      process.exit(1);
    }
  });

// Helper: recursively find pipeline files (pipeline.yaml|yml) under cwd
async function findPipelineFiles(baseDir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // ignore unreadable dirs
    }
    await Promise.all(entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and dist for speed
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') return;
        await walk(full);
      } else if (entry.isFile()) {
        if (/^pipeline\.ya?ml$/i.test(entry.name)) {
          results.push(full);
        }
      }
    }));
  }
  await walk(baseDir);
  return results.sort();
}

// Interactive mode: pick command, then pick pipeline, then execute
program
  .command('interactive')
  .description('Interactive mode: pick a pipeline and run it')
  .action(async () => {
    // If the terminal is non-interactive, bail out
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      console.error(chalk.red('Interactive mode requires a TTY terminal.'));
      process.exit(2);
    }

    // State to enable looping until Ctrl+C
    let shouldExit = false;
    const onCancel = () => {
      // prompts will abort current question; we mark exit and let loop break
      shouldExit = true;
      return true;
    };

    // Remember last selections to preselect next time
    let lastSelectedIndex = 0;
    let lastCustomPath: string | undefined;
    let lastPromptInput: string | undefined;

    const cwd = process.cwd();

    // Also handle raw SIGINT to exit between prompts or during execution
    const sigintHandler = () => {
      shouldExit = true;
      // Add a newline to keep UI clean if ^C is pressed mid-line
      process.stdout.write('\n');
    };
    process.on('SIGINT', sigintHandler);

    try {
      // Main interactive loop
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (shouldExit) break;

        // Find pipelines on each iteration to reflect new files
        const found = await findPipelineFiles(cwd);
        type PipelineChoice = { title: string; value: string };
        const choices: PipelineChoice[] = [
          ...found.map((abs) => ({ title: path.relative(cwd, abs) || abs, value: abs } as PipelineChoice)),
          { title: 'Enter custom path…', value: '__custom__' }
        ];

        // Guard: no choices at all (very unlikely since we always include custom)
        if (choices.length === 0) {
          console.log(chalk.yellow('No pipeline files found. Press Ctrl+C to exit.'));
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const pipelineAnswer = await prompts(
          {
            type: 'select',
            name: 'pipeline',
            message: 'Select a pipeline file',
            choices,
            initial: Math.min(Math.max(lastSelectedIndex, 0), choices.length - 1)
          },
          { onCancel }
        );
        if (shouldExit) break;

        let selected = pipelineAnswer.pipeline as string | undefined;
        if (!selected) {
          // If user just hit enter and there are no answers, fallback to last index
          selected = choices[Math.min(Math.max(lastSelectedIndex, 0), choices.length - 1)].value;
        }

        // Persist selection index for next loop
        lastSelectedIndex = choices.findIndex((c) => c.value === selected);
        if (lastSelectedIndex < 0) lastSelectedIndex = 0;

        // Handle custom path entry
        if (selected === '__custom__') {
          const custom = await prompts(
            {
              type: 'text',
              name: 'path',
              message: 'Enter path to pipeline YAML',
              initial: lastCustomPath,
              validate: (input: string) => (input?.trim().length ? true : 'Path is required')
            },
            { onCancel }
          );
          if (shouldExit) break;
          lastCustomPath = (custom.path as string)?.trim();
          selected = resolve(cwd, lastCustomPath || '');
          // Update lastSelectedIndex to point at custom item
          lastSelectedIndex = choices.length - 1;
        }

        const pipelinePath = resolve(cwd, selected!);
        const exists = await fs
          .stat(pipelinePath)
          .then((s) => s.isFile())
          .catch(() => false);
        if (!exists) {
          console.error(chalk.red(`Pipeline not found: ${pipelinePath}`));
          // Brief pause so the message is visible, then continue loop
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // Load pipeline to determine if any variables are required (e.g. {{prompt}})
        const logger = new Logger(false);
        try {
          logger.loading(`Loading pipeline: ${pipelinePath}`);
          const parser = new PipelineParser();
          const pipeline = await parser.loadFromFile(pipelinePath);
          logger.info('Pipeline validated successfully');

          // Detect whether the pipeline template strings reference {{prompt}}
          const pipelineNeedsPrompt = (() => {
            const containsPromptVar = (val: any): boolean => {
              if (typeof val === 'string') return val.includes('{{prompt}}');
              if (Array.isArray(val)) return val.some(containsPromptVar);
              if (val && typeof val === 'object') return Object.values(val).some(containsPromptVar);
              return false;
            };
            return containsPromptVar(pipeline);
          })();

          let userPrompt: string | undefined = lastPromptInput;
          if (pipelineNeedsPrompt) {
            const ans = await prompts(
              {
                type: 'text',
                name: 'prompt',
                message: 'Enter prompt (required by this pipeline)',
                initial: lastPromptInput,
                validate: (input: string) => (input?.trim().length ? true : 'Prompt is required')
              },
              { onCancel }
            );
            if (shouldExit) break;
            userPrompt = (ans.prompt as string)?.trim();
            lastPromptInput = userPrompt;
          } else {
            // Clear last prompt if pipeline doesn't require one
            userPrompt = undefined;
          }

          const executor = new PipelineExecutor(process.env.ANTHROPIC_API_KEY, logger);
          const context = {
            workingDirectory: process.cwd(),
            environment: {},
            userPrompt,
            verbose: false
          };

          const result = await executor.execute(pipeline, context);
          // Print result summary and loop again without exiting
          console.log(result.success ? chalk.green('✔ Pipeline completed') : chalk.red('✖ Pipeline failed'));
          // Small separator for readability
          console.log();
          // Continue loop; last selection stays preselected so Enter reruns
          continue;
        } catch (error: any) {
          const logger2 = new Logger(false);
          logger2.error(error.message, error.stack);
          // Continue the loop to allow trying again
          continue;
        }
      }
    } finally {
      process.off('SIGINT', sigintHandler);
      console.log(chalk.yellow('Exiting interactive mode.'));
    }
  });

program
  .command('validate')
  .description('Validate a pipeline without executing it')
  .argument('<pipeline>', 'Path to pipeline YAML file')
  .action(async (pipelinePath: string) => {
    const logger = new Logger(true);
    
    try {
      const absolutePath = resolve(process.cwd(), pipelinePath);
      
      logger.validationStart(absolutePath);
      
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);
      
      logger.validationSuccess();
      console.log(chalk.bold('Pipeline Structure:'));
      logger.validationInfo('Name', pipeline.name || 'Unnamed');
      logger.validationInfo('Description', pipeline.description || 'None');
      logger.validationInfo('Nodes', pipeline.nodes.length.toString());
      
      for (const node of pipeline.nodes) {
        const details: string[] = [];
        
        if (node.description) {
          details.push(`Description: ${node.description}`);
        }
        
        if (node.type === 'task') {
          details.push(`Command: ${node.command}`);
        } else if (node.type === 'agent') {
          details.push(`Tools: ${node.tools.join(', ')}`);
          details.push(`Output Schema: ${node.output_schema}`);
        } else if (node.type === 'gate') {
          details.push(`Command: ${node.command}`);
        }
        
        logger.validationNode(node.id, node.type, details);
      }
      
      process.exit(0);
    } catch (error: any) {
      logger.error('Validation failed', error.message);
      process.exit(1);
    }
  });

// Default behavior: if no subcommand is provided and we're in a TTY and not CI,
// automatically enter interactive mode. Otherwise, use standard parsing.
const isCI = !!process.env.CI && String(process.env.CI).toLowerCase() !== 'false' && String(process.env.CI) !== '0';

const hasSubcommand = process.argv.length > 2;

if (!hasSubcommand && process.stdout.isTTY && process.stdin.isTTY && !isCI) {
  // Inject the interactive command
  await program.parseAsync([process.argv[0], process.argv[1], 'interactive']);
} else {
  program.parse();
}
