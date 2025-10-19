# Agents guide (co-pilot instructions)

This repository provides a CLI for running agentic pipelines and an interactive TUI built with Ink. This guide is for GitHub Copilot (and similar assistants) to make effective, safe edits.

## What you’re editing

- CLI entry: `runtime/src/cli/index.ts`
- Interactive TUI (Ink):
  - App wrapper: `runtime/src/cli/ui/InteractiveApp.tsx`
  - Screens: `runtime/src/cli/ui/screens/*.tsx`
  - Hooks: `runtime/src/cli/ui/hooks/*.ts`
  - UI state store: `runtime/src/cli/ui/state/uiStore.tsx`
- Core runtime:
  - Parsing: `runtime/src/core/parser.ts`
  - Execution: `runtime/src/executors/*`
  - Types: `runtime/src/types/*`
  - Utilities: `runtime/src/utils/*`

Examples live under `examples/`, docs source under `docs/`.

## How to build, run, and test

- Never create VS Code tasks. Use npm scripts only.

- Install CLI once from repo root:
  - `npm run install:cli`
- Run a pipeline:
  - `p run examples/simple-task-test/pipeline.yaml`
- Interactive mode (TTY only):
  - `npm run interactive` (preferred script)
  - or `p` (no args) / `p interactive`
- Validate only:
  - `npm run validate -- examples/simple-task-test/pipeline.yaml`
- Prompt scaffolding:
  - `npm run prompt:create -- my-new-prompt`
- Dev loop in `runtime/` (via workspace scripts):
  - `npm run runtime:dev` (type-check watch)
  - `npm run runtime:build` (compile TypeScript)
  - `npm run runtime:test` (Vitest)
  - `npm run runtime:lint`

Environment:
- Set `ANTHROPIC_API_KEY` for agent nodes, or pass `--api-key` to `p run`.

## Ink TUI architecture (quick primer)

- We render the Ink app from the CLI: `render(<InteractiveApp />)` inside `runtime/src/cli/index.ts`.
- `InteractiveApp` wraps the tree in `UIProvider` (central state store) and shows `AppInner`.
- `uiStore.tsx` defines:
  - Modes: `'select' | 'custom-path' | 'enter-prompt' | 'running' | 'summary' | 'create-prompt'`
  - Status: `'idle' | 'loading' | 'success' | 'error'`
  - Actions helpers in `actions.*`
- Screens in `ui/screens` are small, focused components.
- Hooks in `ui/hooks` perform side effects (discovery, running pipelines, validation).

How a typical interaction flows:
1) Select screen lists pipelines (via `usePipelineDiscovery`).
2) Enter prompt if pipeline template requires `{{prompt}}`.
3) Run pipeline (via `usePipelineRunner`) and show `StatusScreen`.
4) Return to select with last choice preselected.

TTY check: interactive mode requires a TTY; the CLI exits early with a helpful message if not.

Ink references:
- Local package docs: `runtime/node_modules/ink/readme.md`
- Upstream docs: https://github.com/vadimdemedes/ink

Note: Don’t copy Ink docs verbatim into this repo. Link to them instead.

## Making changes safely

- Prefer small PRs: one screen or one hook at a time.
- Keep all TUI components pure and side-effect free; put I/O in hooks.
- Avoid heavy Node APIs in components; they must render fast and be resilient to re-renders.
- When adding a new UI flow:
  1) Add a new mode to `uiStore.tsx` if needed.
  2) Create a screen under `ui/screens/YourScreen.tsx`.
  3) Add a focused hook under `ui/hooks` for any async work.
  4) Wire it in `InteractiveApp.tsx` based on `mode`.
- When adding CLI commands:
  - Define a new `program.command()` in `runtime/src/cli/index.ts`.
  - Keep parsing/printing consistent (use `chalk` and `Logger`).

## Runtime architecture checkpoints

- Parser: `PipelineParser.loadFromFile(path)` yields a typed pipeline.
- Executor: `runtime/src/executors/` has `agent`, `task`, and `gate` executors.
- Logger: `runtime/src/utils/logger.ts` centralizes output formatting for non-TUI commands.
- Types: `runtime/src/types/pipeline.ts` and `schema.ts` define inputs and validation.

When extending executors:
- Put new executor under `runtime/src/executors/your-executor.ts` and export it via `executors/index.ts`.
- Update schema/types if adding new node kinds.
- Add unit tests in `runtime/tests/`.

## Coding style

- TypeScript, ESM (`"type": "module"`), Node 18+.
- Use `zod` for validation and `vitest` for tests.
- Keep imports relative within the `runtime/` package.
- UI uses React 19 + Ink 6; write `.tsx` for components.

### State management patterns (Redux-style)

We use a Redux-like pattern with React Context + useReducer for UI state. Follow these critical principles:

**✅ DO: Dispatch semantic actions that represent events**
- Actions should describe **what happened**, not **how to update state**
- Good: `PIPELINE_COMPLETED`, `USER_NAVIGATED_TO_MAIN_MENU`, `PROMPT_CREATED`
- Bad: `SET_MODE`, `SET_STATUS`, `SET_MESSAGE`

**❌ DON'T: Dispatch multiple actions in a row**
- This is a code smell indicating you're thinking imperatively about state
- If you need to dispatch multiple actions, create a single semantic action instead
- Bad example:
  ```typescript
  dispatch(actions.setMode('summary'));
  dispatch(actions.setStatus('error'));
  dispatch(actions.setMessage('Failed'));
  dispatch(actions.setLastResult(false));
  ```
- Good example:
  ```typescript
  dispatch(actions.pipelineFailed('Failed'));
  ```

**✅ DO: Keep components self-contained**
- Components should use `useUiDispatch()` and `useUiState()` directly
- Avoid prop drilling callbacks with dispatch logic
- Bad: Parent passes `onChange={() => dispatch(actions.setCustomPath(v))}`
- Good: Child component handles its own state interactions

**✅ DO: Frame actions declaratively**
- Think about user intentions and system events, not state mutations
- Examples: "user clicked run", "pipeline completed", "validation failed", "user navigated back"
- The reducer decides how these events affect state

## Quick tasks for co-pilots

- Add a new screen: clone `SelectScreen.tsx` style and adapt props.
- Add a new CLI subcommand: follow the `prompt create` command pattern.
- Improve validation: enhance `validate` subcommand formatting via `Logger`.
- Enhance discovery: adjust `usePipelineDiscovery` to include more search roots or filters.

## Gotchas and edge cases

- Interactive mode must run in a TTY; guard with `process.stdout.isTTY && process.stdin.isTTY`.
- Skip scanning `node_modules`, `.git`, and `dist` when walking files (see `findPipelineFiles`).
- Keep UI responsive: long operations should set `status` and render a spinner/message.
- Always handle errors and transition to `summary` mode with a clear message.

## Where to look for examples

- Pipelines: `examples/*/pipeline.yaml`
- Prompt scaffolding: `runtime/src/cli/createPrompt.ts`
- UI patterns: `SelectScreen.tsx`, `StatusScreen.tsx`, `EnterPromptScreen.tsx`

## Contributing and docs

- End-user README: `README.md`
- Runtime details: `runtime/README.md`
- Docs site sources: `docs/` (Docusaurus)

If you’re an AI co-pilot, keep changes minimal, link to upstream docs, and run tests before finishing.

## npm scripts reference (no VS Code tasks)

From repo root:

- `npm run interactive` — launch interactive TUI.
- `npm run run -- <pipeline>` — run a pipeline (passes through to `p run`).
- `npm run validate -- <pipeline>` — validate a pipeline.
- `npm run prompt:create -- [nameOrPath]` — create a Markdown prompt file.
- `npm run runtime:build` / `runtime:dev` / `runtime:test` / `runtime:lint` — work on the runtime package.

Do not add tasks.json or VS Code tasks; use these scripts for repeatable workflows.
