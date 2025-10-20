---
status: draft
---

I'd like to see a better example of the watcher mode.

There should be some declarative configuration file (should it be together or separate from the pipelines?)

This is where we would define different glob patterns, for example, being able to declare that whenever TypeScript files are changed, it triggers Prettier to run.

This doesn't have to be mutually exclusive with our existing example that calls prettier in a pipeline.

The user of our Agentic system is free to configure it however they want. They can have prettier called at certain steps in batch in their pipeline, or if they want, they can also set up file watchers that just call it ad hoc on changed files.

When you run the CLI in interactive mode, you should be able to see something somewhere about the status of the watchers.

You are updating our TypeScript agent runtime to add automatic prompt-triggered pipelines. Here’s what we need:

1. **File Watching**
   - Watch markdown files in a folder specified by the pipeline configuration YAML (do not hardcode the folder).
   - Detect changes to the front matter field `status`.

2. **Trigger Condition**
   - Only trigger a pipeline if `status` changes to `"approved"`.

3. **Pipeline Execution**
   - For now, execute the pipeline in the **main workspace**.
   - Assign the approved prompt to the agent to run its actions.

4. **Status Updates**
   - When the pipeline starts, update the prompt front matter to `"in_progress"`.
   - When the pipeline finishes successfully, update it to `"review"` or `"completed"`.

5. **Implementation Details**
   - Read the prompt folder path from the pipeline YAML configuration.
   - Use a NodeJS file watcher library (`chokidar`) or similar.
   - Parse front matter from markdown files (e.g., `gray-matter`).
   - Update front matter safely without breaking markdown content.
   - Maintain TypeScript typing for prompt metadata and status.
   - Log pipeline execution results and errors for debugging.

6. **Extra Notes**
   - Keep it simple: one watcher, one main workspace, one agent execution loop.
   - Structure the code so it can be extended later for multiple workspaces, fan-out, or parallel agents.

Write the TypeScript code that implements this feature. Include imports, setup, reading the folder from YAML, and example usage of watching the configurable prompt folder.
