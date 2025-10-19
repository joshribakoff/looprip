# Web App Initiative - Planning Index

This folder contains sequenced plans to introduce a React web app that can orchestrate and observe agent pipelines, alongside the existing Ink TUI. The goal is to extract a backend runtime that both UIs communicate with over WebSockets/HTTP.

Order of documents:

1. 01-architecture.md - High-level system architecture and key decisions
2. 02-backend-extraction.md - Steps to separate backend runtime from TUI
3. 03-protocol.md - HTTP and WebSocket API, event schema, contracts
4. 04-web-app.md - React app structure, routes, data flows
5. 05-cli-integration.md - CLI commands, server lifecycle, detection
6. 06-security-and-multi-client.md - Auth, CORS, concurrency/isolation
7. 07-roadmap.md - Milestones, acceptance criteria, risks

Conventions:

- Keep components pure; side effects live in hooks/services (same as TUI).
- Prefer minimal dependencies; Node 18+, ESM.
- Tests via vitest where applicable.
