#!/usr/bin/env node

/**
 * CLI entry point for agent-pipeline
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { PipelineParser } from '../core/parser.js';
import { PipelineExecutor } from '../executors/index.js';
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
    try {
      const absolutePath = resolve(process.cwd(), pipelinePath);
      
      console.log(chalk.blue(`Loading pipeline: ${absolutePath}`));
      
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);
      
      console.log(chalk.green('✓ Pipeline validated successfully'));
      
      if (options.dryRun) {
        console.log(chalk.yellow('Dry run mode - pipeline will not be executed'));
        console.log('\nPipeline structure:');
        console.log(`  Name: ${pipeline.name || 'Unnamed'}`);
        console.log(`  Nodes: ${pipeline.nodes.length}`);
        for (const node of pipeline.nodes) {
          console.log(`    - ${node.id} (${node.type})`);
        }
        return;
      }
      
      const executor = new PipelineExecutor(options.apiKey);
      const context = {
        workingDirectory: process.cwd(),
        environment: {},
        userPrompt: options.prompt,
        verbose: options.verbose
      };
      
      const result = await executor.execute(pipeline, context);
      
      if (result.success) {
        console.log(chalk.green('\n✓ Pipeline completed successfully'));
        process.exit(0);
      } else {
        console.error(chalk.red('\n✗ Pipeline failed'));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a pipeline without executing it')
  .argument('<pipeline>', 'Path to pipeline YAML file')
  .action(async (pipelinePath: string) => {
    try {
      const absolutePath = resolve(process.cwd(), pipelinePath);
      
      console.log(chalk.blue(`Validating pipeline: ${absolutePath}`));
      
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(absolutePath);
      
      console.log(chalk.green('✓ Pipeline is valid'));
      console.log('\nPipeline structure:');
      console.log(`  Name: ${pipeline.name || 'Unnamed'}`);
      console.log(`  Description: ${pipeline.description || 'None'}`);
      console.log(`  Nodes: ${pipeline.nodes.length}`);
      
      for (const node of pipeline.nodes) {
        console.log(`\n  Node: ${node.id}`);
        console.log(`    Type: ${node.type}`);
        if (node.description) {
          console.log(`    Description: ${node.description}`);
        }
        
        if (node.type === 'task') {
          console.log(`    Command: ${node.command}`);
        } else if (node.type === 'agent') {
          console.log(`    Tools: ${node.tools.join(', ')}`);
          console.log(`    Output Schema: ${node.output_schema}`);
        } else if (node.type === 'gate') {
          console.log(`    Command: ${node.command}`);
        }
      }
      
      process.exit(0);
    } catch (error: any) {
      console.error(chalk.red('\n✗ Validation failed:'), error.message);
      process.exit(1);
    }
  });

program.parse();
