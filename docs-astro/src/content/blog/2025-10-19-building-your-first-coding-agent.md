---
title: Building Your First Coding Agent
pubDate: 2025-10-19
author: Josh Ribakoff
authorImage: /img/team-avatar.svg
tags: [tutorial, ai, coding-agent]
---

# Building Your First Coding Agent (Essentials)

## 1) System prompt (JSON-only + actions)

Tell the model exactly how to respond and what it can do.

```
You are a coding agent. Only respond with valid JSON.

Available actions:
- read_file { path }
- write_file { path, content }

Response shape:
{
  "done": boolean,      // true when finished
  "action"?: {          // present when done=false
    "type": "read_file" | "write_file",
    "path": string,
    "content"?: string
  },
  "keepLooping"?: boolean
}
```

## 2) Concatenate the user request

Append the user prompt to the system prompt, e.g.:

```
User: Please update `hello.ts` to log "world".
```

## 3) Minimal agent loop

```js
import fs from 'node:fs/promises';

// Stub: call your model provider and return a JSON string
async function callAI(prompt) {
  // e.g. return (await openai.chat.completions.create(...)).choices[0].message.content
  return '{}';
}

async function agent(system, user) {
  let done = false;
  let context = '';

  while (!done) {
    const prompt = `${system}\n\nUser: ${user}\n\nContext: ${context}`;
    const raw = await callAI(prompt);
    const reply = JSON.parse(raw);

    if (reply.done) {
      done = true;
    } else if (reply.action && reply.action.type === 'read_file') {
      context = await fs.readFile(reply.action.path, 'utf8');
    } else if (reply.action && reply.action.type === 'write_file') {
      await fs.writeFile(reply.action.path, reply.action.content);
      context = 'wrote file';
    } else {
      // unknown or no action
      done = true;
    }
  }
}
```

That’s it: one system prompt, append the user’s request, loop until the model says done, and run exactly one tool per turn.

## 4) Next Steps

This example is intentionally oversimplified. A real agentic "code-in" system usually adds guardrails and ergonomics like:

- Basic retries on invalid JSON and minimal validation before writes
- Approval steps for risky actions and file allowlists/sandboxing
- Iteration limits/timeouts, logging, and traceability
- Format/lint/test gates and more actions (search, apply patch, run tests)

Why build your own in the first place? That’s what we cover next: [Why We Built Our Own Coding Agent](/blog/why-we-built-our-own-coding-agent).
