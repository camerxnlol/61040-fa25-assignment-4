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

// ... (Action syncs for Create and Delete remain the same)
export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([Requesting.request, { path: "/Post/create", session, content, timestamp }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Post.create, { userId: user, content, timestamp }]),
});
export const CreatePostResponse: Sync = ({ request, post, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    [Post.create, {}, { post, error }],
  ),
  then: actions([Requesting.respond, { request, post, error }]),
});
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


// --- QUERIES (Read - Refactored for Flat Response) ---

export const GetPostsByAuthor: Sync = ({ request, authorId, posts }) => ({
  when: actions([Requesting.request, { path: "/Post/_getPostsByAuthor", authorId }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorIdValue = originalFrame[authorId] as ID;
    const queryResult = await Post._getPostsByAuthor({ authorId: authorIdValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();

    // Unwrap each post object from its wrapper
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
      frame[post] = queryResult[0].post; // Unwrapping the single post object
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, post }]),
});