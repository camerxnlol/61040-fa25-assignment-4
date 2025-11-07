---
timestamp: 'Fri Nov 07 2025 00:32:25 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_003225.4bc724e8.md]]'
content_id: ee34d5edc0489cd1abd205a4773452e96b45e9c538aab5c21dbf017c25d7701e
---

# response:

Of course. This is a clarifying request that simplifies the `Post` concept back to its original purpose. By removing the `songId` from the `create` action, we are making a clear design choice that posts are generic and not directly linked to songs.

This change will resolve the timeout issue by removing the need to handle an optional parameter. However, it's important to understand a key consequence: **this will remove the feature where creating a post moves a song to `pastRecommendations`**. That synchronization (`MoveSongToHistoryOnPost`) relied entirely on the `songId` being part of the `Post.create` action, so it will no longer be possible.

Here are the updated files reflecting your request to remove `songId` from the post creation process.

***

### 1. Post Concept (Updated)

We will remove `songId` from the `PostDocument` state and from the `create` action's signature. The concept is now simpler and only concerned with user content.

```typescript
// file: src/concepts/Post/PostConcept.ts (MODIFIED)

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Post.";

// --- Concept State ---

interface PostDocument {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date;
  // songId has been removed.
}

export default class PostConcept {
  private readonly posts: Collection<PostDocument>;

  constructor(db: Db) {
    this.posts = db.collection<PostDocument>(PREFIX + "posts");
  }

  /**
   * create (userId: ID, content: string, timestamp: Date): { post: ID }
   *
   * MODIFICATION: The optional songId parameter has been removed.
   */
  async create({ userId, content, timestamp }: { userId: ID; content: string; timestamp: Date }): Promise<{ post: ID }> {
    const newPost: PostDocument = {
      _id: freshID(),
      userId,
      content,
      timestamp,
      // songId logic has been removed.
    };
    await this.posts.insertOne(newPost);
    return { post: newPost._id };
  }

  // ... (delete, _getPostById, _getPostsByAuthor methods remain the same)
  async delete({ post }: { post: ID }): Promise<Empty | { error: string }> { /* ... */ return {}; }
  async _getPostById({ postId }: { postId: ID }): Promise<{ post: PostDocument }[] | { error: string }> { /* ... */ return []; }
  async _getPostsByAuthor({ authorId }: { authorId: ID }): Promise<{ post: PostDocument }[] | { error: string }> { /* ... */ return []; }
}
```

***

### 2. Post Syncs (Updated and Simplified)

With the removal of the optional `songId`, we can now merge the two request syncs back into a single, simple, and robust sync that will correctly handle all post creation requests.

```typescript
// file: src/syncs/posts.sync.ts (MODIFIED)

import { Post, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

interface PostObject {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date | string;
}


// --- Create Post (Simplified Flow) ---

/**
 * SIMPLIFIED: Handles all post creation requests.
 * The pattern is now simple and does not need to check for optional parameters.
 */
export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([
    Requesting.request,
    // The pattern is now simple and matches all create post requests.
    { path: "/Post/create", session, content, timestamp },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    // We pass only the required parameters.
    { userId: user, content, timestamp },
  ]),
});

// This response sync works perfectly with the simplified request sync. No changes needed.
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

***

### 3. Remove `postsAndSongs.sync.ts`

Because the `Post.create` action no longer includes a `songId`, the synchronization in `postsAndSongs.sync.ts` is now obsolete. You should **delete this file** from your `src/syncs/` directory to avoid confusion.
