---
title: 'Example: Watch Mode Deadlock'
description: 'Avoid deadlocks caused by long-running watch modes during agent execution.'
---

# Example: Watch Mode Deadlock

Problem: Tests launched in watch mode never exit; agent waits forever.

Pipeline fix:

- Task node runs tests with a timeout (e.g., 10s)
- Gate kills hung process; pipeline proceeds or fails explicitly

Outcome: No deadlocks. Clear time-bounded runs.
