// file: src/syncs/friends.sync.ts

import { Friends, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---

export const SendFriendRequest: Sync = ({ request, session, recipient, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/sendFriendRequest", session, recipient }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.sendFriendRequest, { sender: user, recipient }]),
});

export const SendFriendRequestResponse: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/sendFriendRequest" }, { request }],
    [Friends.sendFriendRequest, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});

// ... (Other action syncs like Accept, Reject, Remove remain the same)
export const AcceptFriendRequest: Sync = ({ request, session, sender, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/acceptFriendRequest", session, sender }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.acceptFriendRequest, { recipient: user, sender }]),
});
export const AcceptFriendRequestResponse: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/acceptFriendRequest" }, { request }],
    [Friends.acceptFriendRequest, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});
export const RejectFriendRequest: Sync = ({ request, session, sender, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/rejectFriendRequest", session, sender }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.rejectFriendRequest, { recipient: user, sender }]),
});
export const RejectFriendRequestResponse: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/rejectFriendRequest" }, { request }],
    [Friends.rejectFriendRequest, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});
export const RemoveFriendRequest: Sync = ({ request, session, user, user1, user2 }) => ({
  when: actions([Requesting.request, { path: "/Friends/removeFriend", session, user1, user2 }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] === $[user1] || $[user] === $[user2]);
  },
  then: actions([Friends.removeFriend, { user1, user2 }]),
});
export const RemoveFriendResponse: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/removeFriend" }, { request }],
    [Friends.removeFriend, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});


// --- QUERIES (Read - Refactored for Flat Response) ---

export const GetFriends: Sync = ({ request, session, user, friends }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getFriends", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await Friends._getFriends({ user: userValue });
    if (Array.isArray(result) && result.length > 0 && "friends" in result[0]) {
      frame[friends] = result[0].friends; // Unwrapping the array
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, friends }]),
});

export const GetSentRequests: Sync = ({ request, session, user, recipients }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getSentRequests", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await Friends._getSentRequests({ user: userValue });
    if (Array.isArray(result) && result.length > 0 && "recipients" in result[0]) {
      frame[recipients] = result[0].recipients; // Unwrapping the array
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, recipients }]),
});

export const GetReceivedRequests: Sync = ({ request, session, user, senders }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getReceivedRequests", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await Friends._getReceivedRequests({ user: userValue });
    if (Array.isArray(result) && result.length > 0 && "senders" in result[0]) {
      frame[senders] = result[0].senders; // Unwrapping the array
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, senders }]),
});

export const VerifyFriendship: Sync = ({ request, user1, user2, isFriend }) => ({
  when: actions([Requesting.request, { path: "/Friends/_verifyFriendship", user1, user2 }, { request }]),
  where: async (frames) => {
    const frame = frames[0];
    const user1Value = frame[user1] as ID;
    const user2Value = frame[user2] as ID;
    const result = await Friends._verifyFriendship({ user1: user1Value, user2: user2Value });
    if (Array.isArray(result) && result.length > 0 && "isFriend" in result[0]) {
      frame[isFriend] = result[0].isFriend; // Unwrapping the boolean
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, isFriend }]),
});