# Agent Pipeline Runtime

Runtime for executing agentic pipeline YAML configurations.

## Installation

```bash
cd runtime
npm install
npm run build
```

## Usage

### Interactive mode (default locally)

If you're in a TTY and not in CI (CI env var not truthy), the CLI starts interactive mode by default: select a pipeline and it runs immediately. It only prompts for variables your pipeline requires (like `{{prompt}}`).

```bash
# From repo root
npx tsx src/cli/index.js

# Or if installed globally as a binary
agent-pipeline

# You can still invoke interactive explicitly
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
