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

Interactive mode now stays open in a loop until you press Ctrl+C:

- After each run, you're brought back to the pipeline picker.
- Your last selection is preselected, so you can just press Enter to rerun it repeatedly.
- If the pipeline requires a prompt, your last prompt text will be prefilled.
- Press Ctrl+C at any time to exit.

## Develop

```bash
npm run build
npm run dev
npm test
```

Env:
- `ANTHROPIC_API_KEY` (or pass `--api-key`)
