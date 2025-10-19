---
status: draft
---

We should add a small blog to the documentation website. 

The first post should mention how to create your own coding agent. 

We can then give a high-level overview of the architecture that we used here, where we have a system-level prompt that tells it which tools it can use and to only respond in JSON. We inspect the response, and if it's invalid JSON, we try it again. Then we parse the JSON and run the tools. 

We should avoid overly abstracting it and showing the pipeline abstraction. Instead, we should show a very minimal code example, like a tutorial for someone who wants to build their own first model. 

The end goal should basically be to get to the state where we ran a prompt asking it to update the documentation, we concatenated it onto the system prompt, we send it to the OpenAPI REST API, we parse the response, extract the JSON, and validate it with the Zod schema, and it went and read that file and then wrote it back with updated contents. 