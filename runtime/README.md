# Agent Pipeline Runtime

TypeScript runtime for executing agentic pipeline YAML configurations.

## Install (dev)

```bash
cd runtime
npm install
npm run build
```

## CLI usage

After linking the root package (`npm run install:cli`):

```bash
p run path/to/pipeline.yaml --prompt "Your request here"
p validate path/to/pipeline.yaml
```

Interactive mode (default in TTY when no subcommand is given):

```bash
p
# or explicitly
p interactive
```

## Develop

```bash
npm run build
npm run dev
npm test
```

Env:
- `ANTHROPIC_API_KEY` (or pass `--api-key`)
