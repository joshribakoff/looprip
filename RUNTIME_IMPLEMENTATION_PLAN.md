# Runtime Implementation Plan

## Overview

This document outlines the plan for implementing the runtime that will execute the agentic pipeline system. Based on the documentation and examples, we need to build a system that can parse YAML pipelines, execute nodes with granular permissions, and manage state between nodes.

## Phase 1: Core Foundation

### 1.1 Project Setup
**Goal**: Establish the runtime codebase structure

- [ ] Create `/runtime` directory at project root
- [ ] Choose implementation language (recommend: TypeScript for Node.js ecosystem integration)
- [ ] Initialize package.json with dependencies:
  - YAML parser (`js-yaml`)
  - CLI framework (`commander` or `yargs`)
  - Schema validation (`zod`)
  - Testing framework (`vitest`)
- [ ] Set up TypeScript configuration
- [ ] Create basic project structure:
  ```
  runtime/
    src/
      cli/           # CLI entry points
      core/          # Core runtime logic
      executors/     # Local & Remote executors
      nodes/         # Node implementations
      tools/         # Tool implementations
      types/         # TypeScript types
      utils/         # Utilities
    tests/
  ```

### 1.2 Type Definitions
**Goal**: Define TypeScript interfaces for all core concepts

- [ ] Pipeline definition types (`Pipeline`, `Node`, `NodeConfig`)
- [ ] Executor types (`Executor`, `ExecutionContext`)
- [ ] Tool types (`Tool`, `ToolPermissions`)
- [ ] Output schema types (validation schemas)
- [ ] State/context types (`PipelineState`, `NodeOutput`)

## Phase 2: Pipeline Parser

### 2.1 YAML Parser
**Goal**: Parse pipeline.yaml files into validated structures

- [ ] Load and parse YAML files
- [ ] Validate pipeline structure against schema
- [ ] Validate node configurations
- [ ] Validate output schemas
- [ ] Validate tool references
- [ ] Error reporting for invalid configs

### 2.2 Schema Validation
**Goal**: Ensure node output schemas are valid

- [ ] Parse schema strings (`string`, `array<{...}>`, etc.)
- [ ] Create runtime validators from schemas
- [ ] Validate node outputs match their declared schemas
- [ ] Support basic types: `string`, `number`, `boolean`, `array`, `object`

## Phase 3: Local Executor

### 3.1 Basic Executor
**Goal**: Run pipelines on local machine

- [ ] Implement `LocalExecutor` class
- [ ] Load pipeline from file
- [ ] Initialize execution context (working directory, env vars)
- [ ] Execute nodes in sequence
- [ ] Track pipeline state across nodes
- [ ] Handle execution errors gracefully

### 3.2 State Management
**Goal**: Track changes and dependencies between nodes

- [ ] Track which files were modified by each node
- [ ] Store node outputs for later nodes to reference
- [ ] Implement variable interpolation (`{{plan.source}}`)
- [ ] Track execution order and timing
- [ ] Provide context to subsequent nodes

## Phase 4: Task Nodes

### 4.1 Command Execution
**Goal**: Implement task nodes that run shell commands

- [ ] Implement `TaskNode` class
- [ ] Execute shell commands with proper env and cwd
- [ ] Capture stdout/stderr
- [ ] Handle exit codes (non-zero = failure)
- [ ] Stream output to console in real-time
- [ ] Support command templating with interpolation

### 4.2 File Tracking
**Goal**: Track which files were changed by tasks

- [ ] Detect modified files (compare timestamps or use git)
- [ ] Store `changed_files` list in state
- [ ] Make `{{changed_files}}` available to subsequent nodes
- [ ] Support glob patterns for file selection

### 4.3 Template Engine
**Goal**: Interpolate variables in command strings

- [ ] Parse `{{variable}}` syntax
- [ ] Resolve values from previous node outputs
- [ ] Resolve values from execution context
- [ ] Support array expansion (`{{plan.files_to_move[].source}}`)
- [ ] Handle nested properties (`{{plan.nested.property}}`)

## Phase 5: Agent Nodes (MCP Integration)

### 5.1 MCP Client Setup
**Goal**: Integrate with Model Context Protocol for AI agents

- [ ] Set up MCP SDK/client
- [ ] Configure LLM provider (Claude, OpenAI, etc.)
- [ ] Implement tool calling mechanism
- [ ] Handle streaming responses
- [ ] Track token usage and costs

### 5.2 Tool Sandboxing
**Goal**: Restrict agent access to declared tools only

- [ ] Implement `ToolRegistry` to manage available tools
- [ ] Create tool implementations:
  - `file_list` - list files in directory
  - `file_read` - read file contents
  - `file_write` - write file contents
  - `ts_morph` - TypeScript AST manipulation
- [ ] Filter available tools per node config
- [ ] Prevent agents from accessing undeclared tools
- [ ] Validate tool parameters

### 5.3 Structured Output
**Goal**: Enforce agents produce JSON matching output schemas

- [ ] Generate JSON schema from output_schema definition
- [ ] Use structured output with LLM (JSON mode)
- [ ] Validate agent output against schema
- [ ] Retry on schema validation failures
- [ ] Error if agent can't produce valid output after retries

### 5.4 Agent Prompting
**Goal**: Construct effective prompts for agent nodes

- [ ] System prompt explaining agent's role and constraints
- [ ] Include available tools in prompt
- [ ] Include output schema requirements
- [ ] Include context from previous nodes
- [ ] Include user's original prompt/request
- [ ] Add examples if provided in node config

## Phase 6: CLI Interface

### 6.1 Basic Commands
**Goal**: Provide usable CLI for running pipelines

- [ ] `agent-pipeline run <pipeline.yaml>` - Execute a pipeline
- [ ] `--prompt <text>` flag - Pass user prompt to agent nodes
- [ ] `--verbose` flag - Show detailed execution info
- [ ] `--dry-run` flag - Validate pipeline without executing
- [ ] Pretty-print execution progress
- [ ] Show node-by-node results

### 6.2 Pipeline Validation
**Goal**: Validate pipelines without executing them

- [ ] `agent-pipeline validate <pipeline.yaml>` command
- [ ] Check YAML syntax
- [ ] Check schema validity
- [ ] Check tool references exist
- [ ] Check variable references are valid
- [ ] Output validation errors with line numbers

### 6.3 Developer Experience
**Goal**: Make the CLI pleasant to use

- [ ] Colorized output (success/error/warning)
- [ ] Progress indicators for long-running nodes
- [ ] Clear error messages with suggestions
- [ ] Show execution time per node
- [ ] Summary at end (nodes run, files changed, errors)

## Phase 7: Advanced Features

### 7.1 Conditional Execution & Gates
**Goal**: Support quality gates and conditional flows

- [ ] Fail pipeline on non-zero exit codes
- [ ] Support `gate` nodes that block on failure
- [ ] Support conditional node execution based on previous outputs
- [ ] Implement `skip_on` conditions

### 7.2 Dependency Graph Awareness
**Goal**: Smart execution based on what changed

- [ ] Detect file dependencies (e.g., TypeScript imports)
- [ ] Build dependency graph of project
- [ ] Determine which nodes need to run based on changed files
- [ ] Skip nodes that aren't affected by changes
- [ ] Support incremental execution

### 7.3 Remote Executor
**Goal**: Execute pipelines on remote infrastructure

- [ ] Design remote executor protocol
- [ ] Implement remote executor server
- [ ] Implement remote executor client
- [ ] Handle file sync to/from remote
- [ ] Handle authentication and security
- [ ] Support multiple remote backends (Docker, SSH, cloud VMs)

### 7.4 Caching & Optimization
**Goal**: Make pipeline execution fast

- [ ] Cache node outputs when inputs haven't changed
- [ ] Skip nodes when their inputs and code haven't changed
- [ ] Parallel execution of independent nodes
- [ ] Incremental file operations

## Phase 8: Testing & Examples

### 8.1 Unit Tests
**Goal**: Comprehensive test coverage

- [ ] Parser tests (valid/invalid YAML)
- [ ] Template engine tests
- [ ] Tool sandboxing tests
- [ ] Schema validation tests
- [ ] Node execution tests

### 8.2 Integration Tests
**Goal**: Test full pipeline execution

- [ ] Run each example pipeline end-to-end
- [ ] Verify expected files are created/modified
- [ ] Verify agents produce valid structured output
- [ ] Verify task nodes execute correctly
- [ ] Verify error handling works

### 8.3 Example Refinement
**Goal**: Make examples actually runnable

- [ ] Create simple-hello-world example (referenced but missing)
- [ ] Set up test fixtures for existing examples
- [ ] Add expected output documentation
- [ ] Create troubleshooting guides

## Implementation Strategy

### Recommended Order

1. **Start with Task Nodes** (Phase 4)
   - Simplest to implement
   - No AI/MCP dependencies
   - Provides immediate value
   - Tests CLI and parsing infrastructure
   
2. **Add Agent Nodes** (Phase 5)
   - Build on working task node foundation
   - Most complex piece
   - Core value proposition

3. **Refine DX** (Phase 6)
   - Polish CLI after core works
   - Add validation and error handling
   - Improve user feedback

4. **Add Advanced Features** (Phase 7)
   - After MVP is working
   - Each feature adds incremental value
   - Can prioritize based on user needs

### Quick Win: Minimal Viable Pipeline

To see it working ASAP, implement in this order:

1. YAML parser + type definitions (Phase 2)
2. Local executor skeleton (Phase 3.1)
3. Task node implementation (Phase 4.1)
4. Basic CLI to run pipelines (Phase 6.1)
5. Run `typescript-edit-format-check` example (without the agent node first)

This gives you a working system that can:
```yaml
nodes:
  - id: format
    type: task
    command: npx prettier --write src/**/*.ts
    
  - id: typecheck
    type: task
    command: npx tsc --noEmit
```

Then add agent nodes to complete the vision.

## Technical Decisions to Make

### Language Choice
- **TypeScript/Node.js**: Best ecosystem fit, examples already use npm/npx
- **Go**: Fast, single binary, but harder to integrate with Node ecosystem
- **Python**: Good AI libraries, but examples are JS-focused

**Recommendation**: TypeScript for MVP, consider Go for production performance later

### MCP Integration
- Use official MCP SDK when available
- Or implement MCP protocol directly
- Need to research current state of MCP ecosystem

### File Change Detection
- **Git-based**: `git diff` to detect changes (requires git repo)
- **Timestamp-based**: Track file mtimes before/after execution
- **Hash-based**: SHA checksums of file contents

**Recommendation**: Start with timestamp-based (simple), add git-based later

### Schema Language
- Custom mini-language: `string`, `array<T>`, etc. (what examples show)
- JSON Schema: Industry standard, well-tooled
- TypeScript types: Type-safe but complex

**Recommendation**: Parse custom syntax, convert to JSON Schema internally

## Success Criteria

The runtime implementation will be successful when:

1. ✅ All three existing example pipelines execute successfully
2. ✅ Agent nodes produce structured output matching schemas
3. ✅ Task nodes execute and track file changes correctly
4. ✅ Variable interpolation works between nodes
5. ✅ Quality gates (typecheck) can fail the pipeline
6. ✅ CLI provides clear feedback during execution
7. ✅ Documentation is updated with actual usage examples
8. ✅ Basic test coverage exists for core functionality

## Next Steps

1. Review and refine this plan
2. Choose implementation language and tools
3. Set up runtime project structure
4. Begin Phase 1: Core Foundation
5. Build toward minimal viable pipeline
6. Iterate based on what works/doesn't work

---

**Last Updated**: October 18, 2025
