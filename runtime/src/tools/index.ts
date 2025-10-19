/**
 * Tool definitions for agent nodes
 */

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { ToolDefinition, ExecutionContext } from '../types/index.js';

export const FILE_LIST_TOOL: ToolDefinition = {
  name: 'file_list',
  description: 'List files in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list (relative to working directory)'
      }
    },
    required: ['path']
  },
  handler: async (params: { path: string }, context: ExecutionContext) => {
    const fullPath = join(context.workingDirectory, params.path);
    const entries = await readdir(fullPath, { withFileTypes: true });
    
    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file'
    }));
  }
};

export const FILE_READ_TOOL: ToolDefinition = {
  name: 'file_read',
  description: 'Read the contents of a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path to read (relative to working directory)'
      }
    },
    required: ['path']
  },
  handler: async (params: { path: string }, context: ExecutionContext) => {
    const fullPath = join(context.workingDirectory, params.path);
    const content = await readFile(fullPath, 'utf-8');
    return { content };
  }
};

export const FILE_WRITE_TOOL: ToolDefinition = {
  name: 'file_write',
  description: 'Write content to a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path to write (relative to working directory)'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['path', 'content']
  },
  handler: async (params: { path: string; content: string }, context: ExecutionContext) => {
    const fullPath = join(context.workingDirectory, params.path);
    await writeFile(fullPath, params.content, 'utf-8');
    return { success: true };
  }
};

export const ALL_TOOLS: Record<string, ToolDefinition> = {
  file_list: FILE_LIST_TOOL,
  file_read: FILE_READ_TOOL,
  file_write: FILE_WRITE_TOOL
};

export function getTools(toolNames: string[]): ToolDefinition[] {
  return toolNames.map(name => {
    const tool = ALL_TOOLS[name];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool;
  });
}
