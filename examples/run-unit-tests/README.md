# Run Unit Tests Pipeline

This pipeline demonstrates dogfooding by using the agent-pipeline runtime to run its own unit tests.

## What It Does

1. **run-and-verify-tests**: Executes the vitest test suite in the runtime directory. The npm test command automatically exits with code 1 if any tests fail, which causes the pipeline to fail.

## Usage

From the root of the repository:

```bash
# Build and link the runtime (one-time setup)
cd runtime
npm install
npm run build
npm link
cd ..

# Run the pipeline
p run examples/run-unit-tests/pipeline.yaml
```

## Expected Behavior

- If all tests pass: Pipeline succeeds (exit code 0)
- If any test fails: Pipeline fails at the gate (exit code 1)

## Why This Matters

This is a simple but important example of dogfooding - using the agent-pipeline runtime to test itself. It demonstrates:

- Task execution with shell commands
- Quality gates that verify success/failure
- Real-world integration testing of the pipeline system
