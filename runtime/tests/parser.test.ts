import { describe, it, expect } from 'vitest';
import { PipelineParser } from '../src/core/parser.js';

describe('PipelineParser', () => {
  const parser = new PipelineParser();

  describe('valid pipelines', () => {
    it('should parse a simple task pipeline', () => {
      const yaml = `
name: test-pipeline
description: A test pipeline
nodes:
  - id: task1
    type: task
    command: echo hello
`;

      const pipeline = parser.parseYaml(yaml);
      expect(pipeline.name).toBe('test-pipeline');
      expect(pipeline.description).toBe('A test pipeline');
      expect(pipeline.nodes).toHaveLength(1);
      expect(pipeline.nodes[0].id).toBe('task1');
      expect(pipeline.nodes[0].type).toBe('task');
    });

    it('should parse an agent node', () => {
      const yaml = `
nodes:
  - id: agent1
    type: agent
    prompt: Do something
    tools: [file_read, file_write]
    output_schema: string
`;

      const pipeline = parser.parseYaml(yaml);
      expect(pipeline.nodes).toHaveLength(1);
      expect(pipeline.nodes[0].type).toBe('agent');
      const agentNode = pipeline.nodes[0] as any;
      expect(agentNode.prompt).toBe('Do something');
      expect(agentNode.tools).toEqual(['file_read', 'file_write']);
      expect(agentNode.output_schema).toBe('string');
    });

    it('should parse a gate node', () => {
      const yaml = `
nodes:
  - id: gate1
    type: gate
    command: npm test
    message: Tests failed
`;

      const pipeline = parser.parseYaml(yaml);
      expect(pipeline.nodes).toHaveLength(1);
      expect(pipeline.nodes[0].type).toBe('gate');
      const gateNode = pipeline.nodes[0] as any;
      expect(gateNode.command).toBe('npm test');
      expect(gateNode.message).toBe('Tests failed');
    });

    it('should parse multiple nodes', () => {
      const yaml = `
nodes:
  - id: task1
    type: task
    command: echo hello
  - id: task2
    type: task
    command: echo world
`;

      const pipeline = parser.parseYaml(yaml);
      expect(pipeline.nodes).toHaveLength(2);
      expect(pipeline.nodes[0].id).toBe('task1');
      expect(pipeline.nodes[1].id).toBe('task2');
    });
  });

  describe('validation errors', () => {
    it('should reject pipeline without nodes', () => {
      const yaml = `
name: test
description: test
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing or invalid "nodes" array');
    });

    it('should reject node without id', () => {
      const yaml = `
nodes:
  - type: task
    command: echo hello
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "id" field');
    });

    it('should reject node without type', () => {
      const yaml = `
nodes:
  - id: task1
    command: echo hello
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "type" field');
    });

    it('should reject task node without command', () => {
      const yaml = `
nodes:
  - id: task1
    type: task
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "command" field');
    });

    it('should reject agent node without prompt', () => {
      const yaml = `
nodes:
  - id: agent1
    type: agent
    tools: [file_read]
    output_schema: string
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "prompt" field');
    });

    it('should reject agent node without tools', () => {
      const yaml = `
nodes:
  - id: agent1
    type: agent
    prompt: Do something
    output_schema: string
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "tools" array');
    });

    it('should reject agent node without output_schema', () => {
      const yaml = `
nodes:
  - id: agent1
    type: agent
    prompt: Do something
    tools: [file_read]
`;

      expect(() => parser.parseYaml(yaml)).toThrow('missing required "output_schema" field');
    });

    it('should reject duplicate node IDs', () => {
      const yaml = `
nodes:
  - id: task1
    type: task
    command: echo hello
  - id: task1
    type: task
    command: echo world
`;

      expect(() => parser.parseYaml(yaml)).toThrow('Duplicate node ID: task1');
    });

    it('should reject unknown node type', () => {
      const yaml = `
nodes:
  - id: unknown1
    type: unknown
    command: echo hello
`;

      expect(() => parser.parseYaml(yaml)).toThrow('invalid type: unknown');
    });
  });
});
