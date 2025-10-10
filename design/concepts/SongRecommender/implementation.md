[@concept-design-overview](../../background/concept-design-overview.md)
[@concept-specifications](../../background/concept-specifications.md)
[@implementing-concepts](../../background/implementing-concepts.md)

concept SongRecommender \[User, Song]

purpose
	To introduce a new song for the user each day

principle
	Each day, the system presents a new song to the user, chosen from a list of songs. 
	The user can listen to the song.
    Recommendations refresh daily and past recommendations can be revisited.
    
state
	a set of Users with
		a set of pastRecommendations of type Songs
		a set of notYetRecommendedSongs of type Songs

invariant
	The intersection of RecommendedSongs and NotYetRecommendedSongs is empty

actions
	addSongToCatalog(user: User, song: Song)
		requires song is not in pastRecommendations or notYetRecommendedSongs for user
		effect adds song to notYetRecommendedSongs for user
	generateRecommendation(user: User, count: Number): Song
		requires count is less than or equal to the number of songs in notYetRecommendedSongs for user
		effect returns count song recommendations, moves song(s) from notYetRecommendedSongs to pastRecommendations for user
	removeSong(user: User, song: Song)
		requires song to be in notYetRecommendedSongs for user
		effect removes song from notYetRecommendedSongs for user
	async generateRecommendationFromLLM(user: User, llm: GeminiLLM, count: Number, basisSongs: Song\[]?)
		 effect Uses an LLM to generate count new songs and adds them to notYetRecommendedSongs. If basisSongs is provided, the new songs are based on the provided songs. If basisSongs is not provided, the new songs are based on current "trending" music that is different from the user's taste.

## Allowed Imports
```
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
```
# prompt: Given the context files and this concept, implement the addSongtoCatalog action and setup whatever state is necessary to do that. DO NOT ASSUME ANYTHING FROM THE CONCEPT SPEC AND THE IMPLEMENTATION MUST USE TS AND MONGO. Only work with what is given to you. Do not use Mongoose. Try to only use the Allowed Imports and you don't need to setup DB connection, assume that already exists.
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

  // You can add logging or further checks based on `result.modifiedCount` or `result.upsertedId` if needed.
  if (result.matchedCount === 0 && !result.upsertedId) {
    // This case theoretically shouldn't happen with upsert:true, but good for robustness
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