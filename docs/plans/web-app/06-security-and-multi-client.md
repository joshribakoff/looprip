# 06 - Security and multi-client concerns

Scope (local-first):

- Default server binds to 127.0.0.1 only
- No auth by default for local dev
- CORS enabled for localhost web app

Production hardening (future):

- Token-based auth via env-configured bearer token
- HTTPS termination if exposed
- CSRF not applicable for pure API + WS, but consider origin checking

Multi-client:

- Multiple UIs (TUI/Web) can connect; events are broadcast per runId
- Back-pressure: clients should drop excess logs or request paging
- Run isolation: each run has its own channel; server maintains small ring buffer (e.g., 5k lines)

Resource limits:

- Cap concurrent runs (configurable)
- Cap log buffer per run; oldest trimmed
