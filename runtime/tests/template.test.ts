import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../src/core/template.js';
import { PipelineState } from '../src/types/index.js';

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  describe('simple variables', () => {
    it('should interpolate changed_files', () => {
      const state: PipelineState = {
        nodes: {},
        changedFiles: new Set(['file1.txt', 'file2.txt']),
        workingDirectory: '/test',
        userPrompt: 'test'
      };

      const result = engine.interpolate('{{changed_files}}', state);
      expect(result).toBe('file1.txt file2.txt');
    });

    it('should interpolate prompt', () => {
      const state: PipelineState = {
        nodes: {},
        changedFiles: new Set(),
        workingDirectory: '/test',
        userPrompt: 'Hello World'
      };

      const result = engine.interpolate('{{prompt}}', state);
      expect(result).toBe('Hello World');
    });
  });

  describe('node outputs', () => {
    it('should access node output', () => {
      const state: PipelineState = {
        nodes: {
          plan: {
            nodeId: 'plan',
            type: 'agent',
            success: true,
            output: { result: 'test-value' },
            startTime: 0,
            endTime: 0,
            duration: 0
          }
        },
        changedFiles: new Set(),
        workingDirectory: '/test'
      };

      const result = engine.interpolate('{{plan.result}}', state);
      expect(result).toBe('test-value');
    });

    it('should access nested properties', () => {
      const state: PipelineState = {
        nodes: {
          plan: {
            nodeId: 'plan',
            type: 'agent',
            success: true,
            output: {
              config: {
                nested: {
                  value: 'deep'
                }
              }
            },
            startTime: 0,
            endTime: 0,
            duration: 0
          }
        },
        changedFiles: new Set(),
        workingDirectory: '/test'
      };

      const result = engine.interpolate('{{plan.config.nested.value}}', state);
      expect(result).toBe('deep');
    });
  });

  describe('array expansion', () => {
    it('should expand array properties', () => {
      const state: PipelineState = {
        nodes: {
          plan: {
            nodeId: 'plan',
            type: 'agent',
            success: true,
            output: {
              files_to_move: [
                { source: 'a.txt', destination: 'b.txt' },
                { source: 'c.txt', destination: 'd.txt' }
              ]
            },
            startTime: 0,
            endTime: 0,
            duration: 0
          }
        },
        changedFiles: new Set(),
        workingDirectory: '/test'
      };

      const result = engine.interpolate('{{plan.files_to_move[].source}}', state);
      expect(result).toBe('a.txt c.txt');
    });

    it('should handle nested array property access', () => {
      const state: PipelineState = {
        nodes: {
          plan: {
            nodeId: 'plan',
            type: 'agent',
            success: true,
            output: {
              items: [
                { config: { path: '/a' } },
                { config: { path: '/b' } }
              ]
            },
            startTime: 0,
            endTime: 0,
            duration: 0
          }
        },
        changedFiles: new Set(),
        workingDirectory: '/test'
      };

      const result = engine.interpolate('{{plan.items[].config.path}}', state);
      expect(result).toBe('/a /b');
    });
  });

  describe('multiple interpolations', () => {
    it('should handle multiple variables in one string', () => {
      const state: PipelineState = {
        nodes: {
          step1: {
            nodeId: 'step1',
            type: 'task',
            success: true,
            output: 'value1',
            startTime: 0,
            endTime: 0,
            duration: 0
          },
          step2: {
            nodeId: 'step2',
            type: 'task',
            success: true,
            output: 'value2',
            startTime: 0,
            endTime: 0,
            duration: 0
          }
        },
        changedFiles: new Set(),
        workingDirectory: '/test'
      };

      const result = engine.interpolate('{{step1}} and {{step2}}', state);
      expect(result).toBe('value1 and value2');
    });
  });
});
