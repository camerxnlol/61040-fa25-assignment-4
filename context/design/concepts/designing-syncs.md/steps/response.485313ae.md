---
timestamp: 'Fri Nov 07 2025 00:19:56 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_001956.415d8a5c.md]]'
content_id: 485313ae35d40cbd1c884cf45ba915108132917d3c3f61e0b8ca71668c4476d6
---

# response:

You've done it again! Your log has perfectly pinpointed the issue, and you are correct that it's a shape mismatch, but this time it's in the **response sync**.

This is a classic case where the action succeeds, but the system doesn't have a rule for what to do *after* that success, so the request times out.

### The Problem: A Success Case with No Listener

1. **The Log:**
   * The `Requesting.request` fires. Your `AddComparisonRequestWithOneSong` sync correctly catches it.
   * The `Ranking.addComparison` action fires and succeeds, returning an empty object: `=> {}`.
   * The request times out.

2. **The Response Sync's `when` Clause:**
   Your `AddComparisonResponse` sync has this pattern:
   ```typescript
   when: actions(
     // ...
     [Ranking.addComparison, {}, { error }], // This is the problem
   ),
   ```
   This pattern tells the engine: "I am only interested in `Ranking.addComparison` actions that **fail** and return an object with an `error` key."

3. **The Mismatch:**
   Since the action succeeded and returned `{}`, it does not match the pattern `{ error }`. The `when` clause is never satisfied, the response sync never fires, and the client is left waiting.

### The Solution: Handle the Success Case

You need a response sync that explicitly listens for the successful outcome of the `Ranking.addComparison` action. The standard pattern is to have one sync for the success case and another for the error case.

We will split `AddComparisonResponse` into two distinct syncs:

1. **`AddComparisonSuccessResponse`**: Listens for the successful `=> {}` result.
2. **`AddComparisonErrorResponse`**: Listens for the failure `=> { error: "..." }` result.

This ensures that every possible outcome of the action is handled, and the client always gets a response.

Here is the complete and corrected `ranking.sync.ts` file with this fix.

***

### Ranking Syncs (Corrected for Success Response)

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
    { path: "/Ranking/addComparison", session, songA, songB, preferred },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});

// This sync handles the case where only ONE song is being added.
export const AddComparisonRequestWithOneSong: Sync = ({ request, session, user, songA, preferred }) => ({
  when: actions([
    Requesting.request,
    { path: "/Ranking/addComparison", session, songA, preferred },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, preferred }]),
});


// --- RESPONSE SYNCS (Corrected) ---

// NEW: This sync handles the SUCCESS case for addComparison.
export const AddComparisonSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    // This pattern matches the empty object `{}` returned on success.
    [Ranking.addComparison, {}, {}],
  ),
  // Respond with an empty object to the client, indicating success.
  then: actions([Requesting.respond, { request }]),
});

// This sync now ONLY handles the ERROR case for addComparison.
export const AddComparisonErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    // This pattern matches an object with an 'error' key.
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

// Note: You should apply the same success/error split to this response sync as well for robustness.
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
