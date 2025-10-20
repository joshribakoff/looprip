/**
 * Schema parsing and validation types
 */

export type SchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | { array: SchemaType }
  | { object: Record<string, SchemaType> };

export interface ParsedSchema {
  type: string;
  validate: (value: any) => { valid: boolean; errors?: string[] };
  toJsonSchema: () => any;
}
