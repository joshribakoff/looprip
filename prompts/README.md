# Prompts

This folder stores reusable prompts with YAML front matter for metadata and automation.

Each prompt is a Markdown file with front matter at the top. The runtime includes a Zod schema and parser to validate and load these files.

Front matter fields (validated by runtime/src/core/prompt.ts):

- status: draft | active | done | archived

See schema implementation at: runtime/src/core/prompt.ts

Usage outline:

- Put new files here, e.g., my-feature.md
- The CLI/interactive mode can list and load these via the provided parser and schema.

Notes:

- Files must use the .md extension and start with YAML front matter delimited by --- at the top.
- A lint task enforces this: run `npm run lint` at the repo root to validate prompts.
- Minimal example:

---

## status: draft

Describe your prompt goal here.
