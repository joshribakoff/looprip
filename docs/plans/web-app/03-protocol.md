# 03 - Protocol (HTTP + WebSocket)

Event envelope (WS):

```
{
  "type": "run.started|node.started|log.stdout|log.stderr|node.succeeded|node.failed|run.completed",
  "runId": "string",
  "time": "ISO",
  "payload": { ... }
}
```

Examples:

- run.started: { pipelineName, pipelinePath, userPrompt }
- node.started: { nodeId, nodeType, description }
- log.stdout: { text }
- log.stderr: { text }
- node.succeeded: { nodeId, durationMs }
- node.failed: { nodeId, durationMs, error }
- run.completed: { success, totalDurationMs, nodeCount, filesChanged }

HTTP endpoints (JSON):

- GET /pipelines => [{ path, name, description }]
- GET /prompts => [{ path, title, summary }]
- POST /runs { path, prompt? } => { runId }
- GET /runs => [{ id, status, startedAt, finishedAt, path, prompt }]
- GET /runs/:id => { id, status, ... }
- GET /runs/:id/logs => NDJSON or array of log entries

Status model:

- queued | running | success | error

Notes:

- IDs: use ulid or nanoid for monotonic sort.
- All timestamps in ISO 8601.
- Consider backpressure: clients can request buffered logs from /runs/:id/logs and then switch to WS for live tail.
