// file: src/syncs/reactions.sync.ts

import { Reaction, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// ... (Action syncs for Add and Remove remain the same)
export const AddReactionRequest: Sync = ({ request, session, user, post, reactionType }) => ({
  when: actions([Requesting.request, { path: "/Reaction/add", session, post, reactionType }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Reaction.add, { post, reactionType, reactingUser: user }]),
});
export const AddReactionResponse: Sync = ({ request, reactionId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/add" }, { request }],
    [Reaction.add, {}, { reactionId, error }],
  ),
  then: actions([Requesting.respond, { request, reactionId, error }]),
});
export const RemoveReactionRequest: Sync = ({ request, session, user, post, reactionType }) => ({
  when: actions([Requesting.request, { path: "/Reaction/remove", session, post, reactionType }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Reaction.remove, { post, reactionType, reactingUser: user }]),
});
export const RemoveReactionResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/remove" }, { request }],
    [Reaction.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- QUERIES (Read - Refactored for Flat Response) ---

export const GetReactionsForPost: Sync = ({ request, post, reactions }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsForPost", post }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const postValue = originalFrame[post] as ID;
    const queryResult = await Reaction._getReactionsForPost({ post: postValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();

    // Unwrap each reaction object from its `{ "reactions": ... }` wrapper
    const reactionList = queryResult.map(r => r.reactions);
    return new Frames({ ...originalFrame, [reactions]: reactionList });
  },
  then: actions([Requesting.respond, { request, reactions }]),
});

export const GetReactionsByPostAndUser: Sync = ({ request, post, reactingUser, reactions }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsByPostAndUser", post, reactingUser }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const postValue = originalFrame[post] as ID;
    const userValue = originalFrame[reactingUser] as ID;
    const queryResult = await Reaction._getReactionsByPostAndUser({ post: postValue, reactingUser: userValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();
    
    const reactionList = queryResult.map(r => r.reactions);
    return new Frames({ ...originalFrame, [reactions]: reactionList });
  },
  then: actions([Requesting.respond, { request, reactions }]),
});