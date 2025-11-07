---
timestamp: 'Fri Nov 07 2025 00:23:27 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_002327.d9526833.md]]'
content_id: 99c0fbe6279030b65ec7c5a642efebc407fcec6c5edbb08ff169872fcb297fc9
---

# response:

You have correctly identified another instance of the same core issue: **a strict pattern mismatch in the `when` clause due to an optional parameter.**

Your log is the perfect evidence to diagnose the problem.

### The Problem: Optional `songId` Not Handled

1. **The Log:**
   * `Requesting.request` fires with a payload for `/Post/create`.
   * This payload includes `content`, `timestamp`, and `session`.
   * Crucially, it **does not** include a `songId`, as this is a post that is not associated with a song.
   * The log shows that **`Post.create` is never called.**
   * The request times out.

2. **The Flawed Sync:**
   Your current `CreatePostRequest` sync has this pattern in its `when` clause:
   ```typescript
   when: actions([
     Requesting.request,
     // This pattern REQUIRES songId to be present.
     { path: "/Post/create", session, content, timestamp, songId }, 
     { request },
   ]),
   ```
   Because the incoming request from the client is missing the `songId` key, it does not match this strict pattern. As a result, the sync never fires, the action is never called, and the request times out.

### The Solution: Two Syncs for Two Cases

Just as we did for the `Ranking` concept's optional `songB`, the robust solution is to split the request-handling logic into two distinct syncs: one for posts *with* a `songId` and one for posts *without* it.

This ensures that no matter which payload shape the client sends, one of the syncs will match it and handle the request correctly. The existing `CreatePostResponse` sync will work for both cases without any changes.

Here is the fully corrected `posts.sync.ts` file with this fix.

***

### Post Syncs (Corrected for Optional `songId`)

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


// --- Create Post (Corrected Flow with Optional songId) ---

/**
 * Handles creating a post that is NOT linked to a song.
 * Its pattern explicitly omits `songId`.
 */
export const CreatePostRequestWithoutSong: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([
    Requesting.request,
    // This pattern matches requests WITHOUT a songId.
    { path: "/Post/create", session, content, timestamp },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    // We only pass the available parameters.
    { userId: user, content, timestamp },
  ]),
});

/**
 * Handles creating a post that IS linked to a song.
 * Its pattern explicitly includes `songId`.
 */
export const CreatePostRequestWithSong: Sync = ({ request, session, user, content, timestamp, songId }) => ({
  when: actions([
    Requesting.request,
    // This pattern matches requests WITH a songId.
    { path: "/Post/create", session, content, timestamp, songId },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    // We pass all parameters, including songId.
    { userId: user, content, timestamp, songId },
  ]),
});


// This response sync works for BOTH request syncs above. It does not need to change.
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


// --- Queries (Read - Refactored for Flat Response) ---
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
