---
timestamp: 'Fri Nov 07 2025 00:42:54 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004254.e63c0230.md]]'
content_id: 131d203fc349edd357e8ae384a2a0a4af0c0dcf0d4a262965b30987106af86c5
---

# response:

You've correctly identified yet another subtle but critical issue, and the log you provided is the key to solving it.

The situation is that the request sync (`CreatePostRequest`) fires and successfully calls the `Post.create` action, but the response sync (`CreatePostResponse`) never fires, leading to a timeout.

### The Problem: A Hidden Pattern Mismatch

This is one of the trickiest cases to debug. The issue isn't in the response sync; it's a subtle side effect of a pattern mismatch in the **request sync**.

1. **The Log's Clue:** The incoming `Requesting.request` from your client contains an extra, unexpected field: `userId`.
   ```
   Requesting.request {
     userId: '...',  // <-- The unexpected field
     content: '...',
     timestamp: '...',
     session: '...',
     path: '/Post/create'
   }
   ```
2. **The Sync's Strict Pattern:** Your `CreatePostRequest` sync is looking for a very specific pattern that **does not** include `userId`:
   ```typescript
   when: actions([
     Requesting.request,
     // This pattern expects ONLY path, session, content, and timestamp
     { path: "/Post/create", session, content, timestamp },
     { request },
   ]),
   ```
3. **The Root Cause:** While it seems the sync is firing (because `Post.create` is called), the presence of the unexpected `userId` field creates an ambiguous match for the synchronization engine. This ambiguity prevents the engine from correctly linking this flow to the `CreatePostResponse` sync, which is also looking for a `Requesting.request` in the same flow.

### The Solution: Explicitly Handle All Request Shapes

The most robust solution, consistent with previous fixes, is to treat this as another case of optional/unexpected parameters. We will create two separate request syncs to explicitly handle both possibilities: requests that (incorrectly) include a `userId` and requests that do not.

This removes all ambiguity for the engine and ensures the response sync can always find the correct flow to respond to.

Here is the updated and corrected `posts.sync.ts` file. The concept file (`PostConcept.ts`) does not need to be changed.

***

### Post Syncs (Corrected for Unexpected `userId`)

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

// --- Create Post (Corrected Flow with Two Request Syncs) ---

/**
 * Handles 'create post' requests that correctly OMIT the userId field.
 */
export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([
    Requesting.request,
    // This pattern matches requests WITHOUT an extra userId.
    { path: "/Post/create", session, content, timestamp },
    { request },
  ]),
  // The REAL user ID is always taken from the authenticated session.
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    { userId: user, content, timestamp },
  ]),
});

/**
 * Handles 'create post' requests that incorrectly INCLUDE a userId field.
 * This makes the server robust against this specific client behavior.
 */
export const CreatePostRequestWithClientUserId: Sync = ({ request, session, user, content, timestamp, clientUserId }) => ({
  when: actions([
    Requesting.request,
    // This pattern explicitly matches and binds the extra userId to ignore it.
    { path: "/Post/create", session, content, timestamp, userId: clientUserId },
    { request },
  ]),
  // The REAL user ID is still taken from the session, ignoring the client-sent one.
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    { userId: user, content, timestamp },
  ]),
});


// This single response sync works for BOTH request syncs above. No changes are needed.
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
