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
import { render } from 'ink';
import React from 'react';
import { InteractiveApp } from './ui/InteractiveApp.js';

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

    const {waitUntilExit} = render(React.createElement(InteractiveApp));
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
