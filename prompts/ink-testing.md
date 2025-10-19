---
status: draft
---

Add integration tests. Ideally, we should have a way to mock out the final system or have it use temporary directories that get cleaned up.

Or better yet, we should decouple the UI from the runtime so that the UI is just creating events on an event bus, and we test that with the UI completely pure.

That allows us to do things like simulate really complex pipelines in the UI without actually having to spin those pipelines up. Also we can actually test the remote pipeline.

https://github.com/vadimdemedes/ink?tab=readme-ov-file#testing
