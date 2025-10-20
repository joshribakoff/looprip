---
title: 'Example: Shell Script Generation'
description: 'Keep command generation precise and validated instead of ad-hoc shell scripts.'
---

# Example: Shell Script Generation

Problem: Agents emit long bash one-liners that are brittle and require broad approval.

Pipeline fix:

- Use a constrained DSL to template commands
- Grant narrow permissions; fail only on disallowed touches

Outcome: Fewer syntax errors, safer execution, incremental approvals.
