---
sidebar_position: 1
---

# Example: File Move Spiral

Problem: Asked an agent to move files to a subfolder. Instead of `mv`, it rewrote files one by one, wasting time and credits.

Pipeline fix:

- Task node runs a precise move operation
- Gate validates only expected files changed
- Agent node plans, but cannot perform unrestricted edits

Outcome: Fast, deterministic moves with audit of changed files.
