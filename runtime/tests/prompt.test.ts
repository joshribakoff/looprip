import { describe, it, expect } from 'vitest';
import { parsePromptString, PromptFrontMatterSchema, updatePromptStatus } from '../src/core/prompt.js';

const sample = `---
status: draft
provider: openai
model: gpt-4o-mini
---
Body here
`;

describe('Prompt front matter schema', () => {
  it('validates minimal required fields', () => {
    const parsed = PromptFrontMatterSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('draft');
      expect(parsed.data.provider).toBe('openai');
      expect(parsed.data.model).toBeUndefined();
    }
  });

  it('rejects invalid status', () => {
    const parsed = PromptFrontMatterSchema.safeParse({ status: 'nope' });
    expect(parsed.success).toBe(false);
  });
});

describe('parsePromptString', () => {
  it('parses front matter and body', () => {
    const out = parsePromptString(sample);
    expect(out.frontMatter.status).toBe('draft');
    expect(out.body.trim()).toBe('Body here');
  });
});

describe('updatePromptStatus', () => {
  it('updates status field', () => {
    const updated = updatePromptStatus(sample, 'done');
    const out = parsePromptString(updated);
    expect(out.frontMatter.status).toBe('done');
  });
});
