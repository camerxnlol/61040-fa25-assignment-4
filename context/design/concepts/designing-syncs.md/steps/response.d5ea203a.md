---
timestamp: 'Wed Nov 05 2025 16:22:40 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_162240.44d5d301.md]]'
content_id: d5ea203a4b8b5f65fb9f1d4aa9326aa7ea5a6558c0ad2f3e152e021105b10082
---

# response:

You've correctly identified a common TypeScript issue when working with the `Frames` engine. The `where` clause operates on frames where variable bindings are of type `unknown`, so you need to provide the compiler with more type information to safely access their properties.

Here is the corrected version of the `posts.sync.ts` file, which resolves the "Object is of type 'unknown'" error.

### The Problem

In the `DeletePostRequest` synchronization, the line `frames.filter(($) => $[postData].userId === $[user])` fails because the type of `$[postData]` is `unknown`. TypeScript prevents you from accessing properties on an `unknown` type without first asserting or narrowing its type.

### The Solution

The solution is to define an interface for the post object that matches the query's return shape and then use a type assertion (`as`) within the filter to inform TypeScript of the object's structure.

Here is the updated and corrected file:

### Post Syncs (Corrected)

This file manages post creation and deletion, requiring authentication for both actions. It also provides public endpoints for retrieving posts.

```typescript
// file: src/syncs/posts.sync.ts

import { Post, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// Define an interface for the Post object structure returned by queries.
// This helps TypeScript understand the shape of the data in the frame.
interface PostObject {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date | string;
}

// --- Create Post ---

export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([Requesting.request, { path: "/Post/create", session, content, timestamp }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Post.create, { userId: user, content, timestamp }]),
});

export const CreatePostResponse: Sync = ({ request, post }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    [Post.create, {}, { post }],
  ),
  then: actions([Requesting.respond, { request, post }]),
});

export const CreatePostResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    [Post.create, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Post ---

export const DeletePostRequest: Sync = ({ request, session, post, user, postData }) => ({
  when: actions([Requesting.request, { path: "/Post/delete", session, post }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(Post._getPostById, { postId: post }, { post: postData });
    // CORRECTED: Use a type assertion to inform TypeScript about the shape of `postData`.
    return frames.filter(($) => ($[postData] as PostObject).userId === $[user]);
  },
  then: actions([Post.delete, { post }]),
});

export const DeletePostResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/delete" }, { request }],
    [Post.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeletePostResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/delete" }, { request }],
    [Post.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Posts By Author (Public) ---

export const GetPostsByAuthorRequest: Sync = ({ request, authorId }) => ({
  when: actions([Requesting.request, { path: "/Post/_getPostsByAuthor", authorId }, { request }]),
  then: actions([Post._getPostsByAuthor, { authorId }]),
});

export const GetPostsByAuthorResponse: Sync = ({ request, post }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/_getPostsByAuthor" }, { request }],
    [Post._getPostsByAuthor, {}, { post }],
  ),
  then: actions([Requesting.respond, { request, post }]),
});

// --- Get Post By ID (Public) ---

export const GetPostByIdRequest: Sync = ({ request, postId }) => ({
  when: actions([Requesting.request, { path: "/Post/_getPostById", postId }, { request }]),
  then: actions([Post._getPostById, { postId }]),
});

export const GetPostByIdResponse: Sync = ({ request, post }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/_getPostById" }, { request }],
    [Post._getPostById, {}, { post }],
  ),
  then: actions([Requesting.respond, { request, post }]),
});
```
