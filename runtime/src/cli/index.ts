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

const program = new Command();

program
  .name('agent-pipeline')
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

program.parse();
