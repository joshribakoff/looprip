import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');
const examplesDir = join(rootDir, 'examples');
const cliPath = join(rootDir, 'runtime/src/cli/index.ts');

/**
 * Find all pipeline.yaml files in the examples directory
 */
function findExamplePipelines(): { name: string; path: string }[] {
  const pipelines: { name: string; path: string }[] = [];

  const entries = readdirSync(examplesDir);
  for (const entry of entries) {
    const entryPath = join(examplesDir, entry);
    if (statSync(entryPath).isDirectory()) {
      const pipelinePath = join(entryPath, 'pipeline.yaml');
      try {
        statSync(pipelinePath);
        pipelines.push({ name: entry, path: pipelinePath });
      } catch {
        // No pipeline.yaml in this directory, skip
      }
    }
  }

  return pipelines;
}

describe('Pipeline Validation', () => {
  const pipelines = findExamplePipelines();

  it('should find example pipelines', () => {
    expect(pipelines.length).toBeGreaterThan(0);
  });

  describe('validate all example pipelines', () => {
    pipelines.forEach(({ name, path }) => {
      it(`should validate ${name}`, () => {
        expect(() => {
          execSync(`npx tsx ${cliPath} validate ${path}`, {
            cwd: rootDir,
            encoding: 'utf-8',
            stdio: 'pipe',
          });
        }).not.toThrow();
      });
    });
  });
});
