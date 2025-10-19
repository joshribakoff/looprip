---
status: draft
---

When I run the vi test pipeline, there's a small delay I think because it's running a child process. But because this is Node.js to Node.js, I think we could do like an in-process trick to avoid that latency, right?
