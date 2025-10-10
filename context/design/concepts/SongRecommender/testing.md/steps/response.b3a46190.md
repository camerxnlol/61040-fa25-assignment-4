---
timestamp: 'Fri Oct 10 2025 16:46:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251010_164618.307d28ac.md]]'
content_id: b3a4619094ffeef33c4c8fdcbf3dd4b3d82eaba7858813872afc44a72e01859c
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

/**
 * Type alias for a User identifier, assuming it's a unique ID string or number.
 */
type User = ID;

/**
 * Type alias for a Song identifier, assuming it's a unique ID string or number.
 */
type Song = ID;

/**
 * Represents the structure of a document in the MongoDB collection
 * that stores user-specific song recommendation data.
 * Each document corresponds to a single user.
 */
interface UserSongCatalogDoc {
  /** The unique identifier for the user, serving as the document's primary key (_id). */
  _id: User;
  /** An array of song IDs that have already been recommended to this user. */
  pastRecommendations: Song[];
  /** An array of song IDs that are available but not yet recommended to this user. */
  notYetRecommendedSongs: Song[];
}

/**
 * The name of the MongoDB collection where user song catalogs are stored.
 */
const USER_SONG_CATALOG_COLLECTION = "userSongCatalogs";

/**
 * Returns the MongoDB Collection instance for managing user song catalogs.
 * This function provides a type-safe way to access the collection.
 * @param db The MongoDB database instance.
 * @returns A Collection<UserSongCatalogDoc> instance.
 */
function getUserSongCatalogCollection(db: Db): Collection<UserSongCatalogDoc> {
  return db.collection<UserSongCatalogDoc>(USER_SONG_CATALOG_COLLECTION);
}

/**
 * Implements the 'addSongToCatalog' action for the SongRecommender concept.
 * This function adds a new song to a user's `notYetRecommendedSongs` list,
 * ensuring that the song is not already present in either `pastRecommendations`
 * or `notYetRecommendedSongs` for that user.
 *
 * @param db The MongoDB database instance.
 * @param userId The ID of the user for whom the song is being added.
 * @param songId The ID of the song to be added to the user's catalog.
 * @returns A Promise that resolves when the operation is complete.
 * @throws Error if the song is already present in `pastRecommendations` or
 *         `notYetRecommendedSongs` for the given user, enforcing the concept's
 *         "requires" clause and the defined invariant.
 */
async function addSongToCatalog(db: Db, userId: User, songId: Song): Promise<void> {
  const collection = getUserSongCatalogCollection(db);

  // First, check if the song already exists in the user's catalog (either recommended or not-yet-recommended).
  // This enforces the "requires" clause: "song is not in pastRecommendations or notYetRecommendedSongs for user"
  // and the invariant: "The intersection of RecommendedSongs and NotYetRecommendedSongs is empty".
  const userCatalog = await collection.findOne(
    { _id: userId },
    { projection: { pastRecommendations: 1, notYetRecommendedSongs: 1 } }
  );

  if (userCatalog) {
    if (userCatalog.pastRecommendations?.includes(songId)) {
      throw new Error(`Song '${songId}' has already been recommended to user '${userId}'.`);
    }
    if (userCatalog.notYetRecommendedSongs?.includes(songId)) {
      throw new Error(`Song '${songId}' is already in the pending recommendations for user '${userId}'.`);
    }
  }

  // If the song is not found in either list, proceed to add it to 'notYetRecommendedSongs'.
  // Using $addToSet ensures idempotence in case of concurrent calls or if the document was modified externally.
  // `upsert: true` ensures that if a user's document does not exist, it will be created.
  // `$setOnInsert: { pastRecommendations: [] }` correctly initializes the `pastRecommendations` array
  // for new user documents, maintaining the schema.
  const result = await collection.updateOne(
    { _id: userId },
    {
      $addToSet: { notYetRecommendedSongs: songId }, // Add the song to the set of not-yet-recommended songs
      $setOnInsert: { pastRecommendations: [] }     // Initialize pastRecommendations for new documents
    },
    { upsert: true } // Create a new document if one does not exist for the user
  );

  // Optional: You can inspect `result` for more detailed success information,
  // e.g., `result.modifiedCount` or `result.upsertedId`.
  if (result.modifiedCount === 0 && !result.upsertedId) {
    // This case indicates an unexpected failure if the song was not found in the initial check
    // and upsert also didn't lead to a change/creation.
    throw new Error(`Failed to add song '${songId}' for user '${userId}'. No document modified or created.`);
  }
}

// Export necessary types and functions for potential use by other modules
export {
  User,
  Song,
  UserSongCatalogDoc,
  addSongToCatalog,
  getUserSongCatalogCollection,
  USER_SONG_CATALOG_COLLECTION,
};
```
