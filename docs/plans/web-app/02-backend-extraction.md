# 02 - Backend extraction plan

Objective: Extract a backend runtime service from the TUI, exposing REST/WS APIs, while keeping current CLI/TUI behavior intact.

Step-by-step:

1. Introduce a new Logger adapter `EventLogger` that implements the `Logger` interface but emits structured events (in-memory pub/sub).
2. Add a simple event bus (`EventEmitter`-based) with channels: server, runs, logs.
3. Create a server entry `runtime/src/server/index.ts`:
   - HTTP: GET /pipelines (discovery), GET /prompts, POST /runs, GET /runs/:id, GET /runs/:id/logs
   - WS: /ws for live events (runStarted, nodeStart, stdout, stderr, nodeSuccess, nodeFailed, runCompleted)
4. Wrap `PipelineExecutor` with `EventLogger` so that logs are dispatched to bus instead of stdout.
5. Implement a rudimentary in-memory store of runs (id, status, timestamps, pipeline path, prompt, stats).
6. Add CLI command `p server` to start the backend; print URL and WS endpoint.
7. Optional: `p web` to start backend if needed and open the web UI (later when web app exists).

Compatibility and toggles:

- Keep `p run` behavior unchanged (console Logger). Add `--through-server` later to force routing via server.
- TUI remains unchanged; future option: a TUI mode that tails a specific run via WS.

Edge cases:

- Non-TTY environments: server starts fine, TUI blocked.
- Server already running: `p server` detects via port probe and exits with a message.
- API key: server reads from env; `p run --api-key` still works in direct mode.
