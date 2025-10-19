---
status: draft
---

Currently, this project has a.vscode folder with a tasks.json for things like building and running at runtime. But we should be dogfooding our own system here, when we are doing agentic coding in this project, it should not launch VSCode terminals, which never get cleaned properly and often are full of errors. Instead, the tasks should be fully contained within our own runtime. 