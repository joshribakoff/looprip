---
status: draft
---

Update the docs/ folder with new content, heres a draft, but I want you to rewrite it. Also make sure you search around and find the best place to put it, and don't just put it into an arbitrary file. 

----

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


Perfect — yeah, let’s switch out of “whitepaper mode” and write it like you’re explaining it to a smart dev who hasn’t gone deep into the agentic stack yet.

Here’s a developer-friendly version you could drop right into your README or docs:

⸻

🧩 Local Control vs. Vendor Loops

When you run something like Claude Code, Copilot, or Gemini, you’re actually letting their system drive the loop.
They decide how often to call the model, how to retry, how to apply changes, when to format, commit, etc.
You just sit inside the chat box while their agent does the thinking.

That’s fine for simple edits — but once you want to build your own logic, mix different models, or control what happens between steps, you hit a wall.

⸻

💡 What We’re Building Instead

Our runtime flips that around.
You control the loop.
	•	You can call any model (GPT-5, Claude, local Llama, whatever).
	•	You decide what happens before and after each model call.
	•	You can chain steps together (lint → test → commit) using plain YAML or JS.
	•	You can run it locally, or call out to vendor tools as subprocesses when you need them.

It’s like tmux for AI agents — one process managing a bunch of mini-agents and work trees that you actually own.

You could just as easily swap gpt5 for a claude-cli call or a local llama model — it’s all the same interface.

The point is you own the pipeline, not the AI vendor.

Unlike Cursor or Copilot, we don’t hide the loop — you own it.