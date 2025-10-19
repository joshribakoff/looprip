/**
 * Schema parser and validator
 * 
 * Parses schema strings like:
 * - "string"
 * - "number"
 * - "boolean"
 * - "array<string>"
 * - "array<{source: string, destination: string}>"
 */

import { ParsedSchema } from '../types/index.js';

export class SchemaParser {
  parse(schemaStr: string): ParsedSchema {
    const trimmed = schemaStr.trim();
    
    // Handle primitive types
    if (trimmed === 'string') {
      return this.createPrimitiveSchema('string');
    }
    if (trimmed === 'number') {
      return this.createPrimitiveSchema('number');
    }
    if (trimmed === 'boolean') {
      return this.createPrimitiveSchema('boolean');
    }
    
    // Handle array types
    const arrayMatch = trimmed.match(/^array<(.+)>$/);
    if (arrayMatch) {
      const innerType = arrayMatch[1].trim();
      return this.createArraySchema(innerType);
    }
    
    // Handle object types
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.createObjectSchema(trimmed);
    }
    
    throw new Error(`Invalid schema: ${schemaStr}`);
  }

  private createPrimitiveSchema(type: 'string' | 'number' | 'boolean'): ParsedSchema {
    return {
      type,
      validate: (value: any) => {
        const valid = typeof value === type;
        return {
          valid,
          errors: valid ? undefined : [`Expected ${type}, got ${typeof value}`]
        };
      },
      toJsonSchema: () => ({ type })
    };
  }

  private createArraySchema(innerTypeStr: string): ParsedSchema {
    const innerSchema = this.parse(innerTypeStr);
    
    return {
      type: 'array',
      validate: (value: any) => {
        if (!Array.isArray(value)) {
          return {
            valid: false,
            errors: [`Expected array, got ${typeof value}`]
          };
        }
        
        const errors: string[] = [];
        for (let i = 0; i < value.length; i++) {
          const result = innerSchema.validate(value[i]);
          if (!result.valid) {
            errors.push(`Item ${i}: ${result.errors?.join(', ')}`);
          }
        }
        
        return {
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined
        };
      },
      toJsonSchema: () => ({
        type: 'array',
        items: innerSchema.toJsonSchema()
      })
    };
  }

  private createObjectSchema(schemaStr: string): ParsedSchema {
    // Parse object schema like {source: string, destination: string}
    const content = schemaStr.slice(1, -1).trim();
    const properties: Record<string, ParsedSchema> = {};
    const required: string[] = [];
    
    if (content) {
      // Simple parser for comma-separated key: type pairs
      const pairs = this.splitObjectProperties(content);
      
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) {
          throw new Error(`Invalid object property: ${pair}`);
        }
        
        const key = pair.slice(0, colonIndex).trim();
        const typeStr = pair.slice(colonIndex + 1).trim();
        
        properties[key] = this.parse(typeStr);
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      validate: (value: any) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return {
            valid: false,
            errors: [`Expected object, got ${typeof value}`]
          };
        }
        
        const errors: string[] = [];
        
        // Check required properties
        for (const key of required) {
          if (!(key in value)) {
            errors.push(`Missing required property: ${key}`);
          } else {
            const result = properties[key].validate(value[key]);
            if (!result.valid) {
              errors.push(`Property "${key}": ${result.errors?.join(', ')}`);
            }
          }
        }
        
        return {
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined
        };
      },
      toJsonSchema: () => ({
        type: 'object',
        properties: Object.entries(properties).reduce((acc, [key, schema]) => {
          acc[key] = schema.toJsonSchema();
          return acc;
        }, {} as Record<string, any>),
        required
      })
    };
  }

  private splitObjectProperties(content: string): string[] {
    const pairs: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{' || char === '<') {
        depth++;
      } else if (char === '}' || char === '>') {
        depth--;
      } else if (char === ',' && depth === 0) {
        pairs.push(current.trim());
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      pairs.push(current.trim());
    }
    
    return pairs;
  }
}
