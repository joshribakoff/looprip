import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

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
  allowUnknownFlags: boolean;
  timeoutMs: number;
}

interface ScriptOverrideInput {
  npmScript?: string | null;
  cwd?: string | null;
  allowedFlags?: Record<string, FlagConfig> | null;
  allowUnknownFlags?: boolean | null;
  timeoutMs?: number | null;
}

export interface RunNpmScriptPolicy {
  allowedScripts?: string[] | null;
  blockedScripts?: string[] | null;
  defaultCwd?: string | null;
  defaultTimeoutMs?: number | null;
  defaultAllowUnknownFlags?: boolean | null;
  scriptOverrides?: Record<string, ScriptOverrideInput | null>;
}

interface NormalizedPolicy {
  allowedScripts?: Set<string>;
  blockedScripts: Set<string>;
  defaultCwd: string;
  defaultTimeoutMs: number;
  defaultAllowUnknownFlags: boolean;
  scriptOverrides: Record<
    string,
    {
      npmScript?: string;
      cwd?: string;
      allowedFlags?: Record<string, FlagConfig>;
      allowUnknownFlags?: boolean;
      timeoutMs?: number;
    }
  >;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const STDOUT_LIMIT = 6000;
const STDERR_LIMIT = 4000;

function resolveRepoRoot(): string {
  let current = process.cwd();
  let lastPackageDir: string | null = null;

  // loop until we find package.json or reach filesystem root
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pkgPath = path.join(current, 'package.json');
    if (existsSync(pkgPath)) {
      lastPackageDir = current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return lastPackageDir ?? process.cwd();
    }

    current = parent;
  }
}

const repoRoot = resolveRepoRoot();

let cachedPackageScripts: string[] | null = null;

function getPackageScripts(): string[] {
  if (cachedPackageScripts) {
    return cachedPackageScripts;
  }

  const packagePath = path.join(repoRoot, 'package.json');
  if (!existsSync(packagePath)) {
    cachedPackageScripts = [];
    return cachedPackageScripts;
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      scripts?: Record<string, unknown>;
    };
    cachedPackageScripts = pkg.scripts ? Object.keys(pkg.scripts) : [];
  } catch {
    cachedPackageScripts = [];
  }

  return cachedPackageScripts;
}

const defaultPolicyOptions: RunNpmScriptPolicy = {
  defaultCwd: repoRoot,
  defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  defaultAllowUnknownFlags: true,
  scriptOverrides: {
    'runtime:build': {
      allowUnknownFlags: false,
      allowedFlags: {},
    },
    'runtime:test': {
      allowUnknownFlags: false,
      allowedFlags: {
        watch: { type: 'boolean', flag: '--watch', description: 'Run Vitest in watch mode.' },
        ui: { type: 'boolean', flag: '--ui', description: 'Launch the Vitest UI.' },
        run: { type: 'boolean', flag: '--run', description: 'Force a single-run execution.' },
        filter: {
          type: 'string',
          flag: '--filter',
          description: 'Run tests matching a filter pattern.',
        },
        testNamePattern: {
          type: 'string',
          flag: '--testNamePattern',
          description: 'Only run tests with matching names.',
        },
        file: { type: 'string', description: 'Path to a specific test file or glob.' },
      },
    },
    'runtime:lint': {
      allowUnknownFlags: false,
      allowedFlags: {
        fix: {
          type: 'boolean',
          flag: '--fix',
          description: 'Attempt to automatically fix lint issues.',
        },
      },
    },
  },
};

function cloneAllowedFlags(
  source: Record<string, FlagConfig> | null | undefined,
): Record<string, FlagConfig> | undefined {
  if (!source) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, { ...value }]),
  ) as Record<string, FlagConfig>;
}

function mergeScriptOverrides(
  base: RunNpmScriptPolicy['scriptOverrides'],
  update: RunNpmScriptPolicy['scriptOverrides'],
): Record<string, ScriptOverrideInput> | undefined {
  if (!base && !update) {
    return undefined;
  }

  const result: Record<string, ScriptOverrideInput> = {};

  if (base) {
    for (const [script, override] of Object.entries(base)) {
      if (override) {
        result[script] = {
          ...override,
          allowedFlags: cloneAllowedFlags(override.allowedFlags),
        };
      }
    }
  }

  if (update) {
    for (const [script, override] of Object.entries(update)) {
      if (!override) {
        delete result[script];
        continue;
      }

      const existing = result[script] ?? {};
      const merged: ScriptOverrideInput = { ...existing };

      if ('npmScript' in override) {
        merged.npmScript = override.npmScript ?? undefined;
      }

      if ('cwd' in override) {
        merged.cwd = override.cwd ?? undefined;
      }

      if ('allowUnknownFlags' in override) {
        merged.allowUnknownFlags = override.allowUnknownFlags ?? undefined;
      }

      if ('timeoutMs' in override) {
        merged.timeoutMs = override.timeoutMs ?? undefined;
      }

      if ('allowedFlags' in override) {
        merged.allowedFlags = cloneAllowedFlags(override.allowedFlags) ?? undefined;
      }

      result[script] = merged;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function mergePolicyOptions(
  base: RunNpmScriptPolicy,
  update: RunNpmScriptPolicy = {},
): RunNpmScriptPolicy {
  return {
    allowedScripts: update.allowedScripts ?? base.allowedScripts ?? undefined,
    blockedScripts: update.blockedScripts ?? base.blockedScripts ?? undefined,
    defaultCwd: update.defaultCwd ?? base.defaultCwd ?? undefined,
    defaultTimeoutMs: update.defaultTimeoutMs ?? base.defaultTimeoutMs ?? undefined,
    defaultAllowUnknownFlags:
      update.defaultAllowUnknownFlags ?? base.defaultAllowUnknownFlags ?? undefined,
    scriptOverrides: mergeScriptOverrides(base.scriptOverrides, update.scriptOverrides),
  };
}

function normalizePolicy(options: RunNpmScriptPolicy): NormalizedPolicy {
  const allowedScripts = options.allowedScripts ? new Set(options.allowedScripts) : undefined;
  const blockedScripts = new Set(options.blockedScripts ?? []);
  const defaultCwd = options.defaultCwd ?? repoRoot;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const defaultAllowUnknownFlags = options.defaultAllowUnknownFlags ?? true;

  const scriptOverrides: NormalizedPolicy['scriptOverrides'] = {};

  if (options.scriptOverrides) {
    for (const [script, override] of Object.entries(options.scriptOverrides)) {
      if (!override) {
        continue;
      }

      scriptOverrides[script] = {
        npmScript: override.npmScript ?? undefined,
        cwd: override.cwd ?? undefined,
        allowedFlags: cloneAllowedFlags(override.allowedFlags),
        allowUnknownFlags: override.allowUnknownFlags ?? undefined,
        timeoutMs: override.timeoutMs ?? undefined,
      };
    }
  }

  return {
    allowedScripts,
    blockedScripts,
    defaultCwd,
    defaultTimeoutMs,
    defaultAllowUnknownFlags,
    scriptOverrides,
  };
}

let currentPolicy = normalizePolicy(defaultPolicyOptions);

export function configureRunNpmScriptPolicy(update: RunNpmScriptPolicy = {}): void {
  currentPolicy = normalizePolicy(mergePolicyOptions(defaultPolicyOptions, update));
}

export function resetRunNpmScriptPolicy(): void {
  currentPolicy = normalizePolicy(defaultPolicyOptions);
}

export function getRunNpmScriptPolicy(): NormalizedPolicy {
  return {
    allowedScripts: currentPolicy.allowedScripts
      ? new Set(currentPolicy.allowedScripts)
      : undefined,
    blockedScripts: new Set(currentPolicy.blockedScripts),
    defaultCwd: currentPolicy.defaultCwd,
    defaultTimeoutMs: currentPolicy.defaultTimeoutMs,
    defaultAllowUnknownFlags: currentPolicy.defaultAllowUnknownFlags,
    scriptOverrides: Object.fromEntries(
      Object.entries(currentPolicy.scriptOverrides).map(([script, override]) => [
        script,
        {
          ...override,
          allowedFlags: override.allowedFlags
            ? cloneAllowedFlags(override.allowedFlags)
            : undefined,
        },
      ]),
    ),
  };
}

function normalizeCliFlag(flag: string): string {
  if (flag.startsWith('-')) {
    return flag;
  }

  return flag.length === 1 ? `-${flag}` : `--${flag}`;
}

function pushConfiguredFlag(
  args: string[],
  flagName: string,
  rawValue: string | boolean,
  flagConfig: FlagConfig,
): void {
  if (flagConfig.type === 'boolean') {
    if (typeof rawValue !== 'boolean') {
      throw new Error(`Flag "${flagName}" expects a boolean value.`);
    }

    if (rawValue) {
      args.push(normalizeCliFlag(flagConfig.flag));
    }
    return;
  }

  if (typeof rawValue !== 'string') {
    throw new Error(`Flag "${flagName}" expects a string value.`);
  }

  if (!rawValue && !flagConfig.allowEmpty) {
    throw new Error(`Flag "${flagName}" requires a non-empty string.`);
  }

  if (flagConfig.flag) {
    args.push(normalizeCliFlag(flagConfig.flag));
  }

  if (rawValue || flagConfig.allowEmpty) {
    args.push(rawValue);
  }
}

function pushDefaultFlag(args: string[], flagName: string, rawValue: string | boolean): void {
  if (typeof rawValue === 'boolean') {
    if (rawValue) {
      args.push(normalizeCliFlag(flagName));
    }
    return;
  }

  if (typeof rawValue !== 'string') {
    throw new Error(`Flag "${flagName}" expects a string or boolean value.`);
  }

  if (!rawValue) {
    throw new Error(`Flag "${flagName}" requires a non-empty string.`);
  }

  args.push(normalizeCliFlag(flagName), rawValue);
}

function resolveScriptConfig(script: string): ScriptConfig {
  const override = currentPolicy.scriptOverrides[script];
  const npmScript = override?.npmScript ?? script;
  const cwd = override?.cwd ?? currentPolicy.defaultCwd;
  const allowedFlags = override?.allowedFlags
    ? cloneAllowedFlags(override.allowedFlags)
    : undefined;
  const allowUnknownFlags = override?.allowUnknownFlags ?? currentPolicy.defaultAllowUnknownFlags;
  const timeoutMs = override?.timeoutMs ?? currentPolicy.defaultTimeoutMs;

  const packageScripts = getPackageScripts();
  if (!packageScripts.includes(npmScript)) {
    throw new Error(`Script ${npmScript} is not defined in package.json.`);
  }

  if (currentPolicy.allowedScripts && !currentPolicy.allowedScripts.has(script)) {
    throw new Error(`Script ${script} is not allowed.`);
  }

  if (currentPolicy.blockedScripts.has(script)) {
    throw new Error(`Script ${script} is not allowed.`);
  }

  return {
    npmScript,
    cwd,
    allowedFlags,
    allowUnknownFlags,
    timeoutMs,
  };
}

function buildScriptArgs(config: ScriptConfig, flags: Record<string, string | boolean>): string[] {
  const entries = Object.entries(flags);
  if (entries.length === 0) {
    return [];
  }

  const extraArgs: string[] = [];
  const allowedFlags = config.allowedFlags;

  for (const [flagName, rawValue] of entries) {
    const flagConfig = allowedFlags?.[flagName];
    if (flagConfig) {
      pushConfiguredFlag(extraArgs, flagName, rawValue, flagConfig);
      continue;
    }

    if (allowedFlags && !config.allowUnknownFlags) {
      throw new Error(`Flag "${flagName}" is not allowed for script ${config.npmScript}`);
    }

    pushDefaultFlag(extraArgs, flagName, rawValue);
  }

  return extraArgs;
}

export const runNpmScriptArgsSchema = z
  .object({
    script: z.string().min(1),
    flags: z.record(z.union([z.string(), z.boolean()])).optional(),
  })
  .transform((value) => ({
    script: value.script,
    flags: value.flags ?? {},
  }));

export type RunNpmScriptArgs = z.infer<typeof runNpmScriptArgsSchema>;

export interface RunNpmScriptResult {
  script: string;
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
  const config = resolveScriptConfig(args.script);

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

  const timeoutMs = config.timeoutMs;
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
