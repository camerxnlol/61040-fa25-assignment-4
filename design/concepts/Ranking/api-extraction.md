
[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

```ts
import { Collection, Db } from "mongodb";

import { Empty, ID } from "@utils/types.ts";

  

// Declare collection prefix, use concept name

const PREFIX = "Ranking.";

  

// Generic types of this concept

type User = ID;

type SongId = ID;

  

/**

* A `RankedSong` with:

* a `songId` SongId

* a `score` Number

*/

interface RankedSong {

songId: SongId;

score: number; // e.g., 0-100

}

  

/**

* a map from `User` to `UserRanking`

* a `UserRanking` is a set of `RankedSong`

*/

interface UserRankingDoc {

_id: User; // The ID of the user whose ranking this document represents

rankedSongs: RankedSong[];

}

  

/**

* @concept Ranking [User, SongId]

* @purpose To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.

* @principle When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10)

* and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

*/

export default class RankingConcept {

private userRankings: Collection<UserRankingDoc>;

  

// Constants for score management

private readonly DEFAULT_SCORE = 50;

private readonly MIN_SCORE = 0;

private readonly MAX_SCORE = 100;

private readonly SCORE_ADJUSTMENT = 10;

  

constructor(private readonly db: Db) {

this.userRankings = this.db.collection(PREFIX + "userRankings");

}

  

/**

* addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId): Empty | {error: string}

*

* **requires** user exists in the concept state, or a new ranking can be created for them

* **requires** preferred is either songA or songB

*

* **effects**

* - If the `user` does not have a `UserRanking`, an empty one is created for them.

* - If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.

* - Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

*/

async addComparison(

{ user, songA, songB, preferred }: {

user: User;

songA: SongId;

songB: SongId;

preferred: SongId;

},

): Promise<Empty | { error: string }> {

if (preferred !== songA && preferred !== songB) {

return { error: "Preferred song must be either songA or songB." };

}

  

let userRanking = await this.userRankings.findOne({ _id: user });

  

// If user ranking doesn't exist, initialize it

if (!userRanking) {

userRanking = { _id: user, rankedSongs: [] };

}

  

// Helper to get or add a song with default score to the user's rankedSongs

const getOrCreateRankedSong = (songId: SongId): RankedSong => {

let rankedSong = userRanking!.rankedSongs.find((rs) =>

rs.songId === songId

);

if (!rankedSong) {

rankedSong = { songId, score: this.DEFAULT_SCORE };

userRanking!.rankedSongs.push(rankedSong);

}

return rankedSong;

};

  

const rankedSongA = getOrCreateRankedSong(songA);

const rankedSongB = getOrCreateRankedSong(songB);

  

// Adjust scores based on which song was preferred

if (preferred === songA) {

rankedSongA.score = Math.min(

this.MAX_SCORE,

rankedSongA.score + this.SCORE_ADJUSTMENT,

);

rankedSongB.score = Math.max(

this.MIN_SCORE,

rankedSongB.score - this.SCORE_ADJUSTMENT,

);

} else { // preferred === songB

rankedSongB.score = Math.min(

this.MAX_SCORE,

rankedSongB.score + this.SCORE_ADJUSTMENT,

);

rankedSongA.score = Math.max(

this.MIN_SCORE,

rankedSongA.score - this.SCORE_ADJUSTMENT,

);

}

  

// Update the user's ranking in the database. upsert:true creates if not exists.

await this.userRankings.updateOne(

{ _id: user },

{ $set: { rankedSongs: userRanking.rankedSongs } },

{ upsert: true },

);

  

return {};

}

  

/**

* remove (user: User, song: SongId): Empty | {error: string}

*

* **requires** user exists in the concept state

* **requires** song exists in the `RankedSong` set for the given `user`

*

* **effects** deletes `song` from the `user`'s `RankedSong` set.

*/

async remove(

{ user, song }: { user: User; song: SongId },

): Promise<Empty | { error: string }> {

const userRanking = await this.userRankings.findOne({ _id: user });

  

if (!userRanking) {

return { error: "User ranking not found for the given user." };

}

  

const initialLength = userRanking.rankedSongs.length;

userRanking.rankedSongs = userRanking.rankedSongs.filter(

(rs) => rs.songId !== song,

);

  

// Check if the song was actually removed

if (userRanking.rankedSongs.length === initialLength) {

return { error: `SongId '${song}' not found in user's ranking.` };

}

  

// Update the database with the modified rankedSongs array

await this.userRankings.updateOne(

{ _id: user },

{ $set: { rankedSongs: userRanking.rankedSongs } },

);

  

return {};

}

  

/**

* _getRankings (user: User) : {rankedSongs: RankedSong[]} | {error: string}

*

* **requires** user exists in the concept state (has a ranking)

*

* **effects** returns the current `RankedSong` entries for the `user`, ordered by `score` (descending).

*/

async _getRankings(

{ user }: { user: User },

): Promise<{ rankedSongs: RankedSong[] } | { error: string }> {

const userRanking = await this.userRankings.findOne({ _id: user });

  

if (!userRanking) {

return { error: "User ranking not found for the given user." };

}

  

// Return the current RankedSong entries for the user, ordered by score (descending)

const sortedRankedSongs = [...userRanking.rankedSongs].sort(

(a, b) => b.score - a.score,

);

  

return { rankedSongs: sortedRankedSongs };

}

}
```

# prompt: 

Now, analyze the following Concept Implementation for Ranking and generate the API documentation based on these instructions.
# response:

# API Specification: Ranking Concept

**Purpose:** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.

---

## API Endpoints

### POST /api/Ranking/addComparison

**Description:** Allows a user to compare two songs, indicating which one is preferred, and dynamically updates their personalized ranking based on this comparison.

**Requirements:**
- user exists in the concept state, or a new ranking can be created for them
- preferred is either songA or songB

**Effects:**
- If the `user` does not have a `UserRanking`, an empty one is created for them.
- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

**Request Body:**
```json
{
  "user": "ID",
  "songA": "ID",
  "songB": "ID",
  "preferred": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Ranking/remove

**Description:** Deletes a specific song from a user's personalized ranked song set.

**Requirements:**
- user exists in the concept state
- song exists in the `RankedSong` set for the given `user`

**Effects:**
- deletes `song` from the `user`'s `RankedSong` set.

**Request Body:**
```json
{
  "user": "ID",
  "song": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Ranking/_getRankings

**Description:** Retrieves a user's current ranked songs, ordered by their assigned score in descending order.

**Requirements:**
- user exists in the concept state (has a ranking)

**Effects:**
- returns the current `RankedSong` entries for the `user`, ordered by `score` (descending).

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "songId": "ID",
    "score": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---