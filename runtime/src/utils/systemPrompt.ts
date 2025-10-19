import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load the agent loop system prompt from the markdown file.
 * This is the system prompt that instructs the agent on how to respond.
 */
export async function loadSystemPrompt(): Promise<string> {
  const promptPath = path.resolve(__dirname, '../../../prompts/agent-loop-system.md');
  
  try {
    const content = await fs.readFile(promptPath, 'utf8');
    
    // Extract the actual prompt content (skip the markdown heading)
    const lines = content.split('\n');
    const startIndex = lines.findIndex(line => line.trim() === '# Agent Loop System Prompt');
    
    if (startIndex === -1) {
      return content.trim();
    }
    
    return lines.slice(startIndex + 1).join('\n').trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load system prompt from ${promptPath}: ${message}`);
  }
}
