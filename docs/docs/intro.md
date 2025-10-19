---
sidebar_position: 1
---

# Introduction

## The Problem

AI agents today are given too much control by default. When you ask an AI to perform a task, it has access to all available tools and will use them however it sees fit. This can lead to inefficient, wasteful, or even dangerous outcomes.

If you've seen these failure modes before, you can skip ahead to focused examples:

- File Move Spiral → see [File Move Spiral](./examples/file-move-spiral)
- Watch Mode Deadlock → see [Watch Mode Deadlock](./examples/watch-mode-deadlock)
- Shell Script Generation → see [Shell Script Generation](./examples/shell-script-generation)

## The Solution: Agentic Pipeline System

This project introduces a paradigm shift: **sandbox AI agents inside nodes within a pipeline, each with granular permissions and limited tool access**.

### Core Principles

1. **Developer Control by Default** - The developer orchestrates the pipeline, not the AI
2. **Granular Permissions** - Each node in the pipeline has specific, limited capabilities
3. **Sandboxed Execution** - AI agents operate within constrained environments
4. **Explicit Tool Access** - Nodes only have access to the tools they actually need

### How It Works

Instead of giving an AI agent free reign over your entire development environment, you create a pipeline where:

- Each node performs a specific task
- Each node has only the tools and permissions it needs
- The developer defines the flow and relationships between nodes
- AI assists within boundaries, rather than controlling everything

This approach prevents the AI from making inefficient decisions (like rewriting files instead of moving them) while still leveraging its capabilities where they're most valuable.

Next steps:

- Read Concepts for a quick mental model
- Browse the Examples to see common pitfalls and how pipelines avoid them
