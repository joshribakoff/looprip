# Agent Pipeline Runtime

Runtime for executing agentic pipeline YAML configurations.

## Installation

```bash
cd runtime
npm install
npm run build
```

## Usage

### Interactive mode

Arrow-key through commands and pick a pipeline file discovered in your workspace.

```bash
# From repo root
npx tsx src/cli/index.js interactive

# Or if installed globally as a binary
agent-pipeline interactive
```

### Run a pipeline

```bash
npm run build
node dist/cli/index.js run path/to/pipeline.yaml --prompt "Your request here"
```

Or with the CLI directly after installing:

```bash
agent-pipeline run path/to/pipeline.yaml --prompt "Your request here"
```

### Validate a pipeline

```bash
agent-pipeline validate path/to/pipeline.yaml
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude (required for agent nodes)

You can also pass the API key via the `--api-key` flag.
