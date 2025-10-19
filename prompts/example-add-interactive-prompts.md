---
status: draft
---

Goal: Add an interactive prompt picker to the CLI that lets me browse prompts in `/prompts`, preview details (title, tags, status), and then apply the selected prompt to a chosen workspace.

Constraints
- Non-destructive by default. Do not modify prompt files unless explicitly requested.
- Respect `cleanup` settings after a successful run.
- Validate front matter against the schema before listing.

Acceptance criteria
- A new CLI action "Use a prompt" appears in interactive mode.
- It lists prompts (title + status + tags).
- Selecting a prompt opens a detail preview and confirmation step.
- After confirmation, the prompt body is passed to the appropriate pipeline/template.
- If `cleanup.toggleStatusOnComplete` is set, update front matter to the new status.

Notes
- Use the schema at `runtime/src/core/prompt.ts` for validation.
- Prefer file system reads over embedding prompts in code; keep them editable.
- Keep the door open to support subfolders by scanning `prompts/**/*.md`.
