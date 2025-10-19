# Move Files and Update Imports

## Overview

This example demonstrates a more complex pipeline where moving TypeScript files requires updating import statements across the codebase.

## The Flow

```
Agent (plan) → Task (mv) → Agent (update imports)
```

1. **Planning agent**: Determines which files to move, reads their contents to understand dependencies
2. **Move task**: Executes the file moves using `mv` 
3. **Import update agent**: Uses TS Morph to fix all import statements across the codebase

## Key Concepts Demonstrated

### Multi-Agent Orchestration

Different agents for different purposes:
- **Planning agent**: Limited to read-only tools (`file_list`, `file_read`)
- **Import agent**: Has access to `ts_morph` for AST manipulation

### Context Passing

The move plan from the first agent is passed as context to the import update agent, so it knows which paths changed.

### Task in the Middle

The actual file move is a simple task node - fast and predictable. Agents handle the intelligence before and after.

### Appropriate Tool Access

- Planning agent **cannot** modify files or run commands
- Import agent **cannot** move files, only update imports via TS Morph
- Task node has no AI decision-making

## Running This Example

```bash
p run pipeline.yaml --prompt "Move all components to src/components/ui"
```

## What This Prevents

Without this pipeline structure:
- A single agent might try to manually edit import strings (error-prone)
- Agent might forget to update imports in some files
- Agent might try to use regex instead of proper AST tools

With this pattern:
- File moves use native `mv` (fast, reliable)
- Import updates use TS Morph (safe, comprehensive)
- Each step has only the tools it needs