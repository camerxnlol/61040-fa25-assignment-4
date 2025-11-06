---
timestamp: 'Wed Nov 05 2025 16:03:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_160355.428f90cf.md]]'
content_id: 2574b08eb0ee094dadf562a5cd379f4df91e62bf7cc08dd2a448b522f64546cf
---

# response:

Of course. Here are the synchronization files for the excluded routes, organized by concept. These synchronizations re-implement the logic of the passthrough routes but add an authorization layer using a `Sessioning` concept, as requested.

### Friends Syncs

This file handles friend requests, friendships, and friend list queries, ensuring that all actions are performed by a logged-in user.

```typescript
// file: src/syncs/friends.sync.ts

import { Friends, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Send Friend Request ---

export const SendFriendRequest: Sync = ({ request, session, recipient, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/sendFriendRequest", session, recipient }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.sendFriendRequest, { sender: user, recipient }]),
});

export const SendFriendRequestResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/sendFriendRequest" }, { request }],
    [Friends.sendFriendRequest, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const SendFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/sendFriendRequest" }, { request }],
    [Friends.sendFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Accept Friend Request ---

export const AcceptFriendRequest: Sync = ({ request, session, sender, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/acceptFriendRequest", session, sender }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.acceptFriendRequest, { recipient: user, sender }]),
});

export const AcceptFriendRequestResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/acceptFriendRequest" }, { request }],
    [Friends.acceptFriendRequest, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const AcceptFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/acceptFriendRequest" }, { request }],
    [Friends.acceptFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Reject Friend Request ---

export const RejectFriendRequest: Sync = ({ request, session, sender, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/rejectFriendRequest", session, sender }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends.rejectFriendRequest, { recipient: user, sender }]),
});

export const RejectFriendRequestResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/rejectFriendRequest" }, { request }],
    [Friends.rejectFriendRequest, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RejectFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/rejectFriendRequest" }, { request }],
    [Friends.rejectFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Friend ---

export const RemoveFriendRequest: Sync = ({ request, session, user, user1, user2 }) => ({
  when: actions([Requesting.request, { path: "/Friends/removeFriend", session, user1, user2 }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] === $[user1] || $[user] === $[user2]);
  },
  then: actions([Friends.removeFriend, { user1, user2 }]),
});

export const RemoveFriendResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/removeFriend" }, { request }],
    [Friends.removeFriend, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RemoveFriendResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/removeFriend" }, { request }],
    [Friends.removeFriend, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Friends ---

export const GetFriendsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getFriends", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends._getFriends, { user }]),
});

export const GetFriendsResponse: Sync = ({ request, friends }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/_getFriends" }, { request }],
    [Friends._getFriends, {}, { friends }],
  ),
  then: actions([Requesting.respond, { request, friends }]),
});

// --- Get Sent Requests ---

export const GetSentRequestsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getSentRequests", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends._getSentRequests, { user }]),
});

export const GetSentRequestsResponse: Sync = ({ request, recipients }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/_getSentRequests" }, { request }],
    [Friends._getSentRequests, {}, { recipients }],
  ),
  then: actions([Requesting.respond, { request, recipients }]),
});

// --- Get Received Requests ---

export const GetReceivedRequestsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/Friends/_getReceivedRequests", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Friends._getReceivedRequests, { user }]),
});

export const GetReceivedRequestsResponse: Sync = ({ request, senders }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/_getReceivedRequests" }, { request }],
    [Friends._getReceivedRequests, {}, { senders }],
  ),
  then: actions([Requesting.respond, { request, senders }]),
});

// --- Verify Friendship (Public) ---

export const VerifyFriendshipRequest: Sync = ({ request, user1, user2 }) => ({
  when: actions([Requesting.request, { path: "/Friends/_verifyFriendship", user1, user2 }, { request }]),
  then: actions([Friends._verifyFriendship, { user1, user2 }]),
});

export const VerifyFriendshipResponse: Sync = ({ request, isFriend }) => ({
  when: actions(
    [Requesting.request, { path: "/Friends/_verifyFriendship" }, { request }],
    [Friends._verifyFriendship, {}, { isFriend }],
  ),
  then: actions([Requesting.respond, { request, isFriend }]),
});
```

### Post Syncs

This file manages post creation and deletion, requiring authentication for both actions. It also provides public endpoints for retrieving posts.

```typescript
// file: src/syncs/posts.sync.ts

import { Post, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

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
    return frames.filter(($) => $[postData].userId === $[user]);
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

### Ranking Syncs

This file governs a user's song rankings, ensuring all modifications and retrievals are tied to an authenticated session.

```typescript
// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Add Comparison ---

export const AddComparisonRequest: Sync = ({ request, session, user, songA, songB, preferred }) => ({
  when: actions([Requesting.request, { path: "/Ranking/addComparison", session, songA, songB, preferred }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});

export const AddComparisonResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    [Ranking.addComparison, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const AddComparisonResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    [Ranking.addComparison, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Ranked Song ---

export const RemoveRankedSongRequest: Sync = ({ request, session, user, song }) => ({
  when: actions([Requesting.request, { path: "/Ranking/remove", session, song }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.remove, { user, song }]),
});

export const RemoveRankedSongResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/remove" }, { request }],
    [Ranking.remove, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveRankedSongResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/remove" }, { request }],
    [Ranking.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Rankings ---

export const GetRankingsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/Ranking/_getRankings", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking._getRankings, { user }]),
});

export const GetRankingsResponse: Sync = ({ request, rankedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/_getRankings" }, { request }],
    [Ranking._getRankings, {}, { rankedSongs }],
  ),
  then: actions([Requesting.respond, { request, rankedSongs }]),
});

export const GetRankingsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/_getRankings" }, { request }],
    [Ranking._getRankings, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```

### Reaction Syncs

This file handles adding and removing reactions, requiring a logged-in user for both actions. It also provides public endpoints for querying reactions.

```typescript
// file: src/syncs/reactions.sync.ts

import { Reaction, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Add Reaction ---

export const AddReactionRequest: Sync = ({ request, session, user, post, reactionType }) => ({
  when: actions([Requesting.request, { path: "/Reaction/add", session, post, reactionType }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Reaction.add, { post, reactionType, reactingUser: user }]),
});

export const AddReactionResponse: Sync = ({ request, reactionId }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/add" }, { request }],
    [Reaction.add, {}, { reactionId }],
  ),
  then: actions([Requesting.respond, { request, reactionId }]),
});

export const AddReactionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/add" }, { request }],
    [Reaction.add, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Reaction ---

export const RemoveReactionRequest: Sync = ({ request, session, user, post, reactionType }) => ({
  when: actions([Requesting.request, { path: "/Reaction/remove", session, post, reactionType }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Reaction.remove, { post, reactionType, reactingUser: user }]),
});

export const RemoveReactionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/remove" }, { request }],
    [Reaction.remove, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveReactionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/remove" }, { request }],
    [Reaction.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Reactions For Post (Public) ---

export const GetReactionsForPostRequest: Sync = ({ request, post }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsForPost", post }, { request }]),
  then: actions([Reaction._getReactionsForPost, { post }]),
});

export const GetReactionsForPostResponse: Sync = ({ request, reactions }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/_getReactionsForPost" }, { request }],
    [Reaction._getReactionsForPost, {}, { reactions }],
  ),
  then: actions([Requesting.respond, { request, reactions }]),
});

// --- Get Reactions By Post And User (Public) ---

export const GetReactionsByPostAndUserRequest: Sync = ({ request, post, reactingUser }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsByPostAndUser", post, reactingUser }, { request }]),
  then: actions([Reaction._getReactionsByPostAndUser, { post, reactingUser }]),
});

export const GetReactionsByPostAndUserResponse: Sync = ({ request, reactions }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/_getReactionsByPostAndUser" }, { request }],
    [Reaction._getReactionsByPostAndUser, {}, { reactions }],
  ),
  then: actions([Requesting.respond, { request, reactions }]),
});
```

### Song Recommender Syncs

This file handles all interactions with the song recommender, such as managing catalogs and generating recommendations, all of which require user authentication.

```typescript
// file: src/syncs/songRecommender.sync.ts

import { SongRecommender, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Add Song To Catalog ---
export const AddSongToCatalogRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/addSongToCatalog", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.addSongToCatalog, { userId: user, songs }]),
});

export const AddSongToCatalogResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/addSongToCatalog" }, { request }],
    [SongRecommender.addSongToCatalog, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Generate Recommendation ---
export const GenerateRecommendationRequest: Sync = ({ request, session, user, count }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/generateRecommendation", session, count }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.generateRecommendation, { userId: user, count }]),
});

export const GenerateRecommendationResponse: Sync = ({ request, recommendations }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/generateRecommendation" }, { request }],
    [SongRecommender.generateRecommendation, {}, { recommendations }],
  ),
  then: actions([Requesting.respond, { request, recommendations }]),
});

// --- Remove Songs From Catalog ---
export const RemoveSongsFromCatalogRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/removeSongsFromCatalog", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.removeSongsFromCatalog, { userId: user, songs }]),
});

export const RemoveSongsFromCatalogResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromCatalog" }, { request }],
    [SongRecommender.removeSongsFromCatalog, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Remove Songs From Past Recommendations ---
export const RemoveSongsFromPastRecommendationsRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/removeSongsFromPastRecommendations", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.removeSongsFromPastRecommendations, { userId: user, songs }]),
});

export const RemoveSongsFromPastRecommendationsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromPastRecommendations" }, { request }],
    [SongRecommender.removeSongsFromPastRecommendations, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});


// --- Get Past Recommendations ---
export const GetPastRecommendationsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getPastRecommendations", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.getPastRecommendations, { userId: user }]),
});

export const GetPastRecommendationsResponse: Sync = ({ request, pastRecommendations }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getPastRecommendations" }, { request }],
    [SongRecommender.getPastRecommendations, {}, { pastRecommendations }],
  ),
  then: actions([Requesting.respond, { request, pastRecommendations }]),
});

// --- Get Not Yet Recommended ---
export const GetNotYetRecommendedRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getNotYetRecommended", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.getNotYetRecommended, { userId: user }]),
});

export const GetNotYetRecommendedResponse: Sync = ({ request, notYetRecommendedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getNotYetRecommended" }, { request }],
    [SongRecommender.getNotYetRecommended, {}, { notYetRecommendedSongs }],
  ),
  then: actions([Requesting.respond, { request, notYetRecommendedSongs }]),
});

// --- Error Responses for All SongRecommender Actions ---
export const SongRecommenderErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }],
    [SongRecommender.addSongToCatalog, {}, { error }],
    [SongRecommender.generateRecommendation, {}, { error }],
    [SongRecommender.removeSongsFromCatalog, {}, { error }],
    [SongRecommender.removeSongsFromPastRecommendations, {}, { error }],
    [SongRecommender.getPastRecommendations, {}, { error }],
    [SongRecommender.getNotYetRecommended, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```

### User Authentication Syncs

This file handles sensitive, authenticated-only actions like changing a password or deleting a user account.

```typescript
// file: src/syncs/userAuthentication.sync.ts

import { UserAuthentication, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Delete User ---
export const DeleteUserRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/delete", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.delete, { user }]),
});

export const DeleteUserResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/delete" }, { request }],
    [UserAuthentication.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});


// --- Change Password ---
export const ChangePasswordRequest: Sync = ({ request, session, user, oldPassword, newPassword }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changePassword", session, oldPassword, newPassword }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changePassword, { user, oldPassword, newPassword }]),
});

export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Change Username ---
export const ChangeUsernameRequest: Sync = ({ request, session, user, newUsername, password }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changeUsername", session, newUsername, password }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changeUsername, { user, newUsername, password }]),
});

export const ChangeUsernameResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changeUsername" }, { request }],
    [UserAuthentication.changeUsername, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Generic Error Response for UserAuthentication ---
export const UserAuthenticationErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }],
    [UserAuthentication.delete, {}, { error }],
    [UserAuthentication.changePassword, {}, { error }],
    [UserAuthentication.changeUsername, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
