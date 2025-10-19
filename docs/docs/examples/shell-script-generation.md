---
sidebar_position: 3
---

# Example: Shell Script Generation

Problem: Agents emit long bash one-liners that are brittle and require broad approval.

Pipeline fix:

- Use a constrained DSL to template commands
- Grant narrow permissions; fail only on disallowed touches

Outcome: Fewer syntax errors, safer execution, incremental approvals.
