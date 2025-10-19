---
sidebar_position: 1
---

# Introduction

## The Problem

AI agents today are given too much control by default. When you ask an AI to perform a task, it has access to all available tools and will use them however it sees fit. This can lead to inefficient, wasteful, or even dangerous outcomes.

**A Real Example:** When scaffolding this very project, we asked the AI to move files to a subfolder. Instead of simply using the `mv` command, the AI spiraled—rewriting individual files one by one, wasting significant compute credits and time. The AI had the power to choose its approach, and it chose poorly.

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
