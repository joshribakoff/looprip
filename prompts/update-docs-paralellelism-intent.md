---
status: draft
---


The documentation currently focuses on how this system avoids the downsides of traditional AI workflows — like runaway loops, lack of transparency, or excessive token costs.

Update the intro and home page (or README) to also emphasize that this project isn’t anti-AI — it’s about maximizing what AI can do when humans and automation share control.

Describe how the system enables:
	•	Parallel, agentic workflows that can run as fast as you can think — spawning work trees, iterating, and testing ideas in seconds.
	•	Human-in-the-loop orchestration, where users define and approve plans, while AI executes within clear, structured boundaries.
	•	A unified local runtime that behaves like a “tmux for AI agents” — one process orchestrating many concurrent pipelines, each isolated in its own workspace.
	•	Declarative YAML pipelines that can define steps, loops, and approval gates, yet still run locally and deterministically.
	•	Real-time feedback and review, through a terminal UI (built with Ink) that visualizes running tasks, dependencies, logs, and results.

The tone should balance the engineering vision (deterministic, composable, inspectable) with the creative vision (AI as a cognitive accelerator).

The end result should leave readers with the impression that this is not just a safer AI system — it’s a faster, more inspectable, and more collaborative one.

In short:

“We’re building tmux for AI agents — a local, inspectable, human-in-the-loop orchestrator that can scale from solo projects to swarms of coordinated models.”