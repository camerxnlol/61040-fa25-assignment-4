---
timestamp: 'Fri Nov 07 2025 00:47:11 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004711.0ffd92aa.md]]'
content_id: 5470e4cfd7c389c85ad8e2b26f6af0c25c67fa7986b158f8cf3e1a71928872d2
---

# response:

You have found an excellent and subtle bug. Your diagnosis is spot on: one request is triggering two `Post.create` actions.

The log is the perfect evidence. Here is the step-by-step reason why this is happening and the fix.

### The Root Cause: Overlapping Sync Patterns

The problem lies in how the synchronization engine matches patterns in the `when` clause.

1. **The Request:** Your client sends a `Requesting.request` that includes the keys: `{ path, session, content, timestamp, userId }`.

2. **Sync #1 Match (`CreatePostRequestWithClientUserId`):**
   * Its pattern is: `{ path, session, content, timestamp, userId: clientUserId }`.
   * The incoming request has all of these keys. **This is a perfect match.** This sync fires.

3. **Sync #2 Match (`CreatePostRequest`):**
   * Its pattern is: `{ path, session, content, timestamp }`.
   * The engine's pattern matching is inclusive, not exclusive. It asks, "Does the incoming request have *at least* these keys?" Since the request has `{ path, session, content, timestamp, userId }`, it certainly has the required subset. **This is also a match.** This sync also fires.

Because both `when` clauses are satisfied by the same incoming request, both syncs execute their `then` clauses independently, resulting in two calls to `Post.create`.

### The Solution: Merge and Simplify

The best practice for handling optional or unexpected parameters is not to create multiple syncs (which can lead to this exact problem), but to create a single, robust sync that can handle all variations of the request.

We will merge the two request syncs back into one. This single sync will:

* Use a pattern that captures the optional `clientUserId` if it exists.
* **Always** use the `user` ID from the authenticated `session` as the source of truth, ignoring whatever the client sent.

This approach is simpler, eliminates the bug, and is more secure.

Here is the corrected and simplified `posts.sync.ts` file.

***

### Post Syncs (Corrected and Simplified)

```typescript
// file: src/syncs/posts.sync.ts

import { Post, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

interface PostObject {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date | string;
}


// --- Create Post (Corrected and Merged Flow) ---

/**
 * MERGED: This single, robust sync handles all 'create post' requests.
 * It correctly handles requests that may or may not include a 'userId' field from the client.
 */
export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp, clientUserId }) => ({
  when: actions([
    Requesting.request,
    // This pattern now captures the optional `userId` from the client as `clientUserId`.
    // If `userId` is not in the request, `clientUserId` will be `undefined`.
    { path: "/Post/create", session, content, timestamp, userId: clientUserId },
    { request },
  ]),
  // The 'where' clause is our source of truth. It gets the real user from the session.
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    // We use the authenticated `user` from the session, ignoring `clientUserId`.
    { userId: user, content, timestamp },
  ]),
});

// This response sync works perfectly with the single request sync. No changes needed.
export const CreatePostResponse: Sync = ({ request, post, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    [Post.create, {}, { post, error }],
  ),
  then: actions([Requesting.respond, { request, post, error }]),
});


// --- Delete Post ---
export const DeletePostRequest: Sync = ({ request, session, post, user, postData }) => ({
  when: actions([Requesting.request, { path: "/Post/delete", session, post }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(Post._getPostById, { postId: post }, { post: postData });
    return frames.filter(($) => ($[postData] as PostObject).userId === $[user]);
  },
  then: actions([Post.delete, { post }]),
});

export const DeletePostResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/delete" }, { request }],
    [Post.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Queries (Read) ---
export const GetPostsByAuthor: Sync = ({ request, authorId, posts }) => ({
  when: actions([Requesting.request, { path: "/Post/_getPostsByAuthor", authorId }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorIdValue = originalFrame[authorId] as ID;
    const queryResult = await Post._getPostsByAuthor({ authorId: authorIdValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();

    const postList = queryResult.map(item => item.post);
    return new Frames({ ...originalFrame, [posts]: postList });
  },
  then: actions([Requesting.respond, { request, posts }]),
});

export const GetPostById: Sync = ({ request, postId, post }) => ({
  when: actions([Requesting.request, { path: "/Post/_getPostById", postId }, { request }]),
  where: async (frames) => {
    const frame = frames[0];
    const postIdValue = frame[postId] as ID;
    const queryResult = await Post._getPostById({ postId: postIdValue });
    if (Array.isArray(queryResult) && queryResult.length > 0 && "post" in queryResult[0]) {
      frame[post] = queryResult[0].post;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, post }]),
});
```
