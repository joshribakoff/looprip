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

### Create a prompt super fast

```bash
# Bare name goes into prompts/ and .md is added automatically
p prompt create "feature-spec" --open

# Or specify a relative/absolute path
p prompt create prompts/ideas/brainstorm.md --open
```

Interactive option:
- Run `p`, then choose "Create new prompt…". The path is prefilled with `prompts/new-prompt.md`; backspace to rename/move. It prints the absolute path so you can Cmd+Click to open if not using `--open`.

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
