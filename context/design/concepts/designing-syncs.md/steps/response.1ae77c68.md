---
timestamp: 'Fri Nov 07 2025 00:14:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_001439.ae9eea2c.md]]'
content_id: 1ae77c68913fa042849557c159842b42acdffb64548ce02575c9c4bcf41d449d
---

# response:

Yes, this is another excellent example of the same root cause: **a shape mismatch between the incoming request and the pattern the synchronization is expecting.**

Your log is the key.

### The Problem: An Optional Parameter

1. **The Log:** Your `Requesting.request` log shows the following payload:
   ```json
   {
     "user": "...",
     "songA": "...",
     "preferred": "...",
     "session": "...",
     "path": "/Ranking/addComparison"
   }
   ```
   Notice that the key `songB` is missing. This is valid, because the API specification states that `songB` is optional.

2. **The Sync's `when` Clause:** Your `AddComparisonRequest` sync has this pattern:
   ```typescript
   when: actions([
     Requesting.request,
     // This pattern REQUIRES songB to be present
     { path: "/Ranking/addComparison", session, songA, songB, preferred },
     { request }
   ]),
   ```
   The synchronization engine performs a strict match. Since the incoming request action does not have a `songB` property, it does not match this pattern.

3. **The Result:** The `AddComparisonRequest` sync never fires. The `where` clause is never run, and the `Ranking.addComparison` action is never called. The original request is left hanging until it times out.

### The Solution: Handle Both Cases

The standard and most robust way to handle an action with optional parameters is to create separate syncs for each distinct "shape" of the request.

We will split `AddComparisonRequest` into two new syncs:

1. **`AddComparisonRequestWithTwoSongs`**: Handles the case where `songB` is present.
2. **`AddComparisonRequestWithOneSong`**: Handles the case where `songB` is absent.

The existing `AddComparisonResponse` sync does not need to be changed, as it only looks at the *output* of the action, which is the same regardless of how many songs were in the input.

Here is the corrected `ranking.sync.ts` file.

***

### Ranking Syncs (Corrected for Optional `songB`)

```typescript
// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---

// This sync handles the case where TWO songs are being compared.
export const AddComparisonRequestWithTwoSongs: Sync = ({ request, session, user, songA, songB, preferred }) => ({
  when: actions([
    Requesting.request,
    // This pattern explicitly requires songB.
    { path: "/Ranking/addComparison", session, songA, songB, preferred },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});

// This new sync handles the case where only ONE song is being added.
export const AddComparisonRequestWithOneSong: Sync = ({ request, session, user, songA, preferred }) => ({
  when: actions([
    Requesting.request,
    // This pattern explicitly OMITS songB.
    { path: "/Ranking/addComparison", session, songA, preferred },
    { request },
  ]),
  // The where clause is identical.
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  // The then clause passes only the available parameters.
  then: actions([Ranking.addComparison, { user, songA, preferred }]),
});


// This response sync works for BOTH of the request syncs above.
export const AddComparisonResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    // It triggers on any 'addComparison' action, regardless of its inputs.
    [Ranking.addComparison, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Remove Action (Unchanged) ---
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


// --- QUERIES (Read - Public Access) ---
export const GetRankingsByAuthor: Sync = ({ request, authorId, rankedSongs }) => ({
  when: actions([Requesting.request, { path: "/Ranking/_getRankingsByAuthor", authorId }, { request }]),
  where: async (frames) => {
    const frame = frames[0];
    const authorIdValue = frame[authorId] as ID;
    const result = await Ranking._getRankingsByAuthor({ authorId: authorIdValue });
    
    if ("rankedSongs" in result) {
      frame[rankedSongs] = result.rankedSongs;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, rankedSongs }]),
});
```
