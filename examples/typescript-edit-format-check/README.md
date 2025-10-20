# TypeScript Formatting Pipeline

## Overview

This example demonstrates a simple 3-node pipeline that enforces code quality:

1. **Agent Node** - AI makes TypeScript code changes
2. **Format Node** - Prettier auto-formats the changed files
3. **Typecheck Node** - TypeScript compiler validates the entire project

## The Flow

```
Agent Edit (*.ts) → Prettier Format → TypeScript Check
```

## Key Concepts Demonstrated

### Sandboxed Agent

The agent node only has access to `file_read` and `file_write` tools. It cannot run arbitrary commands or access other system resources.

### Automatic Formatting

The developer doesn't trust the AI to format code correctly. Instead, Prettier runs automatically on any TypeScript files the agent touches.

### Quality Gates

The type checker acts as a gate - if it fails (non-zero exit code), the pipeline stops and the changes are rejected.

### Targeted vs. Broad Validation

- **Prettier** runs only on changed files (efficient)
- **Type checker** runs on the entire project (comprehensive, because type changes can affect other files)

## Running This Example

```bash
# Install dependencies
npm install prettier typescript

# Execute the pipeline
p run pipeline.yaml
```

## What This Prevents

Without this pipeline structure, an AI agent might:

- Generate poorly formatted code
- Break type safety in other parts of the codebase
- Skip validation steps entirely

With the pipeline, these quality checks are **mandatory and automatic**.
