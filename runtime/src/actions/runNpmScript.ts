import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const allowedScripts = ['runtime:build', 'runtime:test', 'runtime:lint'] as const;

export type AllowedScript = typeof allowedScripts[number];

interface BooleanFlagConfig {
  type: 'boolean';
  flag: string;
  description?: string;
}

interface StringFlagConfig {
  type: 'string';
  flag?: string;
  description?: string;
  allowEmpty?: boolean;
}

type FlagConfig = BooleanFlagConfig | StringFlagConfig;

interface ScriptConfig {
  npmScript: string;
  cwd: string;
  allowedFlags?: Record<string, FlagConfig>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const STDOUT_LIMIT = 6000;
const STDERR_LIMIT = 4000;

function resolveRepoRoot(): string {
  let current = process.cwd();

  while (true) {
    const pkgPath = path.join(current, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, unknown> };
        if (pkg.scripts && typeof pkg.scripts === 'object' && 'runtime:test' in pkg.scripts) {
          return current;
        }
      } catch {
        // ignore parse errors and continue walking up
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return process.cwd();
    }

    current = parent;
  }
}

const repoRoot = resolveRepoRoot();

const scriptConfigs: Record<AllowedScript, ScriptConfig> = {
  'runtime:build': {
    npmScript: 'runtime:build',
    cwd: repoRoot,
  },
  'runtime:test': {
    npmScript: 'runtime:test',
    cwd: repoRoot,
    allowedFlags: {
      watch: { type: 'boolean', flag: '--watch', description: 'Run Vitest in watch mode.' },
      ui: { type: 'boolean', flag: '--ui', description: 'Launch the Vitest UI.' },
      run: { type: 'boolean', flag: '--run', description: 'Force a single-run execution.' },
      filter: { type: 'string', flag: '--filter', description: 'Run tests matching a filter pattern.' },
      testNamePattern: { type: 'string', flag: '--testNamePattern', description: 'Only run tests with matching names.' },
      file: { type: 'string', description: 'Path to a specific test file or glob.' },
    },
  },
  'runtime:lint': {
    npmScript: 'runtime:lint',
    cwd: repoRoot,
    allowedFlags: {
      fix: { type: 'boolean', flag: '--fix', description: 'Attempt to automatically fix lint issues.' },
    },
  },
};

export const runNpmScriptArgsSchema = z
  .object({
    script: z.enum(allowedScripts),
    flags: z.record(z.union([z.string(), z.boolean()])).optional(),
  })
  .transform((value) => ({
    script: value.script,
    flags: value.flags ?? {},
  }));

export type RunNpmScriptArgs = z.infer<typeof runNpmScriptArgsSchema>;

export interface RunNpmScriptResult {
  script: AllowedScript;
  npmScript: string;
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stdoutOverflow: number;
  stderrTruncated: boolean;
  stderrOverflow: number;
}

function buildScriptArgs(config: ScriptConfig, flags: Record<string, string | boolean>): string[] {
  const extraArgs: string[] = [];
  if (!config.allowedFlags) {
    if (Object.keys(flags).length > 0) {
      const provided = Object.keys(flags).sort().join(', ');
      throw new Error(`Script ${config.npmScript} does not accept flags. Received: ${provided}`);
    }
    return extraArgs;
  }

  for (const [flagName, rawValue] of Object.entries(flags)) {
    const flagConfig = config.allowedFlags[flagName];
    if (!flagConfig) {
      throw new Error(`Flag "${flagName}" is not allowed for script ${config.npmScript}`);
    }

    if (flagConfig.type === 'boolean') {
      if (typeof rawValue !== 'boolean') {
        throw new Error(`Flag "${flagName}" expects a boolean value.`);
      }

      if (rawValue) {
        extraArgs.push(flagConfig.flag);
      }

      continue;
    }

    if (typeof rawValue !== 'string') {
      throw new Error(`Flag "${flagName}" expects a string value.`);
    }

    if (!rawValue && !flagConfig.allowEmpty) {
      throw new Error(`Flag "${flagName}" requires a non-empty string.`);
    }

    if (flagConfig.flag) {
      extraArgs.push(flagConfig.flag);
    }

    extraArgs.push(rawValue);
  }

  return extraArgs;
}

function collectStream(
  stream: NodeJS.ReadableStream | null | undefined,
  limit: number,
): () => { value: string; truncated: boolean; overflow: number } {
  if (!stream) {
    return () => ({ value: '', truncated: false, overflow: 0 });
  }

  let collected = '';
  let totalLength = 0;
  let truncated = false;

  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    totalLength += chunk.length;
    if (truncated) {
      return;
    }

    if (collected.length + chunk.length <= limit) {
      collected += chunk;
      return;
    }

    const remaining = Math.max(0, limit - collected.length);
    if (remaining > 0) {
      collected += chunk.slice(0, remaining);
    }
    truncated = true;
  });

  return () => ({
    value: collected,
    truncated,
    overflow: Math.max(0, totalLength - collected.length),
  });
}

export async function runNpmScriptAction(rawArgs: RunNpmScriptArgs): Promise<RunNpmScriptResult> {
  const args = rawArgs;
  const config = scriptConfigs[args.script];
  if (!config) {
    throw new Error(`Script ${args.script} is not allowed.`);
  }

  const extraArgs = buildScriptArgs(config, args.flags);
  const npmArgs = ['run', config.npmScript];
  if (extraArgs.length > 0) {
    npmArgs.push('--', ...extraArgs);
  }

  const child = spawn('npm', npmArgs, {
    cwd: config.cwd,
    env: { ...process.env },
  });

  const readStdout = collectStream(child.stdout, STDOUT_LIMIT);
  const readStderr = collectStream(child.stderr, STDERR_LIMIT);

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, timeoutMs);

  return await new Promise<RunNpmScriptResult>((resolve, reject) => {
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);

      const stdoutState = readStdout();
      const stderrState = readStderr();

      resolve({
        script: args.script,
        npmScript: config.npmScript,
        command: 'npm',
        args: npmArgs,
        cwd: config.cwd,
        exitCode: code,
        signal,
        timedOut,
        stdout: stdoutState.value,
        stderr: stderrState.value,
        stdoutTruncated: stdoutState.truncated,
        stdoutOverflow: stdoutState.overflow,
        stderrTruncated: stderrState.truncated,
        stderrOverflow: stderrState.overflow,
      });
    });
  });
}
