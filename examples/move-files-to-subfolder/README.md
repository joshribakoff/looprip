# Move Files to Subfolder

## Overview

This example demonstrates the pattern from the introduction - an AI agent creates a structured plan, then a task node executes it with the right tool.

## The Flow

```
Agent (plan) → Task (mv command)
```

The agent:
- Has access to `file_list` tool to see what files exist
- Creates a JSON plan with `source` and `destination`
- **Cannot** execute the move itself

The task node:
- Receives the structured plan
- Executes `mv {{plan.source}} {{plan.destination}}`
- Uses the right tool for the job

## Key Concepts Demonstrated

### Agent Creates Plan, Task Executes

The agent is constrained to **planning only**. It can't choose to rewrite files or use inefficient approaches - it must output a JSON plan that the task node will execute.

### Structured Output

The agent must provide:
```json
{
  "source": "src/*.ts",
  "destination": "src/subfolder/"
}
```

This gets mapped to the `mv` command automatically.

### What This Prevents

Without this separation:
- Agent might rewrite files instead of moving them
- Agent might use inefficient file-by-file operations
- No guarantee the right tool gets used

With this pattern:
- Agent provides intelligence (what to move)
- Task provides execution (how to move)
- Developer controls the "how"

## Running This Example

```bash
p run pipeline.yaml --prompt "Move all TypeScript files to src/subfolder"
```
