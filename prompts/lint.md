---
status: draft
---

Please setup ESLint and TypeScript in strict mode with no unused locals and all that.

Use the `lint-staged` library. And Husky git hooks.

Ensure that we have `npm run format` command set up as well as `npm run lint`.

Both of these commands should be using the concurrently package to run concurrently. And there should be bash scripts where that is actually set up. The flag should be passed so that the logs are grouped and color-coded.
