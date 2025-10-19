---
status: draft
---

To start with, just install the ts-morph library and then read me part of its documentation to prove you have visible access to it. 

And then propose some ideas so we can integrate it here. The idea is to give the model better tools than raw file manipulation. 

While we could overcomplicate it and create an entire virtual file system, trying to do all edits through this library, maybe we can start by dipping our toe in the water. 

One tool might just be to move a TypeScript file, and if that tool is used it invokes ts-morph to move that file while ensuring that all the imports get updated. 

The goal is that the model can ask to perform a single action to move a file, and then traditional tooling like TS Morph takes over the mechanics of actually moving it and updating the imports. 