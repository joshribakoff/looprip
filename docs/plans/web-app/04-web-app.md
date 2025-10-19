# 04 - React web app plan

Stack: React + Vite (or Next.js if SSR needed later). Start with Vite for simplicity.

Structure:

- src/
  - app/ (router)
  - components/
    - LogsView (virtualized)
    - PipelinesList
    - RunSummary
  - pages/
    - Pipelines.tsx (list + run action)
    - Run.tsx (run detail + live logs)
    - Prompts.tsx (list/create)
    - Settings.tsx
  - services/
    - api.ts (HTTP client)
    - ws.ts (WebSocket client)
  - store/
    - runs.ts (Zustand or Redux Toolkit; consider Zustand for simplicity)
  - types/ (reuse runtime types via a shared package later)

Core flows:

- Pipelines list loads from GET /pipelines
- Trigger run POST /runs -> navigate to /run/:id
- Run page: fetch initial logs from GET /runs/:id/logs, then connect WS and append live
- Allow stop/cancel (future) via DELETE /runs/:id

UX details:

- Persist last server URL in localStorage
- Basic theming, dark mode
- Keyboard shortcuts: r to rerun, s to stop, g/j for navigation

Testing:

- Component tests with vitest + react-testing-library
- Mock server via MSW for local development
