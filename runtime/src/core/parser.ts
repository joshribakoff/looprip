/**
 * YAML pipeline parser
 */

import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import { Pipeline, Node } from '../types/index.js';

export class PipelineParser {
  async loadFromFile(filePath: string): Promise<Pipeline> {
    const content = await readFile(filePath, 'utf-8');
    return this.parseYaml(content);
  }

  parseYaml(content: string): Pipeline {
    const data = yaml.load(content) as any;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid pipeline YAML: expected object');
    }

    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Invalid pipeline: missing or invalid "nodes" array');
    }

    const pipeline: Pipeline = {
      name: data.name,
      description: data.description,
      nodes: data.nodes.map((node: any, index: number) => this.parseNode(node, index))
    };

    this.validate(pipeline);
    
    return pipeline;
  }

  private parseNode(node: any, index: number): Node {
    if (!node || typeof node !== 'object') {
      throw new Error(`Node at index ${index} is invalid: expected object`);
    }

    if (!node.id || typeof node.id !== 'string') {
      throw new Error(`Node at index ${index} is missing required "id" field`);
    }

    if (!node.type || typeof node.type !== 'string') {
      throw new Error(`Node "${node.id}" is missing required "type" field`);
    }

    switch (node.type) {
      case 'task':
        return this.parseTaskNode(node);
      case 'agent':
        return this.parseAgentNode(node);
      case 'gate':
        return this.parseGateNode(node);
      default:
        throw new Error(`Node "${node.id}" has invalid type: ${node.type}`);
    }
  }

  private parseTaskNode(node: any): Node {
    if (!node.command || typeof node.command !== 'string') {
      throw new Error(`Task node "${node.id}" is missing required "command" field`);
    }

    return {
      id: node.id,
      type: 'task',
      description: node.description,
      command: node.command,
      cwd: node.cwd,
      env: node.env,
      track_changes: node.track_changes ?? false
    };
  }

  private parseAgentNode(node: any): Node {
    if (!node.prompt || typeof node.prompt !== 'string') {
      throw new Error(`Agent node "${node.id}" is missing required "prompt" field`);
    }

    if (!node.tools || !Array.isArray(node.tools)) {
      throw new Error(`Agent node "${node.id}" is missing required "tools" array`);
    }

    if (!node.output_schema || typeof node.output_schema !== 'string') {
      throw new Error(`Agent node "${node.id}" is missing required "output_schema" field`);
    }

    return {
      id: node.id,
      type: 'agent',
      description: node.description,
      model: node.model,
      prompt: node.prompt,
      tools: node.tools,
      output_schema: node.output_schema,
      context: node.context
    };
  }

  private parseGateNode(node: any): Node {
    if (!node.command || typeof node.command !== 'string') {
      throw new Error(`Gate node "${node.id}" is missing required "command" field`);
    }

    return {
      id: node.id,
      type: 'gate',
      description: node.description,
      command: node.command,
      message: node.message
    };
  }

  private validate(pipeline: Pipeline): void {
    const nodeIds = new Set<string>();
    
    for (const node of pipeline.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }
}
