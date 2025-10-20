import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');
const cliPath = join(rootDir, 'runtime/src/cli/index.ts');

describe('Pipeline Execution', () => {
  describe('simple-task-test', () => {
    it('should execute successfully', () => {
      const pipelinePath = join(rootDir, 'examples/simple-task-test/pipeline.yaml');

      expect(() => {
        execSync(`npx tsx ${cliPath} run ${pipelinePath}`, {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });

  describe('file-tracking-test', () => {
    const testFilePath = join(rootDir, 'test-file.txt');

    afterEach(() => {
      // Clean up test file if it exists
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    });

    it('should track file creation correctly', () => {
      const pipelinePath = join(rootDir, 'examples/file-tracking-test/pipeline.yaml');

      expect(() => {
        execSync(`npx tsx ${cliPath} run ${pipelinePath}`, {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });

  describe('gate-test', () => {
    it('should pass quality gates', () => {
      const pipelinePath = join(rootDir, 'examples/gate-test/pipeline.yaml');

      expect(() => {
        execSync(`npx tsx ${cliPath} run ${pipelinePath}`, {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });

  describe('gate-failure-test', () => {
    const badFilePath = join(rootDir, 'bad.js');

    afterEach(() => {
      // Clean up bad.js if it exists
      if (existsSync(badFilePath)) {
        unlinkSync(badFilePath);
      }
    });

    it('should fail when quality gates are not met', () => {
      const pipelinePath = join(rootDir, 'examples/gate-failure-test/pipeline.yaml');

      expect(() => {
        execSync(`npx tsx ${cliPath} run ${pipelinePath}`, {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });
});
