#!/usr/bin/env node

/**
 * CLI entry point for agent-pipeline
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { PipelineParser } from '../core/parser.js';
import { PipelineExecutor } from '../executors/index.js';
import { Logger } from '../utils/logger.js';
import { RunManager } from '../utils/runManager.js';
import { RunLogger } from '../utils/runLogger.js';
import { bold, dim, gray, green, red, yellow } from '../utils/terminalStyles.js';
import path from 'path';
import { render } from 'ink';
import React from 'react';
import { InteractiveApp } from './ui/InteractiveApp.js';
import { createPrompt } from './createPrompt.js';

const program = new Command();

program.name('p').description('Execute agentic pipeline YAML configurations').version('0.1.0');

program
  .command('run')
  .description('Execute a pipeline')
  .argument('<pipeline>', 'Path to pipeline YAML file')
  .option('-p, --prompt <text>', 'User prompt to pass to agent nodes')
  .option('-v, --verbose', 'Show detailed execution info', false)
  .option('--dry-run', 'Validate pipeline without executing', false)
  .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .action(async (pipelinePath: string, options: any) => {
    const absolutePath = resolve(process.cwd(), pipelinePath);

    // For dry-run, use simple logger without RunManager
    if (options.dryRun) {
      const logger = new Logger(options.verbose);
      logger.loading(`Loading pipeline: ${absolutePath}`);

      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);

      logger.info('Pipeline validated successfully');
      logger.dryRun();
      console.log(bold('Pipeline Structure:'));
      logger.validationInfo('Name', pipeline.name || 'Unnamed');
      logger.validationInfo('Nodes', pipeline.nodes.length.toString());
      for (const node of pipeline.nodes) {
        console.log(dim(`  • ${node.id}`) + gray(` (${node.type})`));
      }
      return;
    }

    // For actual execution, use RunManager and RunLogger
    const runManager = new RunManager();
    let runId: string | undefined;
    let logger: Logger = new Logger(options.verbose);

    try {
      logger.loading(`Loading pipeline: ${absolutePath}`);

      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);

      logger.info('Pipeline validated successfully');

      // Create a run and use RunLogger
      const run = await runManager.createRun(
        absolutePath,
        pipeline.name || 'Unnamed Pipeline',
        options.prompt,
      );
      runId = run.id;
      logger = new RunLogger(runId, runManager, options.verbose);

      console.log(gray(`Run ID: ${runId}`));
      console.log(gray(`Logs: ${runManager.getPlainLogsPath(runId)}`));

      await runManager.updateRunStatus(runId, 'running');

      const executor = new PipelineExecutor(options.apiKey, logger);
      const context = {
        workingDirectory: process.cwd(),
        environment: {},
        userPrompt: options.prompt,
        verbose: options.verbose,
      };

      const result = await executor.execute(pipeline, context);

      // Flush logger to ensure all logs are written
      if (logger instanceof RunLogger) {
        await logger.flush();
      }

      if (result.success) {
        await runManager.updateRunStatus(runId, 'completed');
        process.exit(0);
      } else {
        await runManager.updateRunStatus(runId, 'failed', 'Pipeline execution failed');
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(error.message, error.stack);
      if (runId) {
        await runManager.updateRunStatus(runId, 'failed', error.message);
        if (logger instanceof RunLogger) {
          await logger.flush();
        }
      }
      process.exit(1);
    }
  });

// Prompt creation command: fast scaffold of a Markdown prompt file
const promptCmd = program.command('prompt').description('Prompt utilities');

promptCmd
  .command('create')
  .description('Create a new prompt Markdown file')
  .argument('[nameOrPath]', 'Bare name (without .md) or a relative/absolute path')
  .option('-d, --dir <dir>', 'Directory to place prompt when using a bare name', 'prompts')
  .option('--open', 'Open the created file in VS Code', false)
  .action(async (nameOrPath: string | undefined, options: any) => {
    const { filePath, created } = await createPrompt({
      cwd: process.cwd(),
      input: nameOrPath,
      dir: options.dir,
      openInEditor: !!options.open,
    });
    const rel = path.relative(process.cwd(), filePath) || filePath;
    if (created) {
      console.log(green('Created:'), rel);
    } else {
      console.log(yellow('Exists:'), rel);
    }
    // Print absolute path so terminals can cmd-click
    console.log(path.resolve(filePath));
  });

// (removed unused helper findPipelineFiles)

// Interactive mode: pick command, then pick pipeline, then execute
program
  .command('interactive')
  .description('Interactive mode: pick a pipeline and run it')
  .action(async () => {
    // If the terminal is non-interactive, bail out
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      console.error(red('Interactive mode requires a TTY terminal.'));
      process.exit(2);
    }

    // Clear the terminal and prepare for full-screen mode
    process.stdout.write('\x1b[2J\x1b[H');

    const { waitUntilExit } = render(React.createElement(InteractiveApp));
    await waitUntilExit();
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
      console.log(bold('Pipeline Structure:'));
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
const isCI =
  !!process.env.CI &&
  String(process.env.CI).toLowerCase() !== 'false' &&
  String(process.env.CI) !== '0';

const hasSubcommand = process.argv.length > 2;

if (!hasSubcommand && process.stdout.isTTY && process.stdin.isTTY && !isCI) {
  // Inject the interactive command
  await program.parseAsync([process.argv[0], process.argv[1], 'interactive']);
} else {
  program.parse();
}
