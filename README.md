# Agent Pipeline System

A runtime for executing agentic pipelines defined in YAML. Build AI-powered workflows with proper tool constraints, quality gates, and structured outputs.

## Quick Start

```bash
# Build and setup (one command does everything)
npm run build

# Run a pipeline
./p run examples/simple-task-test/pipeline.yaml

# Run with a prompt for agent nodes
./p run examples/move-files-to-subfolder/pipeline.yaml \
  --prompt "Move all .txt files to a subfolder"

# Validate a pipeline
./p validate examples/gate-test/pipeline.yaml
```

Tip: Use the short local runner `./p`. Alternatively, you can use an npm script: `npm run p -- run examples/simple-task-test/pipeline.yaml`.

## What Is This?

A system for building **constrained agentic workflows** where:

- 🤖 **Agents provide intelligence** - AI plans what to do
- 🔧 **Tasks provide execution** - Reliable tools do the work
- ✅ **Gates provide validation** - Quality checks ensure correctness
- 🔒 **Tool sandboxing** - Agents only access declared tools
- 📊 **Structured output** - Type-safe data flow between nodes

## Examples

See the [examples/](examples/) directory for working pipeline demonstrations:

- **[simple-task-test](examples/simple-task-test/)** - Basic task execution
- **[file-tracking-test](examples/file-tracking-test/)** - Track file changes across tasks
- **[gate-test](examples/gate-test/)** - Quality gate validation
- **[move-files-to-subfolder](examples/move-files-to-subfolder/)** - Agent-driven file organization
- **[move-files-update-imports](examples/move-files-update-imports/)** - Refactoring with import updates
- **[typescript-edit-format-check](examples/typescript-edit-format-check/)** - Full AI edit → format → typecheck workflow
- **[prettier-demo](examples/prettier-demo/)** - Automated code formatting

Each example includes a `pipeline.yaml` and documentation.

## Key Features

### Three Node Types

1. **Task Nodes** - Execute shell commands
   - File change tracking
   - Environment variables
   - Output streaming

2. **Agent Nodes** - AI with tool access
   - Claude integration
   - Tool sandboxing
   - Structured output validation

3. **Gate Nodes** - Quality validation
   - Stop pipeline on failure
   - Custom error messages

### Variable Interpolation

Access data from previous nodes using template variables. See [examples/move-files-to-subfolder](examples/move-files-to-subfolder/) and [examples/typescript-edit-format-check](examples/typescript-edit-format-check/) for working examples.

### Schema Validation

Agents produce structured output validated against defined schemas. See examples for schema usage patterns.

## Project Structure

```
├── runtime/           # Runtime implementation
│   ├── src/
│   │   ├── cli/      # Command-line interface
│   │   ├── core/     # Parser, schema, templates
│   │   ├── executors/ # Node executors
│   │   ├── tools/    # Tool implementations
│   │   └── types/    # TypeScript types
│   └── tests/        # Test suite
│
├── examples/         # Example pipelines
│   ├── simple-task-test/
│   ├── file-tracking-test/
│   ├── gate-test/
│   ├── move-files-to-subfolder/
│   ├── move-files-update-imports/
│   └── typescript-edit-format-check/
│
└── docs/            # Documentation (Docusaurus)
```

## Documentation

- [Runtime README](runtime/README.md) - Runtime setup and usage
- [Examples](examples/) - Working example pipelines
- [Implementation Plan](RUNTIME_IMPLEMENTATION_PLAN.md) - Original design doc
- [Implementation Complete](IMPLEMENTATION_COMPLETE.md) - What was built

## Development

```bash
# Build everything
npm run build

# Run tests
npm test

# Watch mode for development
cd runtime && npm run dev
```

## Testing

The project includes comprehensive tests:

```bash
npm test
```

Results:
- ✅ 31 unit tests passing
- ✅ Schema parser fully tested
- ✅ Template engine fully tested
- ✅ Pipeline parser fully tested
- ✅ All 8 example pipelines validated

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (required for agent nodes)

Or pass via CLI:
```bash
./p run pipeline.yaml --api-key sk-...
```

## CLI Commands

### Run a pipeline
```bash
./p run <pipeline.yaml> [options]

Options:
  -p, --prompt <text>   User prompt for agent nodes
  -v, --verbose         Show detailed execution info
  --dry-run            Validate without executing
  --api-key <key>      Anthropic API key
```

### Validate a pipeline
```bash
./p validate <pipeline.yaml>
```

## Why This Approach?

Traditional AI agents often have unrestricted access to tools, leading to:
- ❌ Inefficient approaches (rewriting files instead of moving them)
- ❌ Security concerns (arbitrary command execution)
- ❌ Unpredictable behavior (no guaranteed output structure)
- ❌ Missing validations (no quality gates)

This system enforces:
- ✅ **Tool constraints** - Agents only access declared tools
- ✅ **Structured output** - Type-safe data between nodes
- ✅ **Separation of concerns** - AI plans, tasks execute
- ✅ **Quality gates** - Validation is mandatory
- ✅ **Predictable workflows** - YAML defines the flow

## Built-in Tools

Current tools available to agents:

- `file_list` - List directory contents
- `file_read` - Read file contents
- `file_write` - Write file contents

The architecture is extensible - add more tools in `runtime/src/tools/`.

## Status

✅ **Implementation Complete**

All core features implemented and tested:
- YAML pipeline parsing
- Task/Agent/Gate node execution
- Variable interpolation
- Schema validation
- Tool sandboxing
- CLI interface
- Comprehensive tests

See [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) for details.

## License

MIT
