# Pipeline Examples

This directory contains example pipelines demonstrating different use cases and patterns.

## Examples

### [simple-hello-world](./simple-hello-world)
The absolute minimal pipeline - single task node running a shell command. Start here to understand basic structure.

### [move-files-to-subfolder](./move-files-to-subfolder)
Agent creates a structured plan, task node executes `mv` command. Demonstrates separation of planning vs execution.

### [move-files-update-imports](./move-files-update-imports)
Multi-agent pipeline: planning agent → move task → import-fixing agent using TS Morph. Shows orchestration of multiple specialized agents.

### [typescript-formatting-pipeline](./typescript-formatting-pipeline)
A realistic 3-node pipeline showing:
- Agent making code changes (sandboxed)
- Automatic formatting with Prettier
- Type checking as a quality gate

## Running Examples

Each example directory contains:
- `pipeline.yaml` - The pipeline definition
- `README.md` - Documentation and explanation

To run an example:

```bash
cd examples/simple-hello-world
p run pipeline.yaml
```

## Learning Path

1. Start with `simple-hello-world` to understand basic syntax
2. Move to `typescript-formatting-pipeline` to see node composition and gates
3. Experiment by modifying the examples

## Contributing Examples

When adding new examples, include:
- Clear, focused use case
- Well-commented `pipeline.yaml`
- README explaining what's demonstrated
- Keep it simple - one concept per example
