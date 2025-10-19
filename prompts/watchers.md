---
status: draft
---

I'd like to see a better example of the watcher mode. 

There should be some declarative configuration file (should it be together or separate from the pipelines?)

This is where we would define different glob patterns, for example, being able to declare that whenever TypeScript files are changed, it triggers Prettier to run. 

This doesn't have to be mutually exclusive with our existing example that calls prettier in a pipeline. 

The user of our Agentic system is free to configure it however they want. They can have prettier called at certain steps in batch in their pipeline, or if they want, they can also set up file watchers that just call it ad hoc on changed files. 

When you run the CLI in interactive mode, you should be able to see something somewhere about the status of the watchers. 
