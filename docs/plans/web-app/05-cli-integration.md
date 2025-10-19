# 05 - CLI integration strategy

New commands (in `runtime/src/cli/index.ts`):

- `p server [--port 4321] [--host 127.0.0.1]` — start backend server
  - Detect if already running (HTTP GET /health) and exit with message
- `p web` — ensure server is running; launch web app (once built) or open URL
- `p run` — unchanged; later: `p run --through-server` to use backend
- `p interactive` — unchanged; later can subscribe to WS for a chosen run

Detection logic:

- Default port env: `PIPELINE_SERVER_PORT` or 4321
- `p web` tries localhost:port; if not responding, spawn server in background and wait for health

Packaging:

- Keep server in `runtime` package; web app as sibling package or inside `/web/` with its own build
- Optional: add root scripts to run both via concurrently
