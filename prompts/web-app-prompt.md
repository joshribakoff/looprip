---
status: draft
---

Goal: Design and scaffold a React web app and supporting backend so users can trigger pipelines and view live logs in a browser, while preserving current CLI/TUI flows. Provide a CLI command to launch/open the web app. Pipelines execute in the same Node runtime, with logs visible both in the terminal and in the web app.

What to build (high-level):

- Backend service (Node, ESM) that exposes:
  - HTTP APIs: list pipelines, create runs, inspect runs, download logs
  - WebSocket stream for live pipeline events/logs
  - Reuse PipelineParser and PipelineExecutor; inject a Logger adapter that emits events
- React web app (Vite) that:
  - Lists pipelines and prompts
  - Triggers a run; navigates to a run detail page
  - Shows initial logs and tails live updates via WebSocket
- CLI additions:
  - `p server` to start backend
  - `p web` to ensure backend is running and open the web app

Key decisions and constraints:

- Runtime continues running independent of UIs; UIs can attach/detach at will (no complex shutdown coordination).
- Transport: HTTP for control; WebSocket for live logs and lifecycle events.
- Keep existing `p run` behavior unchanged; server-backed run is optional at first.
- Maintain the Redux-like semantics in TUI; extract a shared event schema so both UIs render the same concepts.

Contract outline:

- WS envelope:
  - type: run.started | node.started | log.stdout | log.stderr | node.succeeded | node.failed | run.completed
  - runId: string (ulid/nanoid)
  - time: ISO timestamp
  - payload: object (see docs/plans/web-app/03-protocol.md)
- HTTP endpoints:
  - GET /pipelines -> array of { path, name, description }
  - POST /runs { path, prompt? } -> { runId }
  - GET /runs -> recent runs with status
  - GET /runs/:id/logs -> NDJSON or array

Architecture steps:

1. Add EventLogger (adapts Logger to emit structured events instead of console writes).
2. Add in-memory EventBus and RunsStore.
3. Create server entry with REST + WS; wire EventLogger to PipelineExecutor.
4. Add `p server` command; print URL and WS endpoint.
5. Scaffold React app (Vite) with pages: Pipelines, Run, Prompts, Settings.
6. Implement WS client to tail logs; render with virtualized list.
7. Add `p web` command to ensure server and open UI.

Acceptance criteria (MVP):

- Start backend via `p server`.
- Open web app; see pipelines discovered from repo.
- Trigger a run; see live logs and final status in the browser.
- Same run is visible in terminal logs when started from CLI.

References and notes:

- See docs/plans/web-app for detailed architecture and milestones.
- Keep components pure; side effects in hooks/services; prefer small PRs.
