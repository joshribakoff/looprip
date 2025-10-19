/**
 * Template engine for interpolating variables in strings
 *
 * Supports:
 * - {{variable}} - Simple variable substitution
 * - {{node.output}} - Accessing node outputs
 * - {{node.property.nested}} - Nested property access
 * - {{array[].prop}} - Array expansion
 */

import { PipelineState } from '../types/index.js';

export class TemplateEngine {
  interpolate(template: string, state: PipelineState): string {
    const pattern = /\{\{([^}]+)\}\}/g;

    return template.replace(pattern, (match, expression) => {
      const value = this.resolveExpression(expression.trim(), state);

      if (value === undefined || value === null) {
        throw new Error(`Unable to resolve template expression: ${expression}`);
      }

      // Handle array values - join them with spaces
      if (Array.isArray(value)) {
        return value.join(' ');
      }

      // Handle objects - convert to JSON
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  private resolveExpression(expression: string, state: PipelineState): any {
    // Handle special variables
    if (expression === 'changed_files') {
      return Array.from(state.changedFiles);
    }

    if (expression === 'prompt') {
      return state.userPrompt;
    }

    // Handle node references like "plan.output" or "plan.files_to_move[].source"
    const parts = expression.split('.');

    if (parts.length === 0) {
      return undefined;
    }

    // First part should be a node ID
    const nodeId = parts[0];
    const nodeOutput = state.nodes[nodeId];

    if (!nodeOutput) {
      return undefined;
    }

    // If just the node ID, return the full output
    if (parts.length === 1) {
      return nodeOutput.output;
    }

    // Navigate through the path
    let current = nodeOutput.output;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      // Handle array expansion like "files_to_move[].source"
      if (part.endsWith('[]')) {
        const arrayProp = part.slice(0, -2);

        if (!Array.isArray(current[arrayProp])) {
          return undefined;
        }

        // Get remaining path
        const remainingPath = parts.slice(i + 1);

        if (remainingPath.length === 0) {
          return current[arrayProp];
        }

        // Map over array and get nested properties
        return current[arrayProp].map((item: any) => {
          let value = item;
          for (const prop of remainingPath) {
            value = value?.[prop];
          }
          return value;
        });
      }

      current = current?.[part];

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }
}
