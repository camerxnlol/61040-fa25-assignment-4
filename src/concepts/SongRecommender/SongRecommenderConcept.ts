import { Collection, Db } from "mongodb";
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
function _getUserCatalog(db: Db): Collection<UserSongCatalogDoc> {
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
  const collection = _getUserCatalog(db);

  // Check if the song already exists in either the past or not-yet-recommended lists
  // for the specified user. This enforces the concept's "requires" clause:
  // "song is not in pastRecommendations or notYetRecommendedSongs for user".
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
  // reinforcing uniqueness.
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

  if (result.matchedCount === 0 && !result.upsertedId) {
    // This case theoretically shouldn't happen with upsert:true, but good for robustness
    throw new Error(`Failed to add song '${songId}' for user '${userId}'.`);
  }
}

/**
 * Implements the 'generateRecommendation' action for the SongRecommender concept.
 * This function selects a specified number of songs from the user's
 * `notYetRecommendedSongs`, moves them to `pastRecommendations`, and returns them.
 *
 * @param db The MongoDB database instance.
 * @param userId The ID of the user for whom recommendations are to be generated.
 * @param count The number of song recommendations to generate.
 * @returns A Promise that resolves with an array of recommended Song IDs.
 * @throws Error if `count` is invalid (e.g., negative, zero, or greater than
 *         the number of available `notYetRecommendedSongs`), or if the user
 *         does not have an initialized song catalog.
 */
async function generateRecommendation(db: Db, userId: User, count: number): Promise<Song[]> {
  const collection = _getUserCatalog(db);

  if (count <= 0) {
    throw new Error("Count for recommendations must be a positive number.");
  }

  // Find the user's catalog to check available songs for the 'requires' clause.
  const userCatalog = await collection.findOne(
    { _id: userId },
    { projection: { notYetRecommendedSongs: 1 } }
  );

  if (!userCatalog || !userCatalog.notYetRecommendedSongs) {
    throw new Error(`User '${userId}' not found or has no songs available for recommendation.`);
  }

  const availableSongs = userCatalog.notYetRecommendedSongs;

  // Enforce the 'requires' clause: "count is less than or equal to the number of songs in notYetRecommendedSongs for user"
  if (availableSongs.length < count) {
    throw new Error(
      `Not enough songs available for user '${userId}'. Requested ${count}, but only ${availableSongs.length} are available.`
    );
  }

  // Select 'count' songs to recommend. For simplicity, we take them from the beginning of the array.
  const songsToRecommend = availableSongs.slice(0, count);

  // Atomically update the user's catalog as per the 'effect' clause:
  // "moves song(s) from notYetRecommendedSongs to pastRecommendations for user"
  const updateResult = await collection.updateOne(
    { _id: userId },
    {
      // Remove the recommended songs from notYetRecommendedSongs
      $pullAll: { notYetRecommendedSongs: songsToRecommend },
      // Add the recommended songs to pastRecommendations. Using $each with $addToSet
      // treats the incoming array as individual elements to add to a set,
      // maintaining the "set" nature of pastRecommendations.
      $addToSet: { pastRecommendations: { $each: songsToRecommend } }
    }
  );

  if (updateResult.modifiedCount === 0) {
    // This could indicate a race condition or a state where the document was modified
    // or didn't match the initial findOne query anymore.
    throw new Error(
      `Failed to update catalog for user '${userId}' when generating recommendations. Data might be stale or concurrent modification occurred.`
    );
  }

  // Return the selected song IDs as per the 'effect' clause: "returns count song recommendations"
  return songsToRecommend;
}

/**
 * Implements the 'removeSong' action for the SongRecommender concept.
 * This function removes a specified song from the user's
 * `notYetRecommendedSongs` list.
 *
 * @param db The MongoDB database instance.
 * @param userId The ID of the user from whose catalog the song is to be removed.
 * @param songId The ID of the song to be removed.
 * @returns A Promise that resolves when the operation is complete.
 * @throws Error if the user does not have an initialized song catalog, or if
 *         the song is not found in the `notYetRecommendedSongs` list for the user.
 */
async function removeSong(db: Db, userId: User, songId: Song): Promise<void> {
  const collection = _getUserCatalog(db);

  // Check the 'requires' clause: "song to be in notYetRecommendedSongs for user"
  const userCatalog = await collection.findOne(
    { _id: userId },
    { projection: { notYetRecommendedSongs: 1 } }
  );

  if (!userCatalog || !userCatalog.notYetRecommendedSongs?.includes(songId)) {
    throw new Error(`Song '${songId}' not found in not-yet-recommended songs for user '${userId}'.`);
  }

  // Perform the 'effect': "removes song from notYetRecommendedSongs for user"
  const updateResult = await collection.updateOne(
    { _id: userId },
    {
      $pull: { notYetRecommendedSongs: songId } // Remove the specific song from the array
    }
  );

  if (updateResult.modifiedCount === 0) {
    // This indicates that the song was not removed, possibly due to a race condition
    // or the song no longer existing in the array.
    throw new Error(`Failed to remove song '${songId}' for user '${userId}'. Data might be stale.`);
  }
}

// Export necessary types and functions for use by other modules
export {
  type User,
  type Song,  
  type UserSongCatalogDoc,
  addSongToCatalog,
  generateRecommendation,
  removeSong,
  _getUserCatalog,
  USER_SONG_CATALOG_COLLECTION,
};