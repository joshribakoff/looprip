---
status: draft
---

I want to refactor our code to use this library and use React to render the terminal UI. This way we can have things like a side-by-side view of workspaces, prompts, pipelines, and file watchers. 

Or we don't even have to get too fancy with the layout to start. We could just have Live List with Updating Status and little tabs with hot-key shortcuts to switch between different screens. 

https://github.com/vadimdemedes/ink

The idea, though, is that all the pipelines and stuff are happening in background jobs, like child processes or something. 

And then the main thread is just like the controller, like the human loop. The human interacting with the UI, creating pipelines and things like that. 