/**
 * Agent node executor - runs AI agents with tool access
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentNode, NodeOutput, PipelineState, ExecutionContext } from '../types/index.js';
import { NodeExecutor } from './base.js';
import { TemplateEngine } from '../core/template.js';
import { SchemaParser } from '../core/schema.js';
import { getTools } from '../tools/index.js';
import { Logger } from '../utils/logger.js';

export class AgentExecutor implements NodeExecutor {
  private templateEngine = new TemplateEngine();
  private schemaParser = new SchemaParser();
  private anthropic: Anthropic;
  private logger: Logger;

  constructor(apiKey?: string, logger?: Logger) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.logger = logger || new Logger();
  }

  async execute(
    node: AgentNode,
    state: PipelineState,
    context: ExecutionContext,
  ): Promise<NodeOutput> {
    const startTime = Date.now();

    try {
      // Get the tools for this agent
      const tools = getTools(node.tools);

      // Parse and validate the output schema
      const outputSchema = this.schemaParser.parse(node.output_schema);

      // Interpolate the prompt
      const prompt = this.templateEngine.interpolate(node.prompt, state);

      this.logger.agentPrompt(prompt);
      this.logger.agentTools(tools.map((t) => t.name));

      // Build the system prompt
      const systemPrompt = this.buildSystemPrompt(node, outputSchema, context);

      // Run the agent
      const result = await this.runAgent(prompt, systemPrompt, tools, outputSchema, context);

      const endTime = Date.now();

      return {
        nodeId: node.id,
        type: 'agent',
        success: true,
        output: result,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    } catch (error: any) {
      const endTime = Date.now();

      return {
        nodeId: node.id,
        type: 'agent',
        success: false,
        error: error.message,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    }
  }

  private buildSystemPrompt(
    node: AgentNode,
    outputSchema: any,
    _context: ExecutionContext,
  ): string {
    const systemPromptText = `You are an AI agent executing a task as part of an automated pipeline.

Your role: ${node.description || "Execute the user's request"}

You have access to the following tools:
${node.tools.join(', ')}

CRITICAL: You MUST produce output that matches this exact JSON schema:
${JSON.stringify(outputSchema.toJsonSchema(), null, 2)}

Return ONLY valid JSON matching this schema. Do not include any explanatory text outside the JSON.`;

    return systemPromptText;
  }

  private async runAgent(
    userPrompt: string,
    systemPrompt: string,
    tools: any[],
    outputSchema: any,
    context: ExecutionContext,
    maxIterations: number = 10,
  ): Promise<any> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: [{ type: 'text', text: userPrompt }] },
    ];

    const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    const maxJsonRetries = 3;
    let jsonRetryCount = 0;

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: anthropicTools,
      });

      this.logger.agentIteration(i + 1, maxIterations);

      // Process the response
      if (response.stop_reason === 'end_turn') {
        messages.push({ role: 'assistant', content: response.content });

        // Agent finished - extract the final answer
        const textContent = response.content.find((c) => c.type === 'text');
        if (textContent && textContent.type === 'text') {
          try {
            const result = this.extractJson(textContent.text);

            // Validate against schema
            const validation = outputSchema.validate(result);
            if (!validation.valid) {
              throw new Error(
                `Agent output doesn't match schema: ${validation.errors?.join(', ')}`,
              );
            }

            return result;
          } catch (error: any) {
            jsonRetryCount += 1;
            this.logger.agentJsonRetry(error.message, jsonRetryCount, maxJsonRetries);

            if (jsonRetryCount >= maxJsonRetries) {
              throw new Error(
                `Agent failed to produce valid JSON after ${jsonRetryCount} attempt${jsonRetryCount === 1 ? '' : 's'}: ${error.message}`,
              );
            }

            messages.push({
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `The previous response could not be parsed as valid JSON (${error.message}). Please reply again with ONLY valid JSON that matches the provided schema.`,
                },
              ],
            });

            continue;
          }
        }
        throw new Error('Agent finished without providing output');
      }

      if (response.stop_reason === 'tool_use') {
        // Agent wants to use tools
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.MessageParam = {
          role: 'user',
          content: [],
        };

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            this.logger.agentToolCall(block.name, block.input);

            const tool = tools.find((t) => t.name === block.name);
            if (!tool) {
              throw new Error(`Unknown tool: ${block.name}`);
            }

            try {
              const result = await tool.handler(block.input, context);

              this.logger.agentToolResult(result);

              (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            } catch (error: any) {
              (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({ error: error.message }),
                is_error: true,
              });
            }
          }
        }

        messages.push(toolResults);
        continue;
      }

      throw new Error(`Unexpected stop reason: ${response.stop_reason}`);
    }

    throw new Error(`Agent exceeded maximum iterations (${maxIterations})`);
  }

  private extractJson(text: string): any {
    // Try to find JSON in the text
    const trimmed = text.trim();

    // If it looks like JSON, parse it directly
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Fall through to extraction
      }
    }

    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }

    // Try to find any JSON-like structure
    const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    throw new Error('Could not extract JSON from agent response');
  }
}
