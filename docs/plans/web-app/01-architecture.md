# 01 - High-level architecture

Goal: A shared backend runtime service that executes pipelines and emits structured events/logs consumable by both the Ink TUI and a React web app.

Key components:

- Backend service (Node, ESM):
  - HTTP endpoints to list pipelines, validate, and trigger runs
  - WebSocket event stream for live logs and pipeline lifecycle events
  - Uses existing PipelineParser and PipelineExecutor; injects a Logger adapter that emits events instead of writing to console
- Ink TUI:
  - Remains as-is initially, but can optionally connect to the backend via WS for logs
  - Short-term: can still run local execution path without server; long-term: use server when available
- React web app:
  - Connects to backend via REST/WS
  - Pages: Pipelines list, Run detail (live logs), Prompts list/create, Settings

Decisions:

- Runtime persistence: backend continues running independently of UIs. UIs can attach/detach freely. Avoid complex "who started server" shutdown prompts.
- Transport: WebSocket for live events; HTTP for control/read APIs.
- Event format: reuse InkLogger levels where meaningful; define a normalized envelope structure.
- Backward compatibility: CLI `p run` continues to work without the server, writing to console. A new command `p server` runs the backend.

Open questions:

- Multi-run concurrency: allow multiple concurrent runs or serialize? Tentative: allow multiple runs; tag events by runId.
- Persistence: minimal in-memory store for recent runs and logs; optional disk persistence later.

Success criteria:

- Start backend, open web app, trigger a pipeline, see live logs in both terminal and web UI.
- TUI can still run standalone without backend.
