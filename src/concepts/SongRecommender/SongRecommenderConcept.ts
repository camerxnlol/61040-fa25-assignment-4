import { Collection, Db } from "mongodb";
import { ID } from "@utils/types.ts";

/**
 * Type alias for a User identifier, assuming it's a unique ID.
 */
export type User = ID;

/**
 * Type alias for a Song identifier, assuming it's a unique ID.
 */
export type Song = ID;

/**
 * Represents the structure of a document in the user song catalog collection.
 * Each document corresponds to a single user's song recommendation data.
 */
export interface UserSongCatalogDoc {
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
export const USER_SONG_CATALOG_COLLECTION = "userSongCatalogs";

/**
 * SongRecommenderConcept class that manages user song catalogs and recommendations.
 * This class provides methods for adding songs to catalogs, generating recommendations,
 * and removing songs from catalogs.
 */
export class SongRecommenderConcept {
  private db: Db;

  /**
   * Creates a new instance of SongRecommenderConcept.
   * @param db The MongoDB database instance.
   */
  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Returns the MongoDB Collection instance for managing user song catalogs.
   * @returns A Collection<UserSongCatalogDoc> instance.
   */
  private getUserCatalog(): Collection<UserSongCatalogDoc> {
    return this.db.collection<UserSongCatalogDoc>(USER_SONG_CATALOG_COLLECTION);
  }

  /**
   * Implements the 'addSongToCatalog' action for the SongRecommender concept.
   * This method adds new songs to a user's list of songs that are available
   * for future recommendations, ensuring they're not duplicates.
   *
   * @param params Object containing userId and songs parameters.
   * @param params.userId The ID of the user for whom the songs are being added.
   * @param params.songs Array of song IDs to be added to the catalog.
   * @returns A Promise that resolves when the operation is complete.
   * @throws Error if any song is already present in either `pastRecommendations`
   *         or `notYetRecommendedSongs` for the given user, enforcing the concept's
   *         "requires" clause and the invariant that the lists are disjoint.
   */
  async addSongToCatalog(
    params: { userId: User; songs: Song[] },
  ): Promise<void> {
    const { userId, songs } = params;
    const collection = this.getUserCatalog();

    // Check if any of the songs already exist in either the past or not-yet-recommended lists
    // for the specified user. This enforces the concept's "requires" clause:
    // "song is not in pastRecommendations or notYetRecommendedSongs for user".
    const userCatalog = await collection.findOne(
      { _id: userId },
      { projection: { pastRecommendations: 1, notYetRecommendedSongs: 1 } },
    );

    if (userCatalog) {
      // Check for duplicates in pastRecommendations
      const duplicateInPast = songs.find((songId) =>
        userCatalog.pastRecommendations?.includes(songId)
      );
      if (duplicateInPast) {
        throw new Error(
          `Song '${duplicateInPast}' has already been recommended to user '${userId}'.`,
        );
      }

      // Check for duplicates in notYetRecommendedSongs
      const duplicateInNotYet = songs.find((songId) =>
        userCatalog.notYetRecommendedSongs?.includes(songId)
      );
      if (duplicateInNotYet) {
        throw new Error(
          `Song '${duplicateInNotYet}' is already pending recommendation for user '${userId}'.`,
        );
      }
    }

    // Add all songs to the 'notYetRecommendedSongs' list.
    // Using $addToSet with $each ensures all songs are added only if they're not already present in the array,
    // reinforcing uniqueness.
    // 'upsert: true' ensures that if a user's document doesn't exist, it will be created.
    // '$setOnInsert' initializes 'pastRecommendations' for new documents, maintaining schema consistency.
    const result = await collection.updateOne(
      { _id: userId },
      {
        $addToSet: { notYetRecommendedSongs: { $each: songs } }, // Add all songs to the set of not-yet-recommended songs
        $setOnInsert: { pastRecommendations: [] }, // Initialize pastRecommendations if a new document is created
      },
      { upsert: true }, // Create a new document if one does not exist for the user
    );

    if (result.matchedCount === 0 && !result.upsertedId) {
      // This case theoretically shouldn't happen with upsert:true, but good for robustness
      throw new Error(`Failed to add songs for user '${userId}'.`);
    }
  }

  /**
   * Implements the 'generateRecommendation' action for the SongRecommender concept.
   * This method selects a specified number of songs from the user's
   * `notYetRecommendedSongs`, moves them to `pastRecommendations`, and returns them.
   *
   * @param params Object containing userId and count parameters.
   * @param params.userId The ID of the user for whom recommendations are to be generated.
   * @param params.count The number of song recommendations to generate.
   * @returns A Promise that resolves with an array of recommended Song IDs.
   * @throws Error if `count` is invalid (e.g., negative, zero, or greater than
   *         the number of available `notYetRecommendedSongs`), or if the user
   *         does not have an initialized song catalog.
   */
  async generateRecommendation(
    params: { userId: User; count: number },
  ): Promise<{ recommendations: Song[] }> {
    const { userId, count } = params;
    const collection = this.getUserCatalog();

    if (count <= 0) {
      throw new Error("Count for recommendations must be a positive number.");
    }

    // Find the user's catalog to check available songs for the 'requires' clause.
    const userCatalog = await collection.findOne(
      { _id: userId },
      { projection: { notYetRecommendedSongs: 1 } },
    );

    if (!userCatalog || !userCatalog.notYetRecommendedSongs) {
      throw new Error(
        `User '${userId}' not found or has no songs available for recommendation.`,
      );
    }

    const availableSongs = userCatalog.notYetRecommendedSongs;

    // Enforce the 'requires' clause: "count is less than or equal to the number of songs in notYetRecommendedSongs for user"
    if (availableSongs.length < count) {
      throw new Error(
        `Not enough songs available for user '${userId}'. Requested ${count}, but only ${availableSongs.length} are available.`,
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
        $addToSet: { pastRecommendations: { $each: songsToRecommend } },
      },
    );

    if (updateResult.modifiedCount === 0) {
      // This could indicate a race condition or a state where the document was modified
      // or didn't match the initial findOne query anymore.
      throw new Error(
        `Failed to update catalog for user '${userId}' when generating recommendations. Data might be stale or concurrent modification occurred.`,
      );
    }

    // Return the selected song IDs as per the 'effect' clause: "returns count song recommendations"
    return { recommendations: songsToRecommend };
  }

  /**
   * Implements the 'removeSongsFromCatalog' action for the SongRecommender concept.
   * This method removes specified songs from the user's
   * `notYetRecommendedSongs` list.
   *
   * @param params Object containing userId and songs parameters.
   * @param params.userId The ID of the user from whose catalog the songs are to be removed.
   * @param params.songs Array of song IDs to be removed.
   * @returns A Promise that resolves when the operation is complete.
   * @throws Error if the user does not have an initialized song catalog, or if
   *         any song is not found in the `notYetRecommendedSongs` list for the user.
   */
  async removeSongsFromCatalog(
    params: { userId: User; songs: Song[] },
  ): Promise<void> {
    const { userId, songs } = params;
    const collection = this.getUserCatalog();

    // Check the 'requires' clause: "songs to be in notYetRecommendedSongs for user"
    const userCatalog = await collection.findOne(
      { _id: userId },
      { projection: { notYetRecommendedSongs: 1 } },
    );

    if (!userCatalog) {
      throw new Error(`User '${userId}' not found or has no song catalog.`);
    }

    // Check if any of the songs are not in the notYetRecommendedSongs list
    const missingSongs = songs.filter((songId) =>
      !userCatalog.notYetRecommendedSongs?.includes(songId)
    );

    if (missingSongs.length > 0) {
      // If only one song is missing, use the singular form for consistency with existing tests
      if (missingSongs.length === 1) {
        throw new Error(
          `Song '${
            missingSongs[0]
          }' not found in not-yet-recommended songs for user '${userId}'.`,
        );
      } else {
        throw new Error(
          `Songs '${
            missingSongs.join(", ")
          }' not found in not-yet-recommended songs for user '${userId}'.`,
        );
      }
    }

    // Perform the 'effect': "removes songs from notYetRecommendedSongs for user"
    const updateResult = await collection.updateOne(
      { _id: userId },
      {
        $pullAll: { notYetRecommendedSongs: songs }, // Remove all specified songs from the array
      },
    );

    if (updateResult.modifiedCount === 0) {
      // This indicates that the songs were not removed, possibly due to a race condition
      // or the songs no longer existing in the array.
      throw new Error(
        `Failed to remove songs for user '${userId}'. Data might be stale.`,
      );
    }
  }

  /**
   * Implements the 'removeSongsFromPastRecommendations' action for the SongRecommender concept.
   * This method removes specified songs from the user's
   * `pastRecommendations` list.
   *
   * @param params Object containing userId and songs parameters.
   * @param params.userId The ID of the user from whose past recommendations the songs are to be removed.
   * @param params.songs Array of song IDs to be removed.
   * @returns A Promise that resolves when the operation is complete.
   * @throws Error if the user does not have an initialized song catalog, or if
   *         any song is not found in the `pastRecommendations` list for the user.
   */
  async removeSongsFromPastRecommendations(
    params: { userId: User; songs: Song[] },
  ): Promise<void> {
    const { userId, songs } = params;
    const collection = this.getUserCatalog();

    // Check the 'requires' clause: "songs to be in pastRecommendations for user"
    const userCatalog = await collection.findOne(
      { _id: userId },
      { projection: { pastRecommendations: 1 } },
    );

    if (!userCatalog) {
      throw new Error(`User '${userId}' not found or has no song catalog.`);
    }

    // Check if any of the songs are not in the pastRecommendations list
    const missingSongs = songs.filter((songId) =>
      !userCatalog.pastRecommendations?.includes(songId)
    );

    if (missingSongs.length > 0) {
      // If only one song is missing, use the singular form for consistency with existing tests
      if (missingSongs.length === 1) {
        throw new Error(
          `Song '${
            missingSongs[0]
          }' not found in past recommendations for user '${userId}'.`,
        );
      } else {
        throw new Error(
          `Songs '${
            missingSongs.join(", ")
          }' not found in past recommendations for user '${userId}'.`,
        );
      }
    }

    // Perform the 'effect': "removes songs from pastRecommendations for user"
    const updateResult = await collection.updateOne(
      { _id: userId },
      {
        $pullAll: { pastRecommendations: songs }, // Remove all specified songs from the array
      },
    );

    if (updateResult.modifiedCount === 0) {
      // This indicates that the songs were not removed, possibly due to a race condition
      // or the songs no longer existing in the array.
      throw new Error(
        `Failed to remove songs from past recommendations for user '${userId}'. Data might be stale.`,
      );
    }
  }

  /**
   * Gets the past recommendations for a user.
   *
   * @param params Object containing userId parameter.
   * @param params.userId The ID of the user whose past recommendations to retrieve.
   * @returns A Promise that resolves with an array of past recommended Song IDs.
   * @throws Error if the user does not have an initialized song catalog.
   */
  async getPastRecommendations({ userId }: { userId: ID }): Promise<{ pastRecommendations: ID[] } | { error: string }> {
    const catalog = await this.getUserCatalog().findOne({ _id: userId });

    if (!catalog) {
      return { error: `User '${userId}' not found or has no song catalog.` };
    }

    // CORRECTED: Wrap the array in an object to match the sync's pattern.
    return { pastRecommendations: catalog.pastRecommendations || [] };
  }

  /**
   * Gets the not-yet-recommended songs for a user.
   *
   * @param params Object containing userId parameter.
   * @param params.userId The ID of the user whose not-yet-recommended songs to retrieve.
   * @returns A Promise that resolves with an array of not-yet-recommended Song IDs.
   * @throws Error if the user does not have an initialized song catalog.
   */
  async getNotYetRecommended({ userId }: { userId: ID }): Promise<{ notYetRecommendedSongs: ID[] } | { error: string }> {
    const catalog = await this.getUserCatalog().findOne({ _id: userId });

    if (!catalog) {
      return { error: `User '${userId}' not found or has no song catalog.` };
    }

    return { notYetRecommendedSongs: catalog.notYetRecommendedSongs || [] };
  }
}

// Export the class and necessary types for use by other modules
// Note: The class and types are already exported above with the 'export' keyword

// Default export for the concept server
export default SongRecommenderConcept;
