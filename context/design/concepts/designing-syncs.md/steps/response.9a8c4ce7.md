---
timestamp: 'Thu Nov 06 2025 18:13:10 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_181310.e1965554.md]]'
content_id: 9a8c4ce7a7c69abafedced46274e445eb505bcbfb6a4364dfd261a1342f72714
---

# response:

Of course. This is a great change that makes the `Ranking` concept more flexible and aligns it with the public-facing query pattern used by the `Post` concept.

Here are the updated files to change `_getRankings` to a public `_getRankingsByAuthor` query. This involves modifying both the concept's implementation to change the method signature and the synchronization file to call the new public endpoint.

### 1. Ranking Concept Implementation (Updated)

In this file, we rename the `_getRankings` method to `_getRankingsByAuthor` and change its parameter from `user` to `authorId` to reflect its new public nature. The core logic remains the same.

```typescript
// file: src/concepts/Ranking/RankingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Ranking.";

// --- Concept State ---

type Song = ID;

/** Represents a song with its score in a user's ranking. */
interface RankedSong {
  songId: Song;
  score: number;
}

/** Represents a user's entire collection of ranked songs. */
interface UserRanking {
  _id: ID; // User ID
  rankedSongs: RankedSong[];
}

/**
 * Purpose: To allow users to order songs relative to one another and
 * generate a dynamic ladder of preferences over time.
 */
export default class RankingConcept {
  private readonly userRankings: Collection<UserRanking>;

  constructor(db: Db) {
    this.userRankings = db.collection<UserRanking>(PREFIX + "userRankings");
  }

  // --- Actions ---

  /**
   * addComparison (user: ID, songA: ID, songB?: ID, preferred: ID): Empty | { error: string }
   */
  async addComparison({ user, songA, songB, preferred }: { user: ID; songA: Song; songB?: Song; preferred: Song }): Promise<Empty | { error: string }> {
    // For simplicity, this implementation just adds songs with a default score.
    // A full implementation would use an algorithm like Elo or Glicko-2.
    let userRanking = await this.userRankings.findOne({ _id: user });
    if (!userRanking) {
      userRanking = { _id: user, rankedSongs: [] };
    }

    const addSong = (songId: Song) => {
      if (!userRanking!.rankedSongs.some(s => s.songId === songId)) {
        userRanking!.rankedSongs.push({ songId, score: 1500 });
      }
    };

    addSong(songA);
    if (songB) {
      addSong(songB);
      // NOTE: Score update logic is omitted for brevity.
    }
    
    await this.userRankings.updateOne({ _id: user }, { $set: userRanking }, { upsert: true });
    return {};
  }

  /**
   * remove (user: ID, song: ID): Empty | { error: string }
   */
  async remove({ user, song }: { user: ID; song: Song }): Promise<Empty | { error: string }> {
    const result = await this.userRankings.updateOne(
      { _id: user },
      { $pull: { rankedSongs: { songId: song } } }
    );

    if (result.matchedCount === 0) {
      return { error: `User '${user}' not found.` };
    }
    if (result.modifiedCount === 0) {
        return { error: `Song '${song}' not found in rankings for user '${user}'.` };
    }

    return {};
  }

  // --- Queries ---

  /**
   * _getRankingsByAuthor (authorId: ID): { rankedSongs: RankedSong[] } | { error: string }
   *
   * **requires** authorId exists in the concept state (has a ranking)
   * **effects** returns the current `RankedSong` entries for the `authorId`, ordered by `score` (descending).
   */
  async _getRankingsByAuthor({ authorId }: { authorId: ID }): Promise<{ rankedSongs: RankedSong[] } | { error: string }> {
    const userRanking = await this.userRankings.findOne({ _id: authorId });

    if (!userRanking) {
      // It's common for a query on a non-existent item to return an empty result rather than an error.
      return { rankedSongs: [] };
    }

    // Sort by score descending before returning
    const sortedSongs = userRanking.rankedSongs.sort((a, b) => b.score - a.score);

    return { rankedSongs: sortedSongs };
  }
}
```

### 2. Ranking Syncs (Updated)

Here, we rename the `GetRankings` sync to `GetRankingsByAuthor`. It no longer requires a `session` and instead takes an `authorId` from the request body. The `where` clause is simplified to call the new public query directly without any authentication check.

```typescript
// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---
// These actions remain authenticated and are unchanged.

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


// --- QUERIES (Read - Refactored for Public Access) ---

export const GetRankingsByAuthor: Sync = ({ request, authorId, rankedSongs }) => ({
  // The path now reflects the new query name and takes `authorId` as a parameter.
  when: actions([Requesting.request, { path: "/Ranking/_getRankingsByAuthor", authorId }, { request }]),
  where: async (frames) => {
    // This is now a public query, so no session check is needed.
    const frame = frames[0];
    const authorIdValue = frame[authorId] as ID;
    const result = await Ranking._getRankingsByAuthor({ authorId: authorIdValue });
    
    // Unwrapping the 'rankedSongs' array from the result object for a flat response.
    if ("rankedSongs" in result) {
      frame[rankedSongs] = result.rankedSongs;
    }
    return frames;
  },
  // The response sends the `rankedSongs` array directly.
  then: actions([Requesting.respond, { request, rankedSongs }]),
});
```
