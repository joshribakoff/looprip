---
status: draft
---

We should add a small blog to the documentation website. 

The first post should mention how to create your own coding agent. 

We can then give a high-level overview of the architecture that we used here, where we have a system-level prompt that tells it which tools it can use and to only respond in JSON. We inspect the response, and if it's invalid JSON, we try it again. Then we parse the JSON and run the tools. 

We should avoid overly abstracting it and showing the pipeline abstraction. Instead, we should show a very minimal code example, like a tutorial for someone who wants to build their own first model. 

The end goal should basically be to get to the state where we ran a prompt asking it to update the documentation, we concatenated it onto the system prompt, we send it to the OpenAPI REST API, we parse the response, extract the JSON, and validate it with the Zod schema, and it went and read that file and then wrote it back with updated contents. 

----

The second post could be like, "Why we're creating our own coding agent."  Explaining that, like with the other tools, the vendor controls the loop. There is lots of fragmentation in the ecosystem. Like, one vendor has skills files, another has chat modes. Outline some of the example problems that we wrote about in the documentation folder with the AI spiraling and using low-level tools that burn up credits and get it off in the weeds. Mention the concepts we're prototyping here: pipelines that define file watchers. As the AI edits code, it gets formatted and linted before it ever hits disk. There's complete control over their pipelines which are declared in YAML files that get committed, and the prompts are also committed to the repository. The runtime updates the prompts as data, so the user doesn't have to edit the files directly. But they can also edit the files directly if they want to. 

And then the other problem we're solving is like that person who runs like three instances of VSCode in three different folders. They can now use this project in one place and scale it up a lot more and have like 50 things running in parallel if they want to. 