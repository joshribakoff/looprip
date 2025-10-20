---
status: draft
---

Sometimes the model can make mistakes and try to call read file on a file that doesn't exist, which then throws an error and crashes the whole agentLoop. Instead, the agent should see the error so it can then iterate.
