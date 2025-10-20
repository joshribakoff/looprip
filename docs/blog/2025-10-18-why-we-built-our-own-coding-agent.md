---
slug: why-we-built-our-own-coding-agent
title: Why We Built Our Own Coding Agent
authors: [josh]
tags: [philosophy, ai, automation, architecture]
---

# Why We Built Our Own Coding Agent

Most AI coding tools are black boxes. You shout into a chat window and hope for the best. The vendor decides how the loop works, what tools get used, and how your code changes. We wanted the opposite: you decide the loop—declaratively, audibly, and under version control.

## From black boxes to blueprints

Instead of improvising every interaction in chat, you define a blueprint: a succinct, declarative pipeline that captures intent. Pipelines are:

- Declarative: describe what should happen, not how to micromanage the steps
- Auditable: committed to your repo, reviewed like code, and easy to roll back
- Composable: chain tasks, validations, and AI steps into repeatable flows
- Constrained: the AI operates inside clear boundaries you define

The point isn’t yet another task runner—it’s a way to shape the AI’s operating envelope so outcomes are predictable, reviewable, and affordable.

## Prompts as first‑class building blocks

Prompts aren’t throwaway chat messages. You write them once, give them context, and assign them to pipelines. That assignment constrains what the AI can do: which files it may touch, which tools it may invoke, and when it’s allowed to write to disk.

- Attach a prompt to a pipeline template and run it across a codebase
- Pass prompts to pipeline inputs
- Reuse prompts between projects; evolve them with your code

## Guardrails by design

Great results come from good constraints. Pipelines provide built‑in guardrails:

- In‑process transformations: format/lint/type‑check before changes hit disk
- Validation gates: compile, run tests, or enforce policies between steps
- Scoped edits: limit where and how the AI can modify code
- Bounded loops: clear iteration limits that prevent spirals

These guardrails keep the AI focused, fast, and cost‑effective—no more scanning the world to fix a small issue.

## Scales beyond a single session

Your work doesn’t live in one editor window. Pipelines can span multiple packages and repos, run steps in parallel, and even fan out to ephemeral worktrees when needed. You can coordinate large refactors or cross‑project updates without juggling three IDEs and five ad‑hoc chats.

## How it feels in practice (sketch)

- Define a short pipeline that: (1) formats and type‑checks changes in‑process, (2) runs your prompt to fix issues under constraints, (3) gates on tests before writing to disk
- Swap the prompt or reuse the pipeline across services; the rules are the same, the intent is explicit, and the history is reviewable
- Chain pipelines when goals grow—from a single file, to a package, to a repo set

No need to lock into a specific syntax here—the shape is simple: inputs → guardrails → tools → prompt → validation.

## Why this matters

- Control: you own the loop and the cost profile
- Consistency: the same task runs the same way every time
- Collaboration: prompts and pipelines are just files—review, diff, share
- Confidence: changes pass through gates before they ever touch your main branch

## Get started

Ready to take control of your AI automation? Read the getting started guide and browse a few examples:

- Getting started: /docs/intro
- Example pipelines: https://github.com/joshribakoff/agent-thing/tree/main/examples

The age of vendor‑controlled AI is ending. The age of developer‑controlled automation is just beginning.
