# Integration Tests

This directory contains integration tests that spawn child processes and test the full pipeline execution flow.

## Structure

- `validation.test.ts` - Tests that validate all example pipelines
- `execution.test.ts` - Tests that execute pipelines and verify their behavior

## Running Tests

```bash
# Run only unit tests (fast, no process spawning)
npm run test:unit

# Run only integration tests (slower, spawns processes)
npm run test:integration

# Run all tests (unit + integration)
npm run test:all
```

## Configuration

Integration tests use a separate vitest config (`vitest.integration.config.ts`) to isolate them from unit tests.

## Adding New Integration Tests

When adding a new integration test:

1. Create a new test file in this directory with the `.test.ts` extension
2. Import vitest utilities: `import { describe, it, expect } from 'vitest'`
3. Use `execSync` to spawn the CLI process
4. Clean up any files created during tests using `afterEach` hooks

Example:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');
const cliPath = join(rootDir, 'runtime/dist/cli/index.js');

describe('My Integration Test', () => {
  afterEach(() => {
    // Clean up test files
  });

  it('should do something', () => {
    expect(() => {
      execSync(`node ${cliPath} run path/to/pipeline.yaml`, {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
```
