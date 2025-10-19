# Agent Pipeline

Build and run constrained agentic workflows defined in YAML.

## Quick start

Prerequisites: Node.js 18+ and npm.

1) Install the CLI (one-time):

```bash
npm run install:cli
```

2) Run a pipeline:

```bash
p run examples/simple-task-test/pipeline.yaml
```

3) Run with a prompt (for agent nodes):

```bash
p run examples/move-files-to-subfolder/pipeline.yaml \
   --prompt "Move all .txt files to a subfolder"
```

4) Validate without executing:

```bash
p validate examples/gate-test/pipeline.yaml
```

Tips:
- Get help: `p --help`
- Local fallback: `npm run p -- run examples/simple-task-test/pipeline.yaml`

## API key (agents)

Set your Anthropic API key if you use agent nodes:

```bash
export ANTHROPIC_API_KEY=sk-...
# or pass per-run
p run pipeline.yaml --api-key sk-...
```

## Explore more

- Examples: `examples/`
- Docs site sources: `docs/`
- Runtime details: `runtime/README.md`

## License

MIT
