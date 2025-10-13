---
timestamp: 'Sat Oct 11 2025 10:29:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_102953.17187c88.md]]'
content_id: b8cf2f8cdf1578c50573fa3d51333f8a83ac82e900e6eb36bbb1fef14665a139
---

# file: src/SongRecommender/SongRecommenderConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "SongRecommender" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Song = ID;

// Dummy type for LLM, as it's not provided by the context and is an external dependency.
// In a real scenario, this would be an interface for an actual LLM client.
type GeminiLLM = string;

/**
 * State: A set of Users with their past and not-yet-recommended songs.
 * Each document corresponds to a single user's song recommendation data.
 */
interface UserSongCatalogDoc {
  /** The unique identifier for the user, serving as the document's primary key. */
  _id: User;
  /** An array of song IDs that have already been recommended to the user. */
  pastRecommendations: Song[];
  /** An array of song IDs that are available but not yet recommended to the user. */
  notYetRecommendedSongs: Song[];
}

/**
 * @concept SongRecommender
 * @purpose To introduce a new song for the user each day.
 */
export default class SongRecommenderConcept {
  userSongCatalogs: Collection<UserSongCatalogDoc>;

  constructor(private readonly db: Db) {
    this.userSongCatalogs = this.db.collection(PREFIX + "userSongCatalogs");
  }

  /**
   * Action: Adds a song to a user's catalog of not-yet-recommended songs.
   * @requires song is not in pastRecommendations or notYetRecommendedSongs for user.
   * @effects adds song to notYetRecommendedSongs for user.
   */
  async addSongToCatalog(
    { user: userId, song: songId }: { user: User; song: Song },
  ): Promise<Empty | { error: string }> {
    const userCatalog = await this.userSongCatalogs.findOne(
      { _id: userId },
      { projection: { pastRecommendations: 1, notYetRecommendedSongs: 1 } },
    );

    if (userCatalog) {
      if (userCatalog.pastRecommendations?.includes(songId)) {
        return { error: `Song '${songId}' has already been recommended to user '${userId}'.` };
      }
      if (userCatalog.notYetRecommendedSongs?.includes(songId)) {
        return { error: `Song '${songId}' is already pending recommendation for user '${userId}'.` };
      }
    }

    const result = await this.userSongCatalogs.updateOne(
      { _id: userId },
      {
        $addToSet: { notYetRecommendedSongs: songId },
        $setOnInsert: { pastRecommendations: [] }, // Initialize for new users
      },
      { upsert: true },
    );

    if (result.matchedCount === 0 && !result.upsertedId) {
      return { error: `Failed to add song '${songId}' for user '${userId}'.` };
    }
    return {};
  }

  /**
   * Action: Generates a specified number of song recommendations for a user.
   * @requires count is less than or equal to the number of songs in notYetRecommendedSongs for user.
   * @effects returns count song recommendations, moves song(s) from notYetRecommendedSongs to pastRecommendations for user.
   */
  async generateRecommendation(
    { user: userId, count }: { user: User; count: number },
  ): Promise<{ songs: Song[] } | { error: string }> {
    if (count <= 0) {
      return { error: "Count must be a positive number." };
    }

    const userCatalog = await this.userSongCatalogs.findOne(
      { _id: userId },
      { projection: { notYetRecommendedSongs: 1, pastRecommendations: 1 } },
    );

    if (!userCatalog || !userCatalog.notYetRecommendedSongs || userCatalog.notYetRecommendedSongs.length === 0) {
      return { error: `No songs available for recommendation for user '${userId}'.` };
    }

    if (userCatalog.notYetRecommendedSongs.length < count) {
      return { error: `Not enough songs available for recommendation. Requested ${count}, but only ${userCatalog.notYetRecommendedSongs.length} available.` };
    }

    // Select `count` songs from `notYetRecommendedSongs`.
    // For simplicity, we take them from the beginning of the array.
    const recommendedSongs = userCatalog.notYetRecommendedSongs.slice(0, count);

    // Update the user's catalog:
    // 1. Remove recommended songs from `notYetRecommendedSongs`.
    // 2. Add recommended songs to `pastRecommendations`.
    const result = await this.userSongCatalogs.updateOne(
      { _id: userId },
      {
        $pullAll: { notYetRecommendedSongs: recommendedSongs },
        $addToSet: { pastRecommendations: { $each: recommendedSongs } },
      },
    );

    if (result.modifiedCount === 0) {
      // This case might happen if, for example, the document was modified externally
      // between findOne and updateOne, though less likely with optimistic concurrency
      // it's good to guard.
      return { error: `Failed to update catalog for user '${userId}' during recommendation.` };
    }

    return { songs: recommendedSongs };
  }

  /**
   * Action: Removes a song from a user's not-yet-recommended songs.
   * @requires song to be in notYetRecommendedSongs for user.
   * @effects removes song from notYetRecommendedSongs for user.
   */
  async removeSong(
    { user: userId, song: songId }: { user: User; song: Song },
  ): Promise<Empty | { error: string }> {
    const userCatalog = await this.userSongCatalogs.findOne(
      { _id: userId },
      { projection: { notYetRecommendedSongs: 1 } },
    );

    if (!userCatalog || !userCatalog.notYetRecommendedSongs?.includes(songId)) {
      return { error: `Song '${songId}' is not in notYetRecommendedSongs for user '${userId}'.` };
    }

    const result = await this.userSongCatalogs.updateOne(
      { _id: userId },
      {
        $pull: { notYetRecommendedSongs: songId },
      },
    );

    if (result.modifiedCount === 0) {
      return { error: `Failed to remove song '${songId}' for user '${userId}'.` };
    }
    return {};
  }

  /**
   * Async Action: Uses an LLM to generate new songs and adds them to notYetRecommendedSongs.
   * Note: The actual LLM integration is beyond the scope of this implementation.
   * This stub generates dummy song IDs.
   * @effects Uses an LLM to generate count new songs and adds them to notYetRecommendedSongs.
   * If basisSongs is provided, the new songs are based on the provided songs.
   * If basisSongs is not provided, the new songs are based on current "trending" music that is different from the user's taste.
   */
  async generateRecommendationFromLLM(
    { user: userId, llm: _llm, count, basisSongs: _basisSongs }: {
      user: User;
      llm: GeminiLLM; // Mocked type, actual LLM client would be passed here
      count: number;
      basisSongs?: Song[]; // Ignored for this stub implementation
    },
  ): Promise<Empty | { error: string }> {
    if (count <= 0) {
      return { error: "Count must be a positive number." };
    }

    // Simulate LLM generating new song IDs
    const newSongIds: Song[] = [];
    for (let i = 0; i < count; i++) {
      newSongIds.push(freshID() as Song);
    }

    const result = await this.userSongCatalogs.updateOne(
      { _id: userId },
      {
        $addToSet: { notYetRecommendedSongs: { $each: newSongIds } },
        $setOnInsert: { pastRecommendations: [] }, // Initialize for new users
      },
      { upsert: true },
    );

    if (result.matchedCount === 0 && !result.upsertedId) {
      return { error: `Failed to generate and add songs for user '${userId}'.` };
    }
    return {};
  }

  /**
   * Query: Retrieves a user's entire song catalog (past and not-yet-recommended songs).
   */
  async _getUserCatalog(userId: User): Promise<UserSongCatalogDoc | null> {
    return await this.userSongCatalogs.findOne({ _id: userId });
  }
}
```
