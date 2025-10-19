import React, {useEffect, useState} from 'react';
import {Box, Text, useInput, useApp, Spacer} from 'ink';
import TextInput from 'ink-text-input';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import {PipelineParser} from '../../core/parser.js';
import {PipelineExecutor} from '../../executors/index.js';
import {Logger} from '../../utils/logger.js';

type PipelineChoice = { title: string; value: string };

async function findPipelineFiles(baseDir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // ignore unreadable dirs
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (/^pipeline\.ya?ml$/i.test(entry.name)) {
          results.push(full);
        }
      }
    }
  }
  await walk(baseDir);
  return results.sort();
}

function detectNeedsPrompt(pipeline: any): boolean {
  const containsPromptVar = (val: any): boolean => {
    if (typeof val === 'string') return val.includes('{{prompt}}');
    if (Array.isArray(val)) return val.some(containsPromptVar);
    if (val && typeof val === 'object') return Object.values(val).some(containsPromptVar);
    return false;
  };
  return containsPromptVar(pipeline);
}

type Mode = 'select' | 'custom-path' | 'enter-prompt' | 'running' | 'summary';

export function InteractiveApp() {
  const {exit} = useApp();
  const cwd = process.cwd();
  const [choices, setChoices] = useState<PipelineChoice[]>([]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('select');
  const [customPath, setCustomPath] = useState('');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastResultSuccess, setLastResultSuccess] = useState<boolean | null>(null);

  // Load choices on mount, and refresh on "r"
  const refreshChoices = async () => {
    const found = await findPipelineFiles(cwd);
    const nextChoices: PipelineChoice[] = [
      ...found.map((abs) => ({ title: path.relative(cwd, abs) || abs, value: abs })),
      { title: 'Enter custom path…', value: '__custom__' }
    ];
    setChoices(nextChoices);
    if (index >= nextChoices.length) setIndex(Math.max(0, nextChoices.length - 1));
  };

  useEffect(() => {
    void refreshChoices();
  }, []);

  useInput((input: string, key: any) => {
    if (mode === 'select') {
      if (key.upArrow) setIndex((i) => (i > 0 ? i - 1 : choices.length - 1));
      else if (key.downArrow) setIndex((i) => (i + 1) % Math.max(choices.length || 1, 1));
      else if (key.return) handleSelect();
      else if (input === 'r') void refreshChoices();
      else if (input === 'q' || key.escape) exit();
    } else if (mode === 'custom-path') {
      if (key.escape) { setMode('select'); setCustomPath(''); }
    } else if (mode === 'enter-prompt') {
      if (key.escape) { setMode('select'); setUserPrompt(''); }
    } else if (mode === 'summary') {
      if (input === 'q' || key.escape) exit();
      if (key.return) { setMode('select'); setLastResultSuccess(null); setMessage(''); }
    }
  });

  const handleSelect = async () => {
    const choice = choices[index];
    if (!choice) return;
    if (choice.value === '__custom__') {
      setMode('custom-path');
      return;
    }
    await runPipeline(choice.value);
  };

  const runPipeline = async (selectedPath: string) => {
    const exists = await fs.stat(selectedPath).then((s) => s.isFile()).catch(() => false);
    if (!exists) {
      setStatus('error');
      setMessage(chalk.red(`Pipeline not found: ${selectedPath}`));
      setMode('summary');
      return;
    }
    const logger = new Logger(false);
    try {
      setStatus('loading');
      setMessage(chalk.gray(`Loading pipeline: ${selectedPath}`));
      const parser = new PipelineParser();
      const pipeline = await parser.loadFromFile(selectedPath);
      const needsPrompt = detectNeedsPrompt(pipeline);
      if (needsPrompt && !userPrompt) {
        // Switch to prompt input first
        setMode('enter-prompt');
        // Stash selected path in message to re-use
        setMessage(selectedPath);
        setStatus('idle');
        return;
      }
      setMode('running');
      const executor = new PipelineExecutor(process.env.ANTHROPIC_API_KEY, logger);
      const context = {
        workingDirectory: cwd,
        environment: {},
        userPrompt: userPrompt || undefined,
        verbose: false
      } as const;
      const result = await executor.execute(pipeline, context);
      setLastResultSuccess(result.success);
      setStatus(result.success ? 'success' : 'error');
      setMessage(result.success ? chalk.green('✔ Pipeline completed') : chalk.red('✖ Pipeline failed'));
      setMode('summary');
    } catch (err: any) {
      setLastResultSuccess(false);
      setStatus('error');
      setMessage(chalk.red(err?.message || String(err)));
      setMode('summary');
    }
  };

  // When in prompt mode, pressing Enter should proceed to run pipeline with stored path
  const onSubmitPrompt = async () => {
    const pathToRun = message && !message.startsWith('\u001b') ? message : undefined;
    if (pathToRun) {
      await runPipeline(pathToRun);
    } else {
      setMode('select');
    }
  };

  const header = (
    <Box>
      <Text bold>Agent Pipeline</Text>
      <Spacer />
      <Text dimColor>q: quit</Text>
    </Box>
  );

  if (mode === 'custom-path') {
    return (
      <Box flexDirection="column">
        {header}
        <Box marginTop={1}>
          <Text>Enter path to pipeline YAML: </Text>
          <TextInput
            value={customPath}
            onChange={setCustomPath}
            onSubmit={(val: string) => {
              const abs = path.resolve(cwd, val.trim());
              setCustomPath('');
              void runPipeline(abs);
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Esc: back</Text>
        </Box>
      </Box>
    );
  }

  if (mode === 'enter-prompt') {
    return (
      <Box flexDirection="column">
        {header}
        <Box marginTop={1}>
          <Text>Enter prompt required by this pipeline: </Text>
          <TextInput
            value={userPrompt}
            onChange={setUserPrompt}
            onSubmit={() => onSubmitPrompt()}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Esc: back</Text>
        </Box>
      </Box>
    );
  }

  if (mode === 'running' || mode === 'summary') {
    return (
      <Box flexDirection="column">
        {header}
        <Box marginTop={1}>
          <Text>{status === 'loading' ? 'Running…' : ''}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
        {mode === 'summary' && (
          <Box marginTop={1}>
            <Text dimColor>{lastResultSuccess === true || lastResultSuccess === false ? 'Enter: back • q: quit' : 'q: quit'}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Select mode
  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1} flexDirection="column">
        {choices.length === 0 ? (
          <Text dimColor>No pipeline files found. Press "r" to refresh or use custom path.</Text>
        ) : (
          choices.map((c, i) => (
            <Text key={c.value} color={i === index ? 'cyan' : undefined}>
              {i === index ? '› ' : '  '}
              {c.title}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑/↓: navigate • Enter: select • r: refresh • q: quit</Text>
      </Box>
    </Box>
  );
}
