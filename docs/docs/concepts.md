---
sidebar_position: 2
---

# Core Concepts

## Executors

Executors are the runtime environments where pipelines execute. They determine where and how your pipeline nodes run.

### Local Executor

Runs pipeline nodes on your local machine, using your local development environment and resources.

### Remote Executor

Executes pipeline nodes on remote infrastructure, enabling distributed processing, scalability, and isolation from your local environment.

## Nodes

Nodes are the fundamental building blocks of a pipeline. Each node is defined using declarative configuration (YAML or other formats) and performs a specific, bounded task.

### Node Configuration

Nodes are defined with:

- **Inputs** - The data and context a node requires to execute
- **Output Schemas** - Structured definitions of what the node produces
- **Contracts & Gates** - Conditions that control flow

### Node Execution

Nodes can process work in different ways:

- **In-process transformations** - Direct code manipulation within the executor
- **Shell commands** - Delegating to CLI tools and scripts

### State & Dependencies

As the pipeline executes, the system tracks:

- **File changes** - Which files were modified by each node
- **Project dependency graph** - Relationships between files and the actions they require

For example:
- If any TypeScript file changes → run the formatter on those files
- If any TypeScript file changes → run type checking on the entire project
- If `package.json` changes → reinstall dependencies

This enables smart, targeted execution based on what actually changed.

## Node Types

Different node types serve different purposes in the pipeline:

### Agent Node

Invokes an AI agent with specific tools and permissions to accomplish a task within defined boundaries, eg. create JSON plans and pass to task nodes

### Task Node

Runs CLI tools, tests, linters, type checkers, or other validation tools to ensure quality gates are met. Can map JSON from agents to templated tool calls.

---

By composing these concepts together, you create controlled, efficient pipelines where AI assists without overstepping its bounds.
