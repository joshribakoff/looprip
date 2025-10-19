import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {Box, Text, Static} from 'ink';
import { Logger as ConsoleLogger } from '../../../utils/logger.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'section' | 'pipeline' | 'node' | 'task' | 'gate' | 'agent' | 'validation' | 'stdout' | 'stderr';

export type LogEntry = {
  id: number;
  level: LogLevel;
  message: string;
};

type LoggerContextValue = {
  entries: LogEntry[];
  add: (level: LogLevel, message: string) => void;
  clear: () => void;
  logger: ConsoleLogger; // Ink-backed logger implementing same API
};

const Ctx = createContext<LoggerContextValue | null>(null);

// A Logger implementation that renders via Ink instead of writing to console.
class InkLogger extends ConsoleLogger {
  private add: (level: LogLevel, message: string) => void;

  constructor(verbose: boolean, add: (level: LogLevel, message: string) => void) {
    super(verbose);
    this.add = add;
  }

  // Pipeline-level
  section(title: string) { this.add('section', title); }
  pipelineStart(name: string, description?: string) {
    this.add('pipeline', `Starting Pipeline: ${name}${description ? `\n${description}` : ''}`);
  }
  pipelineSuccess(nodeCount: number, totalTime: number, filesChanged: number) {
    this.add('pipeline', `✓ Pipeline Completed • nodes: ${nodeCount}, time: ${totalTime}ms, files: ${filesChanged}`);
  }
  pipelineFailed() { this.add('pipeline', '✗ Pipeline Failed'); }

  // Node-level
  nodeStart(id: string, type: string, description?: string) {
    this.add('node', `▶ ${id} (${type})${description ? `\n${description}` : ''}`);
  }
  nodeSuccess(_id: string, duration: number) { this.add('node', `✓ Completed in ${duration}ms`); }
  nodeFailed(_id: string, error: string, duration: number) { this.add('node', `✗ Failed after ${duration}ms\nError: ${error}`); }

  // Task-specific
  taskCommand(command: string) { if ((this as any).verbose) this.add('task', `Executing: ${command}`); }
  taskFilesChanged(files: string[]) { if ((this as any).verbose && files.length) this.add('task', `Changed ${files.length} file(s)`); }

  // Gate
  gateCheck(command: string) { if ((this as any).verbose) this.add('gate', `Gate check: ${command}`); }

  // Agent
  agentPrompt(prompt: string) { if ((this as any).verbose) this.add('agent', `Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '…' : ''}`); }
  agentTools(tools: string[]) { if ((this as any).verbose) this.add('agent', `Tools: ${tools.join(', ')}`); }
  agentIteration(current: number, max: number) { if ((this as any).verbose) this.add('agent', `Iteration ${current}/${max}`); }
  agentToolCall(toolName: string) { if ((this as any).verbose) this.add('agent', `🔧 Tool: ${toolName}`); }
  agentToolResult(result: any) { if ((this as any).verbose) this.add('agent', `Result: ${JSON.stringify(result).slice(0, 100)}${JSON.stringify(result).length > 100 ? '…' : ''}`); }

  // Validation
  validationStart(path: string) { this.add('validation', `Validating pipeline: ${path}`); }
  validationSuccess() { this.add('validation', '✓ Pipeline is valid'); }
  validationInfo(label: string, value: string) { this.add('validation', `${label}: ${value}`); }
  validationNode(id: string, type: string, details: string[] = []) { this.add('validation', `Node: ${id} (${type})${details.length ? `\n${details.map(d=>`• ${d}`).join('\n')}` : ''}`); }

  // Generic
  loading(message: string) { this.add('info', message); }
  info(message: string) { this.add('info', message); }
  warning(message: string) { this.add('warn', message); }
  error(message: string, details?: string) { this.add('error', details ? `${message}\n${details}` : message); }
  dryRun() { this.add('warn', '⚠ Dry run mode - pipeline will not be executed'); }

  // Streams used by TaskExecutor
  writeStdout(text: string) { this.add('stdout', text.replace(/\n$/, '')); }
  writeStderr(text: string) { this.add('stderr', text.replace(/\n$/, '')); }
}

export function LoggerProvider({ children, verbose = false }: { children: React.ReactNode; verbose?: boolean }) {
  const idRef = useRef(0);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const add = useCallback((level: LogLevel, message: string) => {
    setEntries((prev) => [...prev, { id: ++idRef.current, level, message }]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const logger = useMemo(() => new InkLogger(!!verbose, add), [add, verbose]);

  const value = useMemo<LoggerContextValue>(() => ({ entries, add, clear, logger }), [entries, add, clear, logger]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInkLogger() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInkLogger must be used within LoggerProvider');
  return ctx;
}

export function LogView() {
  const { entries } = useInkLogger();
  // Render completed lines without interfering with live Ink output
  return (
    <Box flexDirection="column" marginTop={1}>
      <Static items={entries}>
        {(item) => {
          switch (item.level) {
            case 'error':
              return <Text color="red">{item.message}</Text>;
            case 'warn':
              return <Text color="yellow">{item.message}</Text>;
            case 'stdout':
              return <Text>{item.message}</Text>;
            case 'stderr':
              return <Text color="redBright">{item.message}</Text>;
            case 'pipeline':
              return <Text color="magentaBright">{item.message}</Text>;
            case 'node':
              return <Text color="blueBright">{item.message}</Text>;
            case 'task':
              return <Text color="cyan">{item.message}</Text>;
            case 'agent':
              return <Text color="greenBright">{item.message}</Text>;
            case 'validation':
              return <Text color="gray">{item.message}</Text>;
            case 'section':
              return <Text color="cyanBright">{item.message}</Text>;
            default:
              return <Text>{item.message}</Text>;
          }
        }}
      </Static>
    </Box>
  );
}

export default InkLogger;
