---
timestamp: 'Fri Nov 07 2025 00:46:40 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004640.4079df42.md]]'
content_id: 2868a9700d7890520ad5610ea0d022ded09d2a83888a6cb6ad7c70c0f51af071
---

# prompt: Why do I get 2 create post for 1 request? See below and fix

```
[Requesting] Received request for path: /Post/create

Requesting.request {
  userId: '019a5ca2-0ce1-7063-ba0f-c4fee932c6a0',
  content: 'testuser10 ranked Sparks 5.0',
  timestamp: '2025-11-07T05:45:02.002Z',
  session: '019a5cc3-2595-7360-87fa-2c862bb35335',
  path: '/Post/create'
} => { request: '019a5cd8-c73e-725d-8e50-a7beea70621a' }


Post.create {
  userId: '019a5ca2-0ce1-7063-ba0f-c4fee932c6a0',
  content: 'testuser10 ranked Sparks 5.0',
  timestamp: '2025-11-07T05:45:02.002Z'
} => { post: '019a5cd8-c77f-7ae2-8780-eb2657043751' }


Post.create {
  userId: '019a5ca2-0ce1-7063-ba0f-c4fee932c6a0',
  content: 'testuser10 ranked Sparks 5.0',
  timestamp: '2025-11-07T05:45:02.002Z'
} => { post: '019a5cd8-c7ce-7d13-933e-02139471de20' }
```
