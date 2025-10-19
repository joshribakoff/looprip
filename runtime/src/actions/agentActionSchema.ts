import { z } from 'zod';

import { listDirectoryArgsSchema, type ListDirectoryArgs } from './listDirectory.js';
import { readFileArgsSchema, type ReadFileArgs } from './readFile.js';
import { runNpmScriptArgsSchema, type RunNpmScriptArgs } from './runNpmScript.js';
import { writeFileArgsSchema, type WriteFileArgs } from './writeFile.js';

export const agentActionNames = ['read_file', 'write_file', 'list_directory', 'run_npm_script'] as const;

export type AgentActionName = typeof agentActionNames[number];

export const agentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('read_file'),
    args: readFileArgsSchema,
  }),
  z.object({
    action: z.literal('write_file'),
    args: writeFileArgsSchema,
  }),
  z.object({
    action: z.literal('list_directory'),
    args: listDirectoryArgsSchema,
  }),
  z.object({
    action: z.literal('run_npm_script'),
    args: runNpmScriptArgsSchema,
  }),
]);

export type AgentAction =
  | { action: 'read_file'; args: ReadFileArgs }
  | { action: 'write_file'; args: WriteFileArgs }
  | { action: 'list_directory'; args: ListDirectoryArgs }
  | { action: 'run_npm_script'; args: RunNpmScriptArgs };

export const agentActionNameSet = new Set<AgentActionName>(agentActionNames);

export function isAgentActionName(value: string): value is AgentActionName {
  return agentActionNameSet.has(value as AgentActionName);
}
