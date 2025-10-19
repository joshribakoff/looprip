---
status: draft
---

The Ink (InteractiveApp.tsx & sub-components) app should use some kind of state management, whether it's context, Redux, or some more modern thing like MobX or whatever.

Implemented: lightweight Context + Reducer store

- Location: `runtime/src/cli/ui/state/uiStore.tsx`
- Provider: `UIProvider` wraps `InteractiveApp` and exposes `useUiState()` and `useUiDispatch()` hooks
- Centralized state: mode, index, input values, run status, notice
- Screens remain mostly presentational and receive props, while `InteractiveApp` coordinates actions via the store

Future: If the app grows, this can be swapped for Redux, Zustand, or Jotai with minimal changes to screen components.
