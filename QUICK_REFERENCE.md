# Quick Reference Guide

## Installation

```bash
cd runtime
npm install
npm run build
```

## Basic Commands

```bash
# Run a pipeline
agent-pipeline run pipeline.yaml

# With user prompt
agent-pipeline run pipeline.yaml --prompt "Your request"

# Verbose mode
agent-pipeline run pipeline.yaml -v

# Dry run (validate only)
agent-pipeline run pipeline.yaml --dry-run

# Validate without running
agent-pipeline validate pipeline.yaml
```

## Pipeline YAML Structure

```yaml
name: my-pipeline
description: Optional description

nodes:
  - id: node1
    type: task|agent|gate
    description: Optional description
    # ... type-specific fields
```

## Node Types

### Task Node
```yaml
- id: format
  type: task
  description: Format code
  command: npx prettier --write src
  cwd: /optional/working/dir
  env:
    KEY: value
  track_changes: true
```

### Agent Node
```yaml
- id: plan
  type: agent
  description: Plan the work
  model: claude-3-5-sonnet-20241022
  prompt: "Do something with {{input}}"
  tools: [file_read, file_write, file_list]
  output_schema: "{result: string}"
```

### Gate Node
```yaml
- id: typecheck
  type: gate
  description: Verify types
  command: npx tsc --noEmit
  message: "Type checking failed"
```

## Variable Interpolation

```yaml
# User prompt
command: echo {{prompt}}

# Changed files
command: npx prettier --write {{changed_files}}

# Node output
command: mv {{plan.source}} {{plan.destination}}

# Nested property
command: echo {{config.server.port}}

# Array expansion
command: mv {{files[].from}} {{files[].to}}
```

## Schema Syntax

```yaml
# Primitives
output_schema: "string"
output_schema: "number"
output_schema: "boolean"

# Objects
output_schema: "{name: string, age: number}"

# Arrays
output_schema: "array<string>"
output_schema: "array<number>"

# Complex nested
output_schema: "{items: array<{id: string, value: number}>}"
output_schema: "array<{source: string, dest: string}>"
```

## Built-in Tools

### file_list
List files in a directory
```javascript
{ path: "src/" }  // Returns: [{name: "file.ts", type: "file"}, ...]
```

### file_read
Read file contents
```javascript
{ path: "src/index.ts" }  // Returns: {content: "..."}
```

### file_write
Write file contents
```javascript
{ path: "src/new.ts", content: "..." }  // Returns: {success: true}
```

## Environment Variables

```bash
export ANTHROPIC_API_KEY=sk-...
```

Or use CLI flag:
```bash
agent-pipeline run pipeline.yaml --api-key sk-...
```

## Testing

```bash
# Run unit tests
cd runtime
npm test

# Run integration tests
cd ..
./test.sh
```

## Common Patterns

### Format and Check
```yaml
nodes:
  - id: format
    type: task
    command: npx prettier --write {{files}}
    
  - id: check
    type: gate
    command: npx tsc --noEmit
```

### Agent Plans, Task Executes
```yaml
nodes:
  - id: plan
    type: agent
    prompt: "Decide what to do"
    tools: [file_list]
    output_schema: "{action: string}"
    
  - id: execute
    type: task
    command: "{{plan.action}}"
```

### Multi-Agent Chain
```yaml
nodes:
  - id: analyze
    type: agent
    prompt: "Analyze the code"
    tools: [file_read]
    output_schema: "{findings: array<string>}"
    
  - id: fix
    type: agent
    prompt: "Fix: {{analyze.findings}}"
    tools: [file_write]
    output_schema: "{fixed: array<string>}"
```

## Debugging

### Enable verbose mode
```bash
agent-pipeline run pipeline.yaml -v
```

### Validate first
```bash
agent-pipeline validate pipeline.yaml
```

### Check exit codes
```bash
agent-pipeline run pipeline.yaml
echo $?  # 0 = success, 1 = failure
```

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "missing required field" | Invalid YAML | Add required field |
| "Unable to resolve template" | Variable doesn't exist | Check node ID |
| "doesn't match schema" | Wrong output type | Fix agent output |
| "Command exited with code N" | Task failed | Check command |
| "Gate check failed" | Validation failed | Fix code/command |

## File Structure

```
project/
├── pipeline.yaml          # Your pipeline definition
├── runtime/
│   ├── dist/             # Compiled runtime
│   └── src/              # Runtime source
└── your-code/            # Code the pipeline operates on
```

## Tips

1. **Start simple** - Test with task nodes before adding agents
2. **Validate early** - Use `validate` command during development
3. **Use verbose mode** - See what's happening with `-v`
4. **Schema-first** - Define output schemas before writing prompts
5. **Small tools** - Agents work best with focused, simple tools
6. **Gates for safety** - Always validate with gates
7. **Dry run** - Test without executing with `--dry-run`

## Links

- [Runtime README](runtime/README.md)
- [Examples](examples/)
- [Full Documentation](docs/)
- [Implementation Details](IMPLEMENTATION_COMPLETE.md)
