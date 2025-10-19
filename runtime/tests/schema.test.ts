import { describe, it, expect } from 'vitest';
import { SchemaParser } from '../src/core/schema.js';

describe('SchemaParser', () => {
  const parser = new SchemaParser();

  describe('primitive types', () => {
    it('should parse string schema', () => {
      const schema = parser.parse('string');
      expect(schema.type).toBe('string');
      expect(schema.validate('hello').valid).toBe(true);
      expect(schema.validate(123).valid).toBe(false);
    });

    it('should parse number schema', () => {
      const schema = parser.parse('number');
      expect(schema.type).toBe('number');
      expect(schema.validate(123).valid).toBe(true);
      expect(schema.validate('hello').valid).toBe(false);
    });

    it('should parse boolean schema', () => {
      const schema = parser.parse('boolean');
      expect(schema.type).toBe('boolean');
      expect(schema.validate(true).valid).toBe(true);
      expect(schema.validate('true').valid).toBe(false);
    });
  });

  describe('array types', () => {
    it('should parse array<string> schema', () => {
      const schema = parser.parse('array<string>');
      expect(schema.type).toBe('array');
      expect(schema.validate(['a', 'b']).valid).toBe(true);
      expect(schema.validate([1, 2]).valid).toBe(false);
      expect(schema.validate('not array').valid).toBe(false);
    });

    it('should parse array<number> schema', () => {
      const schema = parser.parse('array<number>');
      expect(schema.validate([1, 2, 3]).valid).toBe(true);
      expect(schema.validate(['a', 'b']).valid).toBe(false);
    });
  });

  describe('object types', () => {
    it('should parse simple object schema', () => {
      const schema = parser.parse('{name: string, age: number}');
      expect(schema.type).toBe('object');
      
      const valid = { name: 'John', age: 30 };
      expect(schema.validate(valid).valid).toBe(true);
      
      const invalid1 = { name: 'John' };
      expect(schema.validate(invalid1).valid).toBe(false);
      
      const invalid2 = { name: 'John', age: 'thirty' };
      expect(schema.validate(invalid2).valid).toBe(false);
    });

    it('should parse nested array in object', () => {
      const schema = parser.parse('{items: array<string>}');
      
      const valid = { items: ['a', 'b', 'c'] };
      expect(schema.validate(valid).valid).toBe(true);
      
      const invalid = { items: [1, 2, 3] };
      expect(schema.validate(invalid).valid).toBe(false);
    });
  });

  describe('array of objects', () => {
    it('should parse array<{...}> schema', () => {
      const schema = parser.parse('array<{source: string, destination: string}>');
      expect(schema.type).toBe('array');
      
      const valid = [
        { source: 'a.txt', destination: 'b.txt' },
        { source: 'c.txt', destination: 'd.txt' }
      ];
      expect(schema.validate(valid).valid).toBe(true);
      
      const invalid = [
        { source: 'a.txt' }
      ];
      expect(schema.validate(invalid).valid).toBe(false);
    });
  });

  describe('JSON schema generation', () => {
    it('should generate JSON schema for primitives', () => {
      const schema = parser.parse('string');
      expect(schema.toJsonSchema()).toEqual({ type: 'string' });
    });

    it('should generate JSON schema for arrays', () => {
      const schema = parser.parse('array<number>');
      expect(schema.toJsonSchema()).toEqual({
        type: 'array',
        items: { type: 'number' }
      });
    });

    it('should generate JSON schema for objects', () => {
      const schema = parser.parse('{name: string, count: number}');
      const jsonSchema = schema.toJsonSchema();
      
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties.name).toEqual({ type: 'string' });
      expect(jsonSchema.properties.count).toEqual({ type: 'number' });
      expect(jsonSchema.required).toEqual(['name', 'count']);
    });
  });
});
