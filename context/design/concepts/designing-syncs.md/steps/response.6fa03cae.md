---
timestamp: 'Thu Nov 06 2025 23:00:08 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_230008.f0dcf343.md]]'
content_id: 6fa03cae94ca02eed9626e648bbbd8a21d52a3ada4a4cd4e65b68933ea9d16fa
---

# response:

Of course. This is an excellent example of a core business logic rule that is perfectly expressed as a synchronization. The logic is: "When a user makes a post about a specific song, that song should be considered 'listened to' or 'engaged with,' and thus moved from the pool of future recommendations to their history."

To achieve this, we need to make two small but important modifications to our concepts to support this new interaction, and then we'll write the sync itself.

### The Challenge

1. **The `Post` concept is generic.** It doesn't know anything about songs. We need to update it so that a post can be explicitly linked to a song.
2. **The `SongRecommender` concept doesn't have an action to move one specific song.** The `generateRecommendation` action moves a *random* song. We need a more targeted action.

Here is the step-by-step solution.

***

### Step 1: Update the `Post` Concept

We will modify the `Post.create` action and its underlying state to include an optional `songId`.

```typescript
// file: src/concepts/Post/PostConcept.ts (MODIFIED)

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Post.";

// --- Concept State ---

interface PostDocument {
  _id: ID;
  userId: ID;
  content: string;
  timestamp: Date;
  songId?: ID; // MODIFICATION: Added optional songId
}

export default class PostConcept {
  private readonly posts: Collection<PostDocument>;

  constructor(db: Db) {
    this.posts = db.collection<PostDocument>(PREFIX + "posts");
  }

  /**
   * create (userId: ID, content: string, timestamp: Date, songId?: ID): { post: ID }
   * 
   * MODIFICATION: Added optional songId parameter.
   */
  async create({ userId, content, timestamp, songId }: { userId: ID; content: string; timestamp: Date; songId?: ID }): Promise<{ post: ID }> {
    const newPost: PostDocument = {
      _id: freshID(),
      userId,
      content,
      timestamp,
      songId, // MODIFICATION: Storing the songId
    };
    await this.posts.insertOne(newPost);
    return { post: newPost._id };
  }
  
  // ... (delete, _getPostById, _getPostsByAuthor methods remain the same)
  async delete({ post }: { post: ID }): Promise<Empty | { error: string }> { /* ... */ return {}; }
  async _getPostById({ postId }: { postId: ID }): Promise<{ post: PostDocument }[] | { error: string }> { /* ... */ return []; }
  async _getPostsByAuthor({ authorId }: { authorId: ID }): Promise<{ post: PostDocument }[] | { error: string }> { /* ... */ return []; }
}
```

***

### Step 2: Update the `SongRecommender` Concept

We will add a new, specific action `markSongAsRecommended` to move a single, known song from the "not yet recommended" list to the "past recommendations" list.

```typescript
// file: src/concepts/SongRecommender/SongRecommenderConcept.ts (MODIFIED)

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";

const PREFIX = "SongRecommender.";

interface UserCatalog {
  _id: ID; // Corresponds to userId
  notYetRecommendedSongs: ID[];
  pastRecommendations: ID[];
}

export default class SongRecommenderConcept {
  private readonly userCatalogs: Collection<UserCatalog>;

  constructor(db: Db) {
    this.userCatalogs = db.collection<UserCatalog>(PREFIX + "userCatalogs");
  }

  // ... (Existing actions like addSongToCatalog, generateRecommendation, etc. are unchanged)
  async addSongToCatalog({ userId, songs }: { userId: ID; songs: ID[] }): Promise<Empty | { error: string }> { /* ... */ return {}; }
  async generateRecommendation({ userId, count }: { userId: ID; count: number }): Promise<{ recommendations: ID[] } | { error: string }> { /* ... */ return {recommendations: []}; }
  async removeSongsFromCatalog({ userId, songs }: { userId: ID; songs: ID[] }): Promise<Empty | { error: string }> { /* ... */ return {}; }
  async removeSongsFromPastRecommendations({ userId, songs }: { userId: ID; songs: ID[] }): Promise<Empty | { error: string }> { /* ... */ return {}; }


  /**
   * NEW ACTION: markSongAsRecommended
   * Moves a specific song from a user's `notYetRecommendedSongs` list to their `pastRecommendations` list.
   *
   * @requires The user must have a catalog.
   * @requires The song must exist in the user's `notYetRecommendedSongs` list.
   * @effects The song is removed from `notYetRecommendedSongs` and added to `pastRecommendations`.
   */
  async markSongAsRecommended({ userId, songId }: { userId: ID; songId: ID }): Promise<Empty | { error: string }> {
    // We only proceed if the song is currently in the "not yet recommended" list.
    const result = await this.userCatalogs.updateOne(
      { _id: userId, notYetRecommendedSongs: songId },
      {
        $pull: { notYetRecommendedSongs: songId },
        $addToSet: { pastRecommendations: songId }, // Use $addToSet to prevent duplicates
      }
    );

    if (result.matchedCount === 0) {
      // This is not necessarily an error; the song might already be recommended or not in their catalog.
      // We can fail silently or return a specific message. For robustness, we'll return success.
      return {};
    }

    return {};
  }

  // ... (Existing queries like getPastRecommendations are unchanged)
  async getPastRecommendations({ userId }: { userId: ID }): Promise<{ pastRecommendations: ID[] } | { error: string }> { /* ... */ return { pastRecommendations: [] }; }
  async getNotYetRecommended({ userId }: { userId: ID }): Promise<{ notYetRecommendedSongs: ID[] } | { error: string }> { /* ... */ return { notYetRecommendedSongs: [] }; }
}
```

***

### Step 3: Write the New Synchronization

Now, with our concepts updated, we can write the clean and declarative synchronization that connects them.

```typescript
// file: src/syncs/postsAndSongs.sync.ts (NEW FILE)

import { Post, SongRecommender } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * When a user successfully creates a post that is linked to a specific song,
 * this sync marks that song as "recommended" for the user, moving it from
 * their future recommendations pool to their history.
 */
export const MoveSongToHistoryOnPost: Sync = ({ userId, songId }) => ({
  when: actions(
    // Trigger when a `Post.create` action completes successfully.
    // We only care about posts that have a `songId` attached.
    [Post.create, { songId }, {}],
  ),
  then: actions(
    // Call our new, specific action on the SongRecommender concept.
    // Note: The `userId` from the `Post.create` input is automatically available here
    // because the engine matches on the full action signature.
    [SongRecommender.markSongAsRecommended, { userId, songId }],
  ),
});
```

With these three changes, your application now has a powerful new behavior. Any time a frontend client sends a request to create a post and includes a `songId` in the body, this synchronization will automatically and reliably update the user's recommendation state in the background.
