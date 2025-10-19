# 07 - Roadmap and milestones

Milestone 1: Backend skeleton

- EventLogger adapter
- In-memory event bus
- Server with /health, /pipelines, /runs (POST), WS /ws
- CLI `p server`
- Acceptance: Can start server, POST run for an example pipeline, and receive live WS logs

Milestone 2: Web app MVP

- Vite app scaffolding
- Pipelines list
- Trigger run and live logs view
- Acceptance: Trigger a run from web, see logs, success/failure indicator

Milestone 3: TUI coexistence

- TUI can tail a run via WS (optional)
- Shared types package or local types reuse
- Acceptance: TUI and Web both view the same run concurrently

Milestone 4: CLI integration polish

- `p web` command to ensure server and open web UI
- Port detection and friendly messages

Milestone 5: Persistence and UX

- Keep last N runs and logs in memory, export to file
- Better log filtering/search, node timeline

Risks and mitigations

- Log volume: mitigate via ring buffers and truncation
- Concurrency: queue or limit; surface errors clearly
- Backward compatibility: keep `p run` unchanged until server solid
