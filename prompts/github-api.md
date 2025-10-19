---
status: draft
---

We should integrate with the GitHub API or MCP server such that you can interact with the bot through PRs and the bot can open PRs. For example, when the bot completes work, it should be able to push up a PR. We should be able to trigger pipelines based on the result of the CI checks. Like if a CI check fails, we should be able to trigger another pipeline that prompts another agent to start fixing those checks. 

Or if a human leaves a PR, review comments requesting a change that should be able to trigger another pipeline that triggers a model to come in and start implementing the feedback. 

Similarly, you should be able to tag the bot on a PR to request a review or ask a question. It should be able to take in the code changes, the question, and then comment its answer back onto a PR comment. 
