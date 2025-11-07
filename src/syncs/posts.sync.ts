// file: src/syncs/posts.sync.ts (FIXED)

import { Post, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

interface PostObject {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date | string;
}

// --- Create Post ---

/**
* Handles requests to create a post. It verifies the user's session
* and then triggers the Post.create action.
*/
export const CreatePostRequest: Sync = ({ request, session, user, content, timestamp }) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/create", session, content, timestamp },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    Post.create,
    { userId: user, content, timestamp },
  ]),
});

/**
* Responds to a successful post creation. This sync matches when Post.create
* returns a `post` ID, and sends it back to the original requester.
*/
export const CreatePostSuccessResponse: Sync = ({ request, post }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    // CORRECTED: The pattern now correctly matches only the 'post' field from a successful action.
    [Post.create, {}, { post }],
  ),
  then: actions([Requesting.respond, { request, post }]),
});

/**
* Responds to a failed post creation. This sync matches when Post.create
* returns an `error`, and sends it back to the original requester.
* NOTE: The current PostConcept#create method does not return errors, but this provides robustness.
*/
export const CreatePostErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/create" }, { request }],
    // This pattern matches an error response from the action.
    [Post.create, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Post ---

/**
* Handles requests to delete a post. It verifies that the user making the
* request is the author of the post before triggering Post.delete.
*/
export const DeletePostRequest: Sync = ({ request, session, post, user, postData }) => ({
  when: actions([Requesting.request, { path: "/Post/delete", session, post }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(Post._getPostById, { postId: post }, { post: postData });
    // Authorization: only the post's author can delete it.
    return frames.filter(($) => ($[postData] as PostObject)?.userId === $[user]);
  },
  then: actions([Post.delete, { post }]),
});

/**
* Responds to a successful post deletion. Post.delete returns an empty object on success.
* This was missing, causing timeouts on successful deletions.
*/
export const DeletePostSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/delete" }, { request }],
    // Match the empty object indicating success from Post.delete
    [Post.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
* Responds to a failed post deletion. This sync matches when Post.delete
* returns an `error`, and sends it back to the original requester.
*/
export const DeletePostErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/delete" }, { request }],
    // This pattern correctly matches the error response.
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

    const postList = queryResult.map((item) => item.post);
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