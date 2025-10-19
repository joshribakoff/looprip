---
status: draft
---

`runtime/src/cli/ui/InteractiveApp.tsx`

This needs to be refactored more. We have all of the actions in the top-level component instead of co-located with the child component that actually uses it. Or better yet, if we're using a state management Redux pattern, then there should be some central state management store that defines the different slices and actions. Perhaps using Redux Toolkit.

All of the things being dispatched should be actions, not sending particular pieces of state. Like, we're not dispatching an action that says the user wants to arrow up and down. That should just be local state, local to the component using it. Once the user does make a selection by pressing Enter, that's when we dispatch an action to the Redux store.

There should be a separate unit test just for the Redux store so that we can test that in isolation. Those unit tests will prove whether the store is actually decoupled from the rest of the app. It will also allow us to have a single event bus with multiple UIs in front of it later on.
