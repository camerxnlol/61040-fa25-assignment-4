---
timestamp: 'Thu Nov 06 2025 09:50:28 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_095028.2ada514a.md]]'
content_id: bce2b4feb5796f190b07ed1fed597c3dda770e3f944ab661b91abe3a82b3cc4a
---

# response:

You've run into a classic and subtle TypeScript issue within the synchronization engine. The error messages correctly point out that the return types of certain query methods don't match what the `frames.query` helper function expects.

### The Root Cause: Incompatible Query Return Signatures

The `frames.query` helper is designed to work with concept queries that return a `Promise<Entity[]>`, meaning a simple array of the core data objects. However, some of your API specifications define query responses with a different structure:

1. **`Ranking._getRankings`:** The spec indicates this query returns a single object that *contains* an array: `{ "rankedSongs": [...] }`. This is **not an array**, so `frames.query` cannot be used.
2. **`Reaction._getReactions...`:** The spec indicates these queries return an array where each element is an object that *wraps* the actual entity: `[{ "reactions": {...} }, { "reactions": {...} }]`. While this is an array, the `frames.query` helper's type system is not designed to automatically "unwrap" this nested structure, leading to the type error.

### The Solution: Manual Query Handling in `where`

When `frames.query` cannot be used due to a type mismatch, the correct approach is to handle the query call manually within the `where` clause. This involves:

1. Calling the concept query method directly with `await`.
2. Processing the unique structure of the returned data.
3. Manually creating new frames or augmenting existing ones with the results.

Here are the corrected files with these fixes applied.

### Ranking Syncs (Corrected)

The `GetRankings` sync is updated to manually call `_getRankings` and attach the resulting object to the frame.

```typescript
// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---

export const AddComparisonRequest: Sync = ({ request, session, user, songA, songB, preferred }) => ({
  when: actions([Requesting.request, { path: "/Ranking/addComparison", session, songA, songB, preferred }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});

export const AddComparisonResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    [Ranking.addComparison, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const RemoveRankedSongRequest: Sync = ({ request, session, user, song }) => ({
  when: actions([Requesting.request, { path: "/Ranking/remove", session, song }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.remove, { user, song }]),
});

export const RemoveRankedSongResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/remove" }, { request }],
    [Ranking.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- QUERIES (Read) ---

export const GetRankings: Sync = ({ request, session, user, rankings }) => ({
  when: actions([Requesting.request, { path: "/Ranking/_getRankings", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // No user, no results.

    // Manually call the query, as its return type is an object, not an array.
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await Ranking._getRankings({ user: userValue });

    // Augment the frame with the entire result object.
    frame[rankings] = result;

    return frames;
  },
  then: actions([Requesting.respond, { request, rankings }]),
});
```

### Reaction Syncs (Corrected)

The query syncs are updated to manually call the query methods, iterate over the "wrapped" results, and create new frames with the "unwrapped" reaction objects.

```typescript
// file: src/syncs/reactions.sync.ts

import { Reaction, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---

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

// --- QUERIES (Read) ---

export const GetReactionsForPost: Sync = ({ request, post, reaction, results }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsForPost", post }, { request }]),
  where: async (frames) => {
    if (frames.length === 0) return frames;
    const originalFrame = frames[0];
    const postValue = originalFrame[post] as ID;

    // Manually call the query to handle its wrapped return type.
    const queryResult = await Reaction._getReactionsForPost({ post: postValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();

    // Create a new frame for each reaction, unwrapping it from the result.
    const unwrappedFrames = new Frames(...queryResult.map(r => ({
      ...originalFrame,
      [reaction]: r.reactions, // Unwrapping here
    })));

    // Collect the individual reaction frames into a single result for the response.
    return unwrappedFrames.collectAs([reaction], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

export const GetReactionsByPostAndUser: Sync = ({ request, post, reactingUser, reaction, results }) => ({
  when: actions([Requesting.request, { path: "/Reaction/_getReactionsByPostAndUser", post, reactingUser }, { request }]),
  where: async (frames) => {
    if (frames.length === 0) return frames;
    const originalFrame = frames[0];
    const postValue = originalFrame[post] as ID;
    const userValue = originalFrame[reactingUser] as ID;

    // Manually call the query.
    const queryResult = await Reaction._getReactionsByPostAndUser({ post: postValue, reactingUser: userValue });
    if ("error" in queryResult || !Array.isArray(queryResult)) return new Frames();

    // Create a new frame for each unwrapped reaction.
    const unwrappedFrames = new Frames(...queryResult.map(r => ({
      ...originalFrame,
      [reaction]: r.reactions, // Unwrapping here
    })));

    return unwrappedFrames.collectAs([reaction], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
```
