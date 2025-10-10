---
timestamp: 'Fri Oct 10 2025 16:49:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251010_164933.b0c139d9.md]]'
content_id: 5c8053d54172a84cf4782f78378cd9e4359721bf5fb1405dbb847292193d7063
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

/**
 * Type alias for a User identifier, assuming it's a unique ID.
 */
type User = ID;

/**
 * Type alias for a Song identifier, assuming it's a unique ID.
 */
type Song = ID;

/**
 * Represents the structure of a document in the user song catalog collection.
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
 * The name of the MongoDB collection where user song catalogs are stored.
 */
const USER_SONG_CATALOG_COLLECTION = "userSongCatalogs";

/**
 * Returns the MongoDB Collection instance for managing user song catalogs.
 * @param db The MongoDB database instance.
 * @returns A Collection<UserSongCatalogDoc> instance.
 */
function getUserSongCatalogCollection(db: Db): Collection<UserSongCatalogDoc> {
  return db.collection<UserSongCatalogDoc>(USER_SONG_CATALOG_COLLECTION);
}

/**
 * Implements the 'addSongToCatalog' action for the SongRecommender concept.
 * This function adds a new song to a user's list of songs that are available
 * for future recommendations, ensuring it's not a duplicate.
 *
 * @param db The MongoDB database instance.
 * @param userId The ID of the user for whom the song is being added.
 * @param songId The ID of the song to be added to the catalog.
 * @returns A Promise that resolves when the operation is complete.
 * @throws Error if the song is already present in either `pastRecommendations`
 *         or `notYetRecommendedSongs` for the given user, enforcing the concept's
 *         "requires" clause and the invariant that the lists are disjoint.
 */
async function addSongToCatalog(db: Db, userId: User, songId: Song): Promise<void> {
  const collection = getUserSongCatalogCollection(db);

  // Check if the song already exists in either the past or not-yet-recommended lists
  // for the specified user. This enforces the concept's "requires" clause:
  // "song is not in pastRecommendations or notYetRecommendedSongs for user",
  // and maintains the "invariant: The intersection of RecommendedSongs and NotYetRecommendedSongs is empty".
  const userCatalog = await collection.findOne(
    { _id: userId },
    { projection: { pastRecommendations: 1, notYetRecommendedSongs: 1 } }
  );

  if (userCatalog) {
    if (userCatalog.pastRecommendations?.includes(songId)) {
      throw new Error(`Song '${songId}' has already been recommended to user '${userId}'.`);
    }
    if (userCatalog.notYetRecommendedSongs?.includes(songId)) {
      throw new Error(`Song '${songId}' is already pending recommendation for user '${userId}'.`);
    }
  }

  // Add the song to the 'notYetRecommendedSongs' list.
  // Using $addToSet ensures the song is added only if it's not already present in the array,
  // reinforcing uniqueness within the list.
  // 'upsert: true' ensures that if a user's document doesn't exist, it will be created.
  // '$setOnInsert' initializes 'pastRecommendations' for new documents, maintaining schema consistency.
  const result = await collection.updateOne(
    { _id: userId },
    {
      $addToSet: { notYetRecommendedSongs: songId }, // Add the song to the set of not-yet-recommended songs
      $setOnInsert: { pastRecommendations: [] }     // Initialize pastRecommendations if a new document is created
    },
    { upsert: true } // Create a new document if one does not exist for the user
  );

  // Optional: You can add logging or further checks based on `result.modifiedCount` or `result.upsertedId` if needed.
  if (result.matchedCount === 0 && !result.upsertedId) {
    // This case should theoretically not happen with `upsert: true`, but it's a robust check.
    throw new Error(`Failed to add song '${songId}' for user '${userId}'.`);
  }
}

// Export necessary types and functions for use by other modules
export {
  User,
  Song,
  UserSongCatalogDoc,
  addSongToCatalog,
  getUserSongCatalogCollection,
  USER_SONG_CATALOG_COLLECTION,
};
```
