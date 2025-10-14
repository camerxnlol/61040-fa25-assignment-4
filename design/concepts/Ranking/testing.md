[@implementation](../Ranking/implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@example-testing](../LikertSurvey/testing.md)

# test: Ranking
# response:

# concept: Ranking \[User, SongId]
**purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.
**principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10) and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

**state**
a map from `User` to `UserRanking`
a `UserRanking` is a set of `RankedSong`
a `RankedSong` with
a `songId` SongId
a `score` Number

**actions**
`addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId)`
**requires** user exists in the concept state, or a new ranking can be created for them
**requires** preferred is either songA or songB
**effects**
\- If the `user` does not have a `UserRanking`, an empty one is created for them.
\- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
\- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

`remove (user: User, song: SongId)`
**requires** user exists in the concept state
**requires** song exists in the `RankedSong` set for the given `user`
**effects** deletes `song` from the `user`'s `RankedSong` set.

**queries**
`getRankings (user: User) : (rankedSongs: RankedSong[])`
**requires** user exists in the concept state (has a ranking)
**effects** returns the current `RankedSong` entries for the `user`, ordered by `score`.

# file: src/Ranking/RankingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
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

# file: src/Ranking/RankingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import RankingConcept from "./RankingConcept.ts";

const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const SONG_A = "song:Wonderwall" as ID;
const SONG_B = "song:BohemianRhapsody" as ID;
const SONG_C = "song:StairwayToHeaven" as ID;
const SONG_D = "song:HotelCalifornia" as ID;

Deno.test("Principle: User ranks songs, scores adjust dynamically, and rankings are viewable", async () => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    console.log("--- Starting Principle Test ---");

    // Initial state check for user Alice
    const initialRankings = await rankingConcept._getRankings({ user: USER_ALICE });
    assertEquals("error" in initialRankings, true, "Alice should not have rankings initially.");
    console.log(`User Alice has no rankings initially: ${JSON.stringify(initialRankings)}`);

    // 1. User Alice listens to songs and makes comparisons.
    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
    let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 1st comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "Alice should have 2 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `${SONG_A} should be ranked higher.`);
    assertEquals(aliceRankings.rankedSongs[0].score, 60, `${SONG_A} score should be 60.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, `${SONG_B} should be ranked lower.`);
    assertEquals(aliceRankings.rankedSongs[1].score, 40, `${SONG_B} score should be 40.`);

    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_C}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_C, preferred: SONG_A });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 2nd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "Alice should have 3 ranked songs.");
    // Check scores and order
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A); // (60 + 10 = 70)
    assertEquals(aliceRankings.rankedSongs[0].score, 70);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B); // score 40, no change
    assertEquals(aliceRankings.rankedSongs[1].score, 40);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C); // (50 - 10 = 40)
    assertEquals(aliceRankings.rankedSongs[2].score, 40);

    console.log(`\nAction: Alice compares ${SONG_B} vs ${SONG_C}, prefers ${SONG_C}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_C });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 3rd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "Alice should still have 3 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A); // score 70, no change
    assertEquals(aliceRankings.rankedSongs[0].score, 70);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C); // (40 + 10 = 50) - now higher than B
    assertEquals(aliceRankings.rankedSongs[1].score, 50);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_B); // (40 - 10 = 30) - now lower than C
    assertEquals(aliceRankings.rankedSongs[2].score, 30);

    // 2. Another user Bob also ranks songs.
    console.log(`\nAction: Bob compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_B}.`);
    await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_B });
    let bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Bob's rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    assertEquals(bobRankings.rankedSongs.length, 2, "Bob should have 2 ranked songs.");
    assertEquals(bobRankings.rankedSongs[0].songId, SONG_B, `${SONG_B} should be ranked higher for Bob.`);
    assertEquals(bobRankings.rankedSongs[0].score, 60, `${SONG_B} score should be 60 for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].songId, SONG_A, `${SONG_A} should be ranked lower for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].score, 40, `${SONG_A} score should be 40 for Bob.`);

    // Verify Alice's rankings are untouched
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "Alice's top song should still be A.");
    assertEquals(aliceRankings.rankedSongs[0].score, 70, "Alice's A score should be unchanged.");
    console.log("Confirmed Alice's rankings are independent of Bob's actions.");

    // 3. Alice removes a song.
    console.log(`\nAction: Alice removes ${SONG_B} from her rankings.`);
    await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after removing ${SONG_B}: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "Alice should now have 2 ranked songs.");
    assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), SONG_B, `${SONG_B} should be removed.`);
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A);
    assertEquals(aliceRankings.rankedSongs[0].score, 70);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C);
    assertEquals(aliceRankings.rankedSongs[1].score, 50);

    console.log("--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addComparison requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: preferred must be songA or songB", async () => {
      const result = await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_C });
      assertEquals("error" in result, true, "Should return an error if preferred is not songA or songB.");
      assertEquals((result as { error: string }).error, "Preferred song must be either songA or songB.");
    });

    await test.step("Effects: Creates new user ranking if none exists", async () => {
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const userRanking = await rankingConcept._getRankings({ user: USER_ALICE });
      assertNotEquals("error" in userRanking, true, "User ranking should now exist.");
    });

    await test.step("Effects: Adds new songs with default score", async () => {
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A && rs.score === 60));
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B && rs.score === 40));
    });

    await test.step("Effects: Adjusts scores correctly (preferred increases, other decreases)", async () => {
      // Bob has A:40, B:60.
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_B, songB: SONG_A, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      // B was 60, A was 40. Now A is preferred.
      // A: 40 + 10 = 50
      // B: 60 - 10 = 50
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 50);
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B)?.score, 50);
    });

    await test.step("Effects: Score clamping (min and max scores)", async () => {
      // Alice has SONG_A at 70 from principle test. Max is 100.
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 70+10 = 80
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 80+10 = 90
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 90+10 = 100
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100+10 = 100 (clamped)
      let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 100, "Score should be clamped at MAX_SCORE.");

      // For SONG_D, it was created at 50, decreased by 10 three times (50-10*3=20), then decreased again to (20-10=10)
      // then decreased again (10-10 = 0), then decreased again (0-10=0, clamped)
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_D)?.score, 0, "Score should be clamped at MIN_SCORE.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    // Setup for removal tests
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_C, songB: SONG_A, preferred: SONG_C }); // Alice: C:60, A:50, B:40

    await test.step("Requires: user exists in the concept state", async () => {
      const result = await rankingConcept.remove({ user: "user:NonExistent" as ID, song: SONG_A });
      assertEquals("error" in result, true, "Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.");
    });

    await test.step("Requires: song exists in the RankedSong set for the given user", async () => {
      const result = await rankingConcept.remove({ user: USER_ALICE, song: SONG_D });
      assertEquals("error" in result, true, "Should return an error if song is not in user's ranking.");
      assertEquals((result as { error: string }).error, `SongId '${SONG_D}' not found in user's ranking.`);
    });

    await test.step("Effects: deletes song from the user's RankedSong set", async () => {
      await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 2, "After removal, only 2 songs should remain.");
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), undefined, `${SONG_B} should be gone.`);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A), undefined);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_C), undefined);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getRankings requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: user exists in the concept state", async () => {
      const result = await rankingConcept._getRankings({ user: "user:NonExistent" as ID });
      assertEquals("error" in result, true, "Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.");
    });

    await test.step("Effects: returns current RankedSong entries, ordered by score (descending)", async () => {
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A }); // A:60, B:40
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_B }); // B:50, C:40, A:60
      // Current scores: A:60, B:50, C:40
      // Expected order: A, B, C

      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 3, "Should return all ranked songs.");
      assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "Highest score song first.");
      assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, "Second highest score song second.");
      assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C, "Lowest score song last.");
    });
  } finally {
    await client.close();
  }
});
```

# prompt: Use the green check for expected behavior in the logs and red X for unexpected behavior in the logs.  Failing as expected should be a green check. Failing not as expected should be a red X.
# response:

# LikertSurvey Implementation and Test

# concept: LikertSurvey

*   **concept**: LikertSurvey \[Author, Respondent]
*   **purpose**: To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
*   **principle**: If an author creates a survey with several questions on a 1-5 scale, and a respondent submits their answers to those questions, then the author can view the collected responses to analyze the respondent's opinions.
*   **state**:
    *   A set of `Surveys` with
        *   an `author` of type `Author`
        *   a `title` of type `String`
        *   a `scaleMin` of type `Number`
        *   a `scaleMax` of type `Number`
    *   A set of `Questions` with
        *   a `survey` of type `Survey`
        *   a `text` of type `String`
    *   A set of `Responses` with
        *   a `respondent` of type `Respondent`
        *   a `question` of type `Question`
        *   a `value` of type `Number`
*   **actions**:
    *   `createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)`
        *   **requires**: `scaleMin < scaleMax`
        *   **effects**: Creates a new survey with the given author, title, and scale.
    *   `addQuestion (survey: Survey, text: String): (question: Question)`
        *   **requires**: The survey must exist.
        *   **effects**: Adds a new question to the specified survey.
    *   `submitResponse (respondent: Respondent, question: Question, value: Number)`
        *   **requires**: The question must exist. The respondent must not have already submitted a response for this question. The value must be within the survey's scale.
        *   **effects**: Records the respondent's answer for the given question.
    *   `updateResponse (respondent: Respondent, question: Question, value: Number)`
        *   **requires**: The question must exist. The respondent must have already submitted a response for this question. The value must be within the survey's scale.
        *   **effects**: Updates the respondent's existing answer for the given question.

# file: src/likertsurvey/LikertSurveyConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "LikertSurvey" + ".";

// Generic types for the concept's external dependencies
type Author = ID;
type Respondent = ID;

// Internal entity types, represented as IDs
type Survey = ID;
type Question = ID;
type Response = ID;

/**
 * State: A set of Surveys with an author, title, and scale.
 */
interface SurveyDoc {
  _id: Survey; // MongoDB _id
  author: Author;
  title: string;
  scaleMin: number;
  scaleMax: number;
}

/**
 * State: A set of Questions, each linked to a survey and containing text.
 */
interface QuestionDoc {
  _id: Question; // MongoDB _id
  survey: Survey;
  text: string;
}

/**
 * State: A set of Responses, linking a respondent, a question, and their chosen value.
 */
interface ResponseDoc {
  _id: Response; // MongoDB _id
  respondent: Respondent;
  question: Question;
  value: number;
}

/**
 * @concept LikertSurvey
 * @purpose To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
 */
export default class LikertSurveyConcept {
  surveys: Collection<SurveyDoc>;
  questions: Collection<QuestionDoc>;
  responses: Collection<ResponseDoc>;

  constructor(private readonly db: Db) {
    this.surveys = this.db.collection(PREFIX + "surveys");
    this.questions = this.db.collection(PREFIX + "questions");
    this.responses = this.db.collection(PREFIX + "responses");
  }

  /**
   * Action: Creates a new survey.
   * @requires scaleMin must be less than scaleMax.
   * @effects A new survey is created and its ID is returned.
   */
  async createSurvey({ author, title, scaleMin, scaleMax }: { author: Author; title: string; scaleMin: number; scaleMax: number }): Promise<{ survey: Survey } | { error: string }> {
    if (scaleMin >= scaleMax) {
      return { error: "scaleMin must be less than scaleMax" };
    }

    const surveyId = freshID() as Survey;
    await this.surveys.insertOne({ _id: surveyId, author, title, scaleMin, scaleMax });
    return { survey: surveyId };
  }

  /**
   * Action: Adds a new question to an existing survey.
   * @requires The survey must exist.
   * @effects A new question is created and its ID is returned.
   */
  async addQuestion({ survey, text }: { survey: Survey; text: string }): Promise<{ question: Question } | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }

    const questionId = freshID() as Question;
    await this.questions.insertOne({ _id: questionId, survey, text });
    return { question: questionId };
  }

  /**
   * Action: Submits a response to a question.
   * @requires The question must exist.
   * @requires The respondent must not have already responded to this question.
   * @requires The response value must be within the survey's defined scale.
   * @effects A new response is recorded in the state.
   */
  async submitResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      // This indicates a data integrity issue but is a good safeguard.
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const existingResponse = await this.responses.findOne({ respondent, question });
    if (existingResponse) {
      return { error: "Respondent has already answered this question. Use updateResponse to change it." };
    }

    const responseId = freshID() as Response;
    await this.responses.insertOne({ _id: responseId, respondent, question, value });

    return {};
  }

  /**
   * Action: Updates an existing response to a question.
   * @requires The question must exist.
   * @requires A response from the given respondent to the question must already exist.
   * @requires The new response value must be within the survey's defined scale.
   * @effects The existing response's value is updated.
   */
  async updateResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const result = await this.responses.updateOne({ respondent, question }, { $set: { value } });

    if (result.matchedCount === 0) {
      return { error: "No existing response found to update. Use submitResponse to create one." };
    }

    return {};
  }

  /**
   * Query: Retrieves all questions associated with a specific survey.
   * @requires The survey must exist.
   * @effects Returns an array of QuestionDoc objects for the survey.
   */
  async _getSurveyQuestions({ survey }: { survey: Survey }): Promise<QuestionDoc[] | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }
    return await this.questions.find({ survey }).toArray();
  }

  /**
   * Query: Retrieves all responses for a given survey. This involves finding all
   * questions for the survey first, then finding all responses to those questions.
   * @requires The survey must exist.
   * @effects Returns an array of ResponseDoc objects for the survey.
   */
  async _getSurveyResponses({ survey }: { survey: Survey }): Promise<ResponseDoc[] | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }
    const surveyQuestions = await this.questions.find({ survey }).project({ _id: 1 }).toArray();
    const questionIds = surveyQuestions.map((q) => q._id as Question);
    if (questionIds.length === 0) {
      return []; // No questions, so no responses
    }
    return await this.responses.find({ question: { $in: questionIds } }).toArray();
  }

  /**
   * Query: Retrieves all answers submitted by a specific respondent.
   * @effects Returns an array of ResponseDoc objects from the respondent.
   */
  async _getRespondentAnswers({ respondent }: { respondent: Respondent }): Promise<ResponseDoc[]> {
    return await this.responses.find({ respondent }).toArray();
  }
}
```

# file: src/likertsurvey/LikertSurveyConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LikertSurveyConcept from "./LikertSurveyConcept.ts";

const authorA = "author:Alice" as ID;
const respondentB = "respondent:Bob" as ID;
const respondentC = "respondent:Charlie" as ID;

Deno.test("Principle: Author creates survey, respondent answers, author views results", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("--- Starting LikertSurvey Principle Test ---");

    // 1. Author creates a survey with a 1-5 scale
    console.log("Action: Author creates a survey 'Customer Satisfaction' (scale 1-5).");
    const createSurveyResult = await surveyConcept.createSurvey({ author: authorA, title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 });
    assertEquals("error" in createSurveyResult, false, `✅ Survey creation should not fail. Error: ${JSON.stringify(createSurveyResult)}`);
    const { survey } = createSurveyResult as { survey: ID };
    assertExists(survey, "✅ Survey ID should be returned.");
    console.log(`Result: Survey created with ID: ${survey}`);

    // 2. Author adds several questions
    console.log("Action: Author adds question 1: 'How satisfied are you...?'");
    const addQ1Result = await surveyConcept.addQuestion({ survey, text: "How satisfied are you with our product?" });
    assertEquals("error" in addQ1Result, false, `✅ Adding question 1 should not fail. Error: ${JSON.stringify(addQ1Result)}`);
    const { question: q1 } = addQ1Result as { question: ID };
    assertExists(q1, "✅ Question 1 ID should be returned.");
    console.log(`Result: Question 1 added with ID: ${q1}`);

    console.log("Action: Author adds question 2: 'How likely are you...?'");
    const addQ2Result = await surveyConcept.addQuestion({ survey, text: "How likely are you to recommend us?" });
    assertEquals("error" in addQ2Result, false, `✅ Adding question 2 should not fail. Error: ${JSON.stringify(addQ2Result)}`);
    const { question: q2 } = addQ2Result as { question: ID };
    assertExists(q2, "✅ Question 2 ID should be returned.");
    console.log(`Result: Question 2 added with ID: ${q2}`);

    const questions = await surveyConcept._getSurveyQuestions({ survey }) as { error?: string } & any[];
    assertEquals("error" in questions, false, `✅ Getting survey questions should not fail. Error: ${JSON.stringify(questions)}`);
    assertEquals(questions.length, 2, "✅ There should be two questions in the survey.");
    console.log(`Verification: Survey has ${questions.length} questions.`);

    // 3. A respondent submits their answers to those questions
    console.log(`Action: Respondent Bob submits response 5 for question ${q1}.`);
    const submitR1Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q1, value: 5 });
    assertEquals("error" in submitR1Result, false, `✅ Submitting response 1 should succeed. Error: ${JSON.stringify(submitR1Result)}`);
    console.log("Result: Response 1 submitted successfully.");

    console.log(`Action: Respondent Bob submits response 4 for question ${q2}.`);
    const submitR2Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q2, value: 4 });
    assertEquals("error" in submitR2Result, false, `✅ Submitting response 2 should succeed. Error: ${JSON.stringify(submitR2Result)}`);
    console.log("Result: Response 2 submitted successfully.");

    // 4. The author can view the collected responses
    console.log("\nAction: Author queries for collected responses for the survey.");
    const surveyResponses = await surveyConcept._getSurveyResponses({ survey }) as { error?: string } & any[];
    assertEquals("error" in surveyResponses, false, `✅ Getting survey responses should not fail. Error: ${JSON.stringify(surveyResponses)}`);
    assertEquals(surveyResponses.length, 2, "✅ There should be two responses for the survey.");
    assertEquals(surveyResponses.find((r) => r.question === q1)?.value, 5, "✅ Response for Q1 should be 5.");
    assertEquals(surveyResponses.find((r) => r.question === q2)?.value, 4, "✅ Response for Q2 should be 4.");
    console.log(`Verification: Survey responses collected: ${JSON.stringify(surveyResponses)}`);

    console.log("\nAction: Author queries for Bob's answers.");
    const respondentAnswers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(respondentAnswers.length, 2, "✅ The respondent should have two answers recorded.");
    console.log(`Verification: Bob's answers: ${JSON.stringify(respondentAnswers)}`);

    console.log("--- LikertSurvey Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSurvey requires scaleMin < scaleMax", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing createSurvey requirements ---");
    console.log("Action: Attempt to create survey with scaleMin > scaleMax.");
    const invalidResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 1", scaleMin: 5, scaleMax: 1 });
    assertEquals("error" in invalidResult, true, "✅ Should fail when scaleMin > scaleMax.");
    console.log(`Result: Expected error caught: ${(invalidResult as { error: string }).error}`);

    console.log("Action: Attempt to create survey with scaleMin == scaleMax.");
    const equalResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 2", scaleMin: 3, scaleMax: 3 });
    assertEquals("error" in equalResult, true, "✅ Should fail when scaleMin == scaleMax.");
    console.log(`Result: Expected error caught: ${(equalResult as { error: string }).error}`);
    console.log("--- createSurvey requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addQuestion requires an existing survey", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  const nonExistentSurveyId = "survey:fake" as ID;

  try {
    console.log("\n--- Testing addQuestion requirements ---");
    console.log(`Action: Attempt to add question to non-existent survey '${nonExistentSurveyId}'.`);
    const result = await surveyConcept.addQuestion({ survey: nonExistentSurveyId, text: "This will fail" });
    assertEquals("error" in result, true, "✅ Adding a question to a non-existent survey should fail.");
    console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    console.log("--- addQuestion requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: submitResponse requirements are enforced", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing submitResponse requirements ---");
    // Setup a valid survey and question
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    console.log(`Setup: Survey '${survey}' and Question '${question}' created.`);

    // Requires: question must exist
    const nonExistentQuestionId = "question:fake" as ID;
    console.log(`Action: Attempt to submit response to non-existent question '${nonExistentQuestionId}'.`);
    const res1 = await surveyConcept.submitResponse({ respondent: respondentB, question: nonExistentQuestionId, value: 3 });
    assertEquals("error" in res1, true, "✅ Submitting a response to a non-existent question should fail.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: respondent must not have already submitted a response
    console.log(`Action: Respondent Bob submits first response to question '${question}'.`);
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 }); // First submission is OK
    console.log(`Result: First response successful. Value: 3`);

    console.log(`Action: Respondent Bob attempts to submit second response to question '${question}'.`);
    const res2 = await surveyConcept.submitResponse({ respondent: respondentB, question, value: 4 }); // Second submission fails
    assertEquals("error" in res2, true, "✅ Submitting a response twice for the same question should fail.");
    assertEquals((res2 as { error: string }).error, "Respondent has already answered this question. Use updateResponse to change it.", "✅ Specific error message for double submission.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Charlie submits value 0 (below min scale) for question '${question}'.`);
    const res3 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 0 }); // Below min
    assertEquals("error" in res3, true, "✅ Submitting a value below the minimum scale should fail.");
    console.log(`Result: Expected error caught: ${(res3 as { error: string }).error}`);

    console.log(`Action: Respondent Charlie submits value 6 (above max scale) for question '${question}'.`);
    const res4 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 6 }); // Above max
    assertEquals("error" in res4, true, "✅ Submitting a value above the maximum scale should fail.");
    console.log(`Result: Expected error caught: ${(res4 as { error: string }).error}`);
    console.log("--- submitResponse requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateResponse successfully updates a response and enforces requirements", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  try {
    console.log("\n--- Testing updateResponse actions and requirements ---");
    // Setup
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 });
    console.log(`Setup: Survey '${survey}', Question '${question}' created. Respondent Bob submitted initial response '3'.`);

    // Requires: A response must already exist to be updated
    console.log(`Action: Attempt to update response for Respondent Charlie (no existing response).`);
    const res1 = await surveyConcept.updateResponse({ respondent: respondentC, question, value: 4 });
    assertEquals("error" in res1, true, "✅ Updating a non-existent response should fail.");
    assertEquals((res1 as { error: string }).error, "No existing response found to update. Use submitResponse to create one.", "✅ Specific error message for no existing response.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Bob attempts to update response with value 6 (outside scale).`);
    const res2 = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 6 });
    assertEquals("error" in res2, true, "✅ Updating with a value outside the scale should fail.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Successful update
    console.log(`Action: Respondent Bob successfully updates response for question '${question}' to value 5.`);
    const successResult = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 5 });
    assertEquals("error" in successResult, false, "✅ A valid update should succeed.");
    console.log("Result: Update successful.");

    // Verify the update
    console.log("Verification: Querying Bob's answers to confirm update.");
    const answers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(answers.length, 1, "✅ There should still be only one answer.");
    assertEquals(answers[0].value, 5, "✅ The answer's value should be updated to 5.");
    console.log(`Verification: Bob's updated answer: ${JSON.stringify(answers[0])}`);
    console.log("--- updateResponse tests completed ---");
  } finally {
    await client.close();
  }
});
```

# trace: LikertSurvey Principle

The following trace demonstrates how the **principle** of the `LikertSurvey` concept is fulfilled by a sequence of actions.

1.  **Given**: An author `authorA` and a respondent `respondentB`.
2.  **Action**: The author creates a new survey.
    ```
    LikertSurvey.createSurvey({ author: "authorA", title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 })
    ```
3.  **Result**: A new survey is created, and its ID is returned. ✅
    ```
    { survey: "survey1" }
    ```
4.  **Action**: The author adds two questions to the survey.
    ```
    LikertSurvey.addQuestion({ survey: "survey1", text: "How satisfied are you...?" })
    LikertSurvey.addQuestion({ survey: "survey1", text: "How likely are you...?" })
    ```
5.  **Result**: Two new questions are created, and their IDs are returned. ✅
    ```
    { question: "q1" }
    { question: "q2" }
    ```
6.  **Action**: The respondent submits their answers to both questions.
    ```
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q1", value: 5 })
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q2", value: 4 })
    ```
7.  **Result**: The responses are successfully recorded. ✅
    ```
    {}
    {}
    ```
8.  **Action**: The author queries for all responses to their survey to analyze the results.
    ```
    LikertSurvey._getSurveyResponses({ survey: "survey1" })
    ```
9.  **Result**: The state reflects the submitted responses, fulfilling the concept's purpose. ✅
    ```
    [
      { _id: ..., respondent: "respondentB", question: "q1", value: 5 },
      { _id: ..., respondent: "respondentB", question: "q2", value: 4 }
    ]
    ```

# Ranking Implementation and Test

# concept: Ranking \[User, SongId]

**purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.
**principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10) and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

**state**
a map from `User` to `UserRanking`
a `UserRanking` is a set of `RankedSong`
a `RankedSong` with
a `songId` SongId
a `score` Number

**actions**
`addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId)`
**requires** user exists in the concept state, or a new ranking can be created for them
**requires** preferred is either songA or songB
**effects**
\- If the `user` does not have a `UserRanking`, an empty one is created for them.
\- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
\- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

`remove (user: User, song: SongId)`
**requires** user exists in the concept state
**requires** song exists in the `RankedSong` set for the given `user`
**effects** deletes `song` from the `user`'s `RankedSong` set.

**queries**
`getRankings (user: User) : (rankedSongs: RankedSong[])`
**requires** user exists in the concept state (has a ranking)
**effects** returns the current `RankedSong` entries for the `user`, ordered by `score`.

# file: src/Ranking/RankingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
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

# file: src/Ranking/RankingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import RankingConcept from "./RankingConcept.ts";

const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const SONG_A = "song:Wonderwall" as ID;
const SONG_B = "song:BohemianRhapsody" as ID;
const SONG_C = "song:StairwayToHeaven" as ID;
const SONG_D = "song:HotelCalifornia" as ID;

Deno.test("Principle: User ranks songs, scores adjust dynamically, and rankings are viewable", async () => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    console.log("--- Starting Ranking Principle Test ---");

    // Initial state check for user Alice
    const initialRankings = await rankingConcept._getRankings({ user: USER_ALICE });
    assertEquals("error" in initialRankings, true, "✅ Alice should not have rankings initially.");
    console.log(`User Alice has no rankings initially: ${JSON.stringify(initialRankings)}`);

    // 1. User Alice listens to songs and makes comparisons.
    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
    let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 1st comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "✅ Alice should have 2 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} should be ranked higher.`);
    assertEquals(aliceRankings.rankedSongs[0].score, 60, `✅ ${SONG_A} score should be 60.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, `✅ ${SONG_B} should be ranked lower.`);
    assertEquals(aliceRankings.rankedSongs[1].score, 40, `✅ ${SONG_B} score should be 40.`);

    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_C}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_C, preferred: SONG_A });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 2nd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Alice should have 3 ranked songs.");
    // Check scores and order
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} should be highest.`); // (60 + 10 = 70)
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score should be 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, `✅ ${SONG_B} should be middle.`); // score 40, no change, order preserved due to B > C default score then B > C final score
    assertEquals(aliceRankings.rankedSongs[1].score, 40, `✅ ${SONG_B} score should be 40.`);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C, `✅ ${SONG_C} should be lowest.`); // (50 - 10 = 40)
    assertEquals(aliceRankings.rankedSongs[2].score, 40, `✅ ${SONG_C} score should be 40.`);

    console.log(`\nAction: Alice compares ${SONG_B} vs ${SONG_C}, prefers ${SONG_C}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_C });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 3rd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Alice should still have 3 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} remains highest.`); // score 70, no change
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score is 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C, `✅ ${SONG_C} is now middle.`); // (40 + 10 = 50) - now higher than B
    assertEquals(aliceRankings.rankedSongs[1].score, 50, `✅ ${SONG_C} score is 50.`);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_B, `✅ ${SONG_B} is now lowest.`); // (40 - 10 = 30) - now lower than C
    assertEquals(aliceRankings.rankedSongs[2].score, 30, `✅ ${SONG_B} score is 30.`);

    // 2. Another user Bob also ranks songs.
    console.log(`\nAction: Bob compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_B}.`);
    await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_B });
    let bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Bob's rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    assertEquals(bobRankings.rankedSongs.length, 2, "✅ Bob should have 2 ranked songs.");
    assertEquals(bobRankings.rankedSongs[0].songId, SONG_B, `✅ ${SONG_B} should be ranked higher for Bob.`);
    assertEquals(bobRankings.rankedSongs[0].score, 60, `✅ ${SONG_B} score should be 60 for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].songId, SONG_A, `✅ ${SONG_A} should be ranked lower for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].score, 40, `✅ ${SONG_A} score should be 40 for Bob.`);

    // Verify Alice's rankings are untouched
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "✅ Alice's top song should still be A.");
    assertEquals(aliceRankings.rankedSongs[0].score, 70, "✅ Alice's A score should be unchanged.");
    console.log("Confirmed Alice's rankings are independent of Bob's actions. ✅");

    // 3. Alice removes a song.
    console.log(`\nAction: Alice removes ${SONG_B} from her rankings.`);
    await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after removing ${SONG_B}: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "✅ Alice should now have 2 ranked songs.");
    assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), undefined, `✅ ${SONG_B} should be removed.`);
    assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A), undefined, `✅ ${SONG_A} should still exist.`);
    assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_C), undefined, `✅ ${SONG_C} should still exist.`);
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} remains top.`);
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score is 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C, `✅ ${SONG_C} is second.`);
    assertEquals(aliceRankings.rankedSongs[1].score, 50, `✅ ${SONG_C} score is 50.`);

    console.log("--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addComparison requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: preferred must be songA or songB", async () => {
      console.log("\n--- Testing addComparison requirements and effects ---");
      console.log("Action: Attempt to add comparison where preferred is neither songA nor songB.");
      const result = await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_C });
      assertEquals("error" in result, true, "✅ Should return an error if preferred is not songA or songB.");
      assertEquals((result as { error: string }).error, "Preferred song must be either songA or songB.", "✅ Specific error message.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: Creates new user ranking if none exists", async () => {
      console.log("\nAction: Add comparison for a new user, expecting ranking to be created.");
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const userRanking = await rankingConcept._getRankings({ user: USER_ALICE });
      assertNotEquals("error" in userRanking, true, "✅ User ranking should now exist.");
      console.log(`Result: User ranking created for ${USER_ALICE}.`);
    });

    await test.step("Effects: Adds new songs with default score", async () => {
      console.log("\nAction: Add comparison for another new user, checking default scores.");
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A && rs.score === 60), "✅ SONG_A should have score 60.");
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B && rs.score === 40), "✅ SONG_B should have score 40.");
      console.log(`Result: Bob's initial rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    });

    await test.step("Effects: Adjusts scores correctly (preferred increases, other decreases)", async () => {
      console.log("\nAction: Bob compares B vs A, prefers A. (A:40, B:60 before)");
      // Bob has A:40, B:60.
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_B, songB: SONG_A, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      // B was 60, A was 40. Now A is preferred.
      // A: 40 + 10 = 50
      // B: 60 - 10 = 50
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 50, "✅ SONG_A score should be 50.");
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B)?.score, 50, "✅ SONG_B score should be 50.");
      console.log(`Result: Bob's adjusted rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    });

    await test.step("Effects: Score clamping (min and max scores)", async () => {
      console.log("\nAction: Pushing SONG_A's score to max (100) for Alice and SONG_D to min (0).");
      // Alice has SONG_A at 70 from principle test (after 2nd comparison, before remove). Max is 100.
      // Re-initialize Alice's ranking for clarity, let's say A=70, C=50
      // Alice (from previous tests) has A:70, C:50. Let's add D, so A:70, C:50, D:50 (default)
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 70+10 = 80, D: 50-10 = 40
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 80+10 = 90, D: 40-10 = 30
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 90+10 = 100, D: 30-10 = 20
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100+10 = 100 (clamped), D: 20-10 = 10
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100 (clamped), D: 10-10 = 0
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100 (clamped), D: 0 (clamped)
      let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 100, "✅ SONG_A score should be clamped at MAX_SCORE (100).");
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_D)?.score, 0, "✅ SONG_D score should be clamped at MIN_SCORE (0).");
      console.log(`Result: Alice's scores clamped - A: ${aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score}, D: ${aliceRankings.rankedSongs.find(rs => rs.songId === SONG_D)?.score}`);
    });
    console.log("--- addComparison tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    // Setup for removal tests
    console.log("\n--- Testing remove requirements and effects ---");
    console.log("Setup: Alice ranks A, B, C.");
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A }); // A:60, B:40
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_C, songB: SONG_A, preferred: SONG_C }); // C:60, A:50, B:40
    let currentAliceRankings = (await rankingConcept._getRankings({ user: USER_ALICE})) as any;
    console.log(`Setup Complete. Alice's rankings: ${JSON.stringify(currentAliceRankings.rankedSongs)}`);


    await test.step("Requires: user exists in the concept state", async () => {
      console.log("Action: Attempt to remove song for a non-existent user.");
      const result = await rankingConcept.remove({ user: "user:NonExistent" as ID, song: SONG_A });
      assertEquals("error" in result, true, "✅ Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.", "✅ Specific error message for non-existent user.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Requires: song exists in the RankedSong set for the given user", async () => {
      console.log(`Action: Attempt to remove non-existent song ${SONG_D} for Alice.`);
      const result = await rankingConcept.remove({ user: USER_ALICE, song: SONG_D });
      assertEquals("error" in result, true, "✅ Should return an error if song is not in user's ranking.");
      assertEquals((result as { error: string }).error, `SongId '${SONG_D}' not found in user's ranking.`, "✅ Specific error message for non-existent song.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: deletes song from the user's RankedSong set", async () => {
      console.log(`Action: Alice removes ${SONG_B}.`);
      await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 2, "✅ After removal, only 2 songs should remain.");
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), undefined, `✅ ${SONG_B} should be gone.`);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A), undefined, `✅ ${SONG_A} should still exist.`);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_C), undefined, `✅ ${SONG_C} should still exist.`);
      console.log(`Result: Alice's rankings after removing ${SONG_B}: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    });
    console.log("--- remove tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getRankings requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: user exists in the concept state", async () => {
      console.log("\n--- Testing _getRankings requirements and effects ---");
      console.log("Action: Attempt to get rankings for a non-existent user.");
      const result = await rankingConcept._getRankings({ user: "user:NonExistent" as ID });
      assertEquals("error" in result, true, "✅ Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.", "✅ Specific error message.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: returns current RankedSong entries, ordered by score (descending)", async () => {
      console.log("\nAction: Add several comparisons for Alice to establish a ranking order.");
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A }); // A:60, B:40
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_B }); // B:50, C:40, A:60
      // Current scores: A:60, B:50, C:40
      // Expected order: A, B, C

      console.log("Action: Get Alice's rankings.");
      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Should return all ranked songs.");
      assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "✅ Highest score song first.");
      assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, "✅ Second highest score song second.");
      assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C, "✅ Lowest score song last.");
      console.log(`Result: Alice's rankings (ordered): ${JSON.stringify(aliceRankings.rankedSongs)}`);
    });
    console.log("--- _getRankings tests completed ---");
  } finally {
    await client.close();
  }
});
```

# trace: Ranking Principle

The following trace demonstrates how the **principle** of the `Ranking` concept is fulfilled by a sequence of actions.

1.  **Given**: A user `USER_ALICE` and several songs (`SONG_A`, `SONG_B`, `SONG_C`).
2.  **Initial State**: User Alice has no initial rankings.
    ```
    Ranking._getRankings({ user: "user:Alice" })
    ```
3.  **Result**: Returns an error indicating no ranking found for `USER_ALICE`. ✅
    ```
    { error: "User ranking not found for the given user." }
    ```
4.  **Action**: `USER_ALICE` compares `SONG_A` and `SONG_B`, preferring `SONG_A`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:Wonderwall", songB: "song:BohemianRhapsody", preferred: "song:Wonderwall" })
    ```
5.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 60), `SONG_B` (score: 40). ✅
6.  **Action**: `USER_ALICE` compares `SONG_A` and `SONG_C`, preferring `SONG_A`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:Wonderwall", songB: "song:StairwayToHeaven", preferred: "song:Wonderwall" })
    ```
7.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 70), `SONG_B` (score: 40), `SONG_C` (score: 40). ✅
8.  **Action**: `USER_ALICE` compares `SONG_B` and `SONG_C`, preferring `SONG_C`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:BohemianRhapsody", songB: "song:StairwayToHeaven", preferred: "song:StairwayToHeaven" })
    ```
9.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 70), `SONG_C` (score: 50), `SONG_B` (score: 30). The order dynamically reflects these scores. ✅
10. **Action**: `USER_ALICE` views her personalized ranked list.
    ```
    Ranking._getRankings({ user: "user:Alice" })
    ```
11. **Result**: The system returns the `RankedSong` entries for `USER_ALICE`, ordered by `score` (descending): `SONG_A`, `SONG_C`, `SONG_B`. This fulfills the principle by allowing the user to view their dynamically adjusted personalized list. ✅

# prompt: Action: addComparison requirements and effects ... Effects: Adjusts scores correctly (preferred increases, other decreases) => ./src/concepts/Ranking/RankingConcept.test.ts:129:16
error: AssertionError: Values are not equal: ✅ SONG_A score should be 50.


    [Diff] Actual / Expected


-   70
+   50

  throw new AssertionError(message);
        ^
    at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
    at file:///Users/cameronholt/Documents/git_repos/61040-fa25-assignment-4/src/concepts/Ranking/RankingConcept.test.ts:137:7
    at eventLoopTick (ext:core/01_core.js:179:7)
    at async innerWrapped (ext:cli/40_test.js:181:5)
    at async exitSanitizer (ext:cli/40_test.js:97:27)
    at async Object.outerWrapped [as fn] (ext:cli/40_test.js:124:14)
    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///Users/cameronholt/Documents/git_repos/61040-fa25-assignment-4/src/concepts/Ranking/RankingConcept.test.ts:129:5
# response:

# LikertSurvey Implementation and Test

# concept: LikertSurvey

*   **concept**: LikertSurvey \[Author, Respondent]
*   **purpose**: To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
*   **principle**: If an author creates a survey with several questions on a 1-5 scale, and a respondent submits their answers to those questions, then the author can view the collected responses to analyze the respondent's opinions.
*   **state**:
    *   A set of `Surveys` with
        *   an `author` of type `Author`
        *   a `title` of type `String`
        *   a `scaleMin` of type `Number`
        *   a `scaleMax` of type `Number`
    *   A set of `Questions` with
        *   a `survey` of type `Survey`
        *   a `text` of type `String`
    *   A set of `Responses` with
        *   a `respondent` of type `Respondent`
        *   a `question` of type `Question`
        *   a `value` of type `Number`
*   **actions**:
    *   `createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)`
        *   **requires**: `scaleMin < scaleMax`
        *   **effects**: Creates a new survey with the given author, title, and scale.
    *   `addQuestion (survey: Survey, text: String): (question: Question)`
        *   **requires**: The survey must exist.
        *   **effects**: Adds a new question to the specified survey.
    *   `submitResponse (respondent: Respondent, question: Question, value: Number)`
        *   **requires**: The question must exist. The respondent must not have already submitted a response for this question. The value must be within the survey's scale.
        *   **effects**: Records the respondent's answer for the given question.
    *   `updateResponse (respondent: Respondent, question: Question, value: Number)`
        *   **requires**: The question must exist. The respondent must have already submitted a response for this question. The value must be within the survey's scale.
        *   **effects**: Updates the respondent's existing answer for the given question.

# file: src/likertsurvey/LikertSurveyConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "LikertSurvey" + ".";

// Generic types for the concept's external dependencies
type Author = ID;
type Respondent = ID;

// Internal entity types, represented as IDs
type Survey = ID;
type Question = ID;
type Response = ID;

/**
 * State: A set of Surveys with an author, title, and scale.
 */
interface SurveyDoc {
  _id: Survey; // MongoDB _id
  author: Author;
  title: string;
  scaleMin: number;
  scaleMax: number;
}

/**
 * State: A set of Questions, each linked to a survey and containing text.
 */
interface QuestionDoc {
  _id: Question; // MongoDB _id
  survey: Survey;
  text: string;
}

/**
 * State: A set of Responses, linking a respondent, a question, and their chosen value.
 */
interface ResponseDoc {
  _id: Response; // MongoDB _id
  respondent: Respondent;
  question: Question;
  value: number;
}

/**
 * @concept LikertSurvey
 * @purpose To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
 */
export default class LikertSurveyConcept {
  surveys: Collection<SurveyDoc>;
  questions: Collection<QuestionDoc>;
  responses: Collection<ResponseDoc>;

  constructor(private readonly db: Db) {
    this.surveys = this.db.collection(PREFIX + "surveys");
    this.questions = this.db.collection(PREFIX + "questions");
    this.responses = this.db.collection(PREFIX + "responses");
  }

  /**
   * Action: Creates a new survey.
   * @requires scaleMin must be less than scaleMax.
   * @effects A new survey is created and its ID is returned.
   */
  async createSurvey({ author, title, scaleMin, scaleMax }: { author: Author; title: string; scaleMin: number; scaleMax: number }): Promise<{ survey: Survey } | { error: string }> {
    if (scaleMin >= scaleMax) {
      return { error: "scaleMin must be less than scaleMax" };
    }

    const surveyId = freshID() as Survey;
    await this.surveys.insertOne({ _id: surveyId, author, title, scaleMin, scaleMax });
    return { survey: surveyId };
  }

  /**
   * Action: Adds a new question to an existing survey.
   * @requires The survey must exist.
   * @effects A new question is created and its ID is returned.
   */
  async addQuestion({ survey, text }: { survey: Survey; text: string }): Promise<{ question: Question } | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }

    const questionId = freshID() as Question;
    await this.questions.insertOne({ _id: questionId, survey, text });
    return { question: questionId };
  }

  /**
   * Action: Submits a response to a question.
   * @requires The question must exist.
   * @requires The respondent must not have already responded to this question.
   * @requires The response value must be within the survey's defined scale.
   * @effects A new response is recorded in the state.
   */
  async submitResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      // This indicates a data integrity issue but is a good safeguard.
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const existingResponse = await this.responses.findOne({ respondent, question });
    if (existingResponse) {
      return { error: "Respondent has already answered this question. Use updateResponse to change it." };
    }

    const responseId = freshID() as Response;
    await this.responses.insertOne({ _id: responseId, respondent, question, value });

    return {};
  }

  /**
   * Action: Updates an existing response to a question.
   * @requires The question must exist.
   * @requires A response from the given respondent to the question must already exist.
   * @requires The new response value must be within the survey's defined scale.
   * @effects The existing response's value is updated.
   */
  async updateResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const result = await this.responses.updateOne({ respondent, question }, { $set: { value } });

    if (result.matchedCount === 0) {
      return { error: "No existing response found to update. Use submitResponse to create one." };
    }

    return {};
  }

  /**
   * Query: Retrieves all questions associated with a specific survey.
   * @requires The survey must exist.
   * @effects Returns an array of QuestionDoc objects for the survey, or an error if the survey does not exist.
   */
  async _getSurveyQuestions({ survey }: { survey: Survey }): Promise<QuestionDoc[] | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }
    return await this.questions.find({ survey }).toArray();
  }

  /**
   * Query: Retrieves all responses for a given survey. This involves finding all
   * questions for the survey first, then finding all responses to those questions.
   * @requires The survey must exist.
   * @effects Returns an array of ResponseDoc objects for the survey, or an error if the survey does not exist.
   */
  async _getSurveyResponses({ survey }: { survey: Survey }): Promise<ResponseDoc[] | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }
    const surveyQuestions = await this.questions.find({ survey }).project({ _id: 1 }).toArray();
    const questionIds = surveyQuestions.map((q) => q._id as Question);
    if (questionIds.length === 0) {
      return []; // No questions, so no responses
    }
    return await this.responses.find({ question: { $in: questionIds } }).toArray();
  }

  /**
   * Query: Retrieves all answers submitted by a specific respondent.
   * @effects Returns an array of ResponseDoc objects from the respondent.
   */
  async _getRespondentAnswers({ respondent }: { respondent: Respondent }): Promise<ResponseDoc[]> {
    return await this.responses.find({ respondent }).toArray();
  }
}
```

# file: src/likertsurvey/LikertSurveyConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LikertSurveyConcept from "./LikertSurveyConcept.ts";

const authorA = "author:Alice" as ID;
const respondentB = "respondent:Bob" as ID;
const respondentC = "respondent:Charlie" as ID;

Deno.test("Principle: Author creates survey, respondent answers, author views results", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("--- Starting LikertSurvey Principle Test ---");

    // 1. Author creates a survey with a 1-5 scale
    console.log("Action: Author creates a survey 'Customer Satisfaction' (scale 1-5).");
    const createSurveyResult = await surveyConcept.createSurvey({ author: authorA, title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 });
    assertEquals("error" in createSurveyResult, false, `✅ Survey creation should not fail. Error: ${JSON.stringify(createSurveyResult)}`);
    const { survey } = createSurveyResult as { survey: ID };
    assertExists(survey, "✅ Survey ID should be returned.");
    console.log(`Result: Survey created with ID: ${survey}`);

    // 2. Author adds several questions
    console.log("Action: Author adds question 1: 'How satisfied are you...?'");
    const addQ1Result = await surveyConcept.addQuestion({ survey, text: "How satisfied are you with our product?" });
    assertEquals("error" in addQ1Result, false, `✅ Adding question 1 should not fail. Error: ${JSON.stringify(addQ1Result)}`);
    const { question: q1 } = addQ1Result as { question: ID };
    assertExists(q1, "✅ Question 1 ID should be returned.");
    console.log(`Result: Question 1 added with ID: ${q1}`);

    console.log("Action: Author adds question 2: 'How likely are you...?'");
    const addQ2Result = await surveyConcept.addQuestion({ survey, text: "How likely are you to recommend us?" });
    assertEquals("error" in addQ2Result, false, `✅ Adding question 2 should not fail. Error: ${JSON.stringify(addQ2Result)}`);
    const { question: q2 } = addQ2Result as { question: ID };
    assertExists(q2, "✅ Question 2 ID should be returned.");
    console.log(`Result: Question 2 added with ID: ${q2}`);

    const questions = await surveyConcept._getSurveyQuestions({ survey }) as { error?: string } & any[];
    assertEquals("error" in questions, false, `✅ Getting survey questions should not fail. Error: ${JSON.stringify(questions)}`);
    assertEquals(questions.length, 2, "✅ There should be two questions in the survey.");
    console.log(`Verification: Survey has ${questions.length} questions.`);

    // 3. A respondent submits their answers to those questions
    console.log(`Action: Respondent Bob submits response 5 for question ${q1}.`);
    const submitR1Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q1, value: 5 });
    assertEquals("error" in submitR1Result, false, `✅ Submitting response 1 should succeed. Error: ${JSON.stringify(submitR1Result)}`);
    console.log("Result: Response 1 submitted successfully.");

    console.log(`Action: Respondent Bob submits response 4 for question ${q2}.`);
    const submitR2Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q2, value: 4 });
    assertEquals("error" in submitR2Result, false, `✅ Submitting response 2 should succeed. Error: ${JSON.stringify(submitR2Result)}`);
    console.log("Result: Response 2 submitted successfully.");

    // 4. The author can view the collected responses
    console.log("\nAction: Author queries for collected responses for the survey.");
    const surveyResponses = await surveyConcept._getSurveyResponses({ survey }) as { error?: string } & any[];
    assertEquals("error" in surveyResponses, false, `✅ Getting survey responses should not fail. Error: ${JSON.stringify(surveyResponses)}`);
    assertEquals(surveyResponses.length, 2, "✅ There should be two responses for the survey.");
    assertEquals(surveyResponses.find((r) => r.question === q1)?.value, 5, "✅ Response for Q1 should be 5.");
    assertEquals(surveyResponses.find((r) => r.question === q2)?.value, 4, "✅ Response for Q2 should be 4.");
    console.log(`Verification: Survey responses collected: ${JSON.stringify(surveyResponses)}`);

    console.log("\nAction: Author queries for Bob's answers.");
    const respondentAnswers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(respondentAnswers.length, 2, "✅ The respondent should have two answers recorded.");
    console.log(`Verification: Bob's answers: ${JSON.stringify(respondentAnswers)}`);

    console.log("--- LikertSurvey Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSurvey requires scaleMin < scaleMax", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing createSurvey requirements ---");
    console.log("Action: Attempt to create survey with scaleMin > scaleMax.");
    const invalidResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 1", scaleMin: 5, scaleMax: 1 });
    assertEquals("error" in invalidResult, true, "✅ Should fail when scaleMin > scaleMax.");
    console.log(`Result: Expected error caught: ${(invalidResult as { error: string }).error}`);

    console.log("Action: Attempt to create survey with scaleMin == scaleMax.");
    const equalResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 2", scaleMin: 3, scaleMax: 3 });
    assertEquals("error" in equalResult, true, "✅ Should fail when scaleMin == scaleMax.");
    console.log(`Result: Expected error caught: ${(equalResult as { error: string }).error}`);
    console.log("--- createSurvey requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addQuestion requires an existing survey", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  const nonExistentSurveyId = "survey:fake" as ID;

  try {
    console.log("\n--- Testing addQuestion requirements ---");
    console.log(`Action: Attempt to add question to non-existent survey '${nonExistentSurveyId}'.`);
    const result = await surveyConcept.addQuestion({ survey: nonExistentSurveyId, text: "This will fail" });
    assertEquals("error" in result, true, "✅ Adding a question to a non-existent survey should fail.");
    console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    console.log("--- addQuestion requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: submitResponse requirements are enforced", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing submitResponse requirements ---");
    // Setup a valid survey and question
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    console.log(`Setup: Survey '${survey}' and Question '${question}' created.`);

    // Requires: question must exist
    const nonExistentQuestionId = "question:fake" as ID;
    console.log(`Action: Attempt to submit response to non-existent question '${nonExistentQuestionId}'.`);
    const res1 = await surveyConcept.submitResponse({ respondent: respondentB, question: nonExistentQuestionId, value: 3 });
    assertEquals("error" in res1, true, "✅ Submitting a response to a non-existent question should fail.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: respondent must not have already submitted a response
    console.log(`Action: Respondent Bob submits first response to question '${question}'.`);
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 }); // First submission is OK
    console.log(`Result: First response successful. Value: 3`);

    console.log(`Action: Respondent Bob attempts to submit second response to question '${question}'.`);
    const res2 = await surveyConcept.submitResponse({ respondent: respondentB, question, value: 4 }); // Second submission fails
    assertEquals("error" in res2, true, "✅ Submitting a response twice for the same question should fail.");
    assertEquals((res2 as { error: string }).error, "Respondent has already answered this question. Use updateResponse to change it.", "✅ Specific error message for double submission.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Charlie submits value 0 (below min scale) for question '${question}'.`);
    const res3 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 0 }); // Below min
    assertEquals("error" in res3, true, "✅ Submitting a value below the minimum scale should fail.");
    console.log(`Result: Expected error caught: ${(res3 as { error: string }).error}`);

    console.log(`Action: Respondent Charlie submits value 6 (above max scale) for question '${question}'.`);
    const res4 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 6 }); // Above max
    assertEquals("error" in res4, true, "✅ Submitting a value above the maximum scale should fail.");
    console.log(`Result: Expected error caught: ${(res4 as { error: string }).error}`);
    console.log("--- submitResponse requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateResponse successfully updates a response and enforces requirements", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  try {
    console.log("\n--- Testing updateResponse actions and requirements ---");
    // Setup
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 });
    console.log(`Setup: Survey '${survey}', Question '${question}' created. Respondent Bob submitted initial response '3'.`);

    // Requires: A response must already exist to be updated
    console.log(`Action: Attempt to update response for Respondent Charlie (no existing response).`);
    const res1 = await surveyConcept.updateResponse({ respondent: respondentC, question, value: 4 });
    assertEquals("error" in res1, true, "✅ Updating a non-existent response should fail.");
    assertEquals((res1 as { error: string }).error, "No existing response found to update. Use submitResponse to create one.", "✅ Specific error message for no existing response.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Bob attempts to update response with value 6 (outside scale).`);
    const res2 = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 6 });
    assertEquals("error" in res2, true, "✅ Updating with a value outside the scale should fail.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Successful update
    console.log(`Action: Respondent Bob successfully updates response for question '${question}' to value 5.`);
    const successResult = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 5 });
    assertEquals("error" in successResult, false, "✅ A valid update should succeed.");
    console.log("Result: Update successful.");

    // Verify the update
    console.log("Verification: Querying Bob's answers to confirm update.");
    const answers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(answers.length, 1, "✅ There should still be only one answer.");
    assertEquals(answers[0].value, 5, "✅ The answer's value should be updated to 5.");
    console.log(`Verification: Bob's updated answer: ${JSON.stringify(answers[0])}`);
    console.log("--- updateResponse tests completed ---");
  } finally {
    await client.close();
  }
});
```

# trace: LikertSurvey Principle

The following trace demonstrates how the **principle** of the `LikertSurvey` concept is fulfilled by a sequence of actions.

1.  **Given**: An author `authorA` and a respondent `respondentB`.
2.  **Action**: The author creates a new survey.
    ```
    LikertSurvey.createSurvey({ author: "authorA", title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 })
    ```
3.  **Result**: A new survey is created, and its ID is returned. ✅
    ```
    { survey: "survey1" }
    ```
4.  **Action**: The author adds two questions to the survey.
    ```
    LikertSurvey.addQuestion({ survey: "survey1", text: "How satisfied are you...?" })
    LikertSurvey.addQuestion({ survey: "survey1", text: "How likely are you...?" })
    ```
5.  **Result**: Two new questions are created, and their IDs are returned. ✅
    ```
    { question: "q1" }
    { question: "q2" }
    ```
6.  **Action**: The respondent submits their answers to both questions.
    ```
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q1", value: 5 })
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q2", value: 4 })
    ```
7.  **Result**: The responses are successfully recorded. ✅
    ```
    {}
    {}
    ```
8.  **Action**: The author queries for all responses to their survey to analyze the results.
    ```
    LikertSurvey._getSurveyResponses({ survey: "survey1" })
    ```
9.  **Result**: The state reflects the submitted responses, fulfilling the concept's purpose. ✅
    ```
    [
      { _id: ..., respondent: "respondentB", question: "q1", value: 5 },
      { _id: ..., respondent: "respondentB", question: "q2", value: 4 }
    ]
    ```

# Ranking Implementation and Test

# concept: Ranking \[User, SongId]

**purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.
**principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10) and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

**state**
a map from `User` to `UserRanking`
a `UserRanking` is a set of `RankedSong`
a `RankedSong` with
a `songId` SongId
a `score` Number

**actions**
`addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId)`
**requires** user exists in the concept state, or a new ranking can be created for them
**requires** preferred is either songA or songB
**effects**
\- If the `user` does not have a `UserRanking`, an empty one is created for them.
\- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
\- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

`remove (user: User, song: SongId)`
**requires** user exists in the concept state
**requires** song exists in the `RankedSong` set for the given `user`
**effects** deletes `song` from the `user`'s `RankedSong` set.

**queries**
`getRankings (user: User) : (rankedSongs: RankedSong[])`
**requires** user exists in the concept state (has a ranking)
**effects** returns the current `RankedSong` entries for the `user`, ordered by `score`.

# file: src/Ranking/RankingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
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

    // Note: rankedSong_paramA corresponds to the 'songA' argument in the function call,
    // and rankedSong_paramB corresponds to the 'songB' argument.
    const rankedSong_paramA = getOrCreateRankedSong(songA);
    const rankedSong_paramB = getOrCreateRankedSong(songB);

    // Identify which actual RankedSong object is the preferred one and which is the other.
    let preferredRankedSong: RankedSong;
    let otherRankedSong: RankedSong;

    if (preferred === songA) {
      preferredRankedSong = rankedSong_paramA;
      otherRankedSong = rankedSong_paramB;
    } else { // preferred === songB
      preferredRankedSong = rankedSong_paramB;
      otherRankedSong = rankedSong_paramA;
    }

    // Adjust scores
    preferredRankedSong.score = Math.min(
      this.MAX_SCORE,
      preferredRankedSong.score + this.SCORE_ADJUSTMENT,
    );
    otherRankedSong.score = Math.max(
      this.MIN_SCORE,
      otherRankedSong.score - this.SCORE_ADJUSTMENT,
    );

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

# file: src/Ranking/RankingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import RankingConcept from "./RankingConcept.ts";

const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const SONG_A = "song:Wonderwall" as ID;
const SONG_B = "song:BohemianRhapsody" as ID;
const SONG_C = "song:StairwayToHeaven" as ID;
const SONG_D = "song:HotelCalifornia" as ID;

Deno.test("Principle: User ranks songs, scores adjust dynamically, and rankings are viewable", async () => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    console.log("--- Starting Ranking Principle Test ---");

    // Initial state check for user Alice
    const initialRankings = await rankingConcept._getRankings({ user: USER_ALICE });
    assertEquals("error" in initialRankings, true, "✅ Alice should not have rankings initially.");
    console.log(`User Alice has no rankings initially: ${JSON.stringify(initialRankings)}`);

    // 1. User Alice listens to songs and makes comparisons.
    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
    let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 1st comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "✅ Alice should have 2 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} should be ranked higher.`);
    assertEquals(aliceRankings.rankedSongs[0].score, 60, `✅ ${SONG_A} score should be 60.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, `✅ ${SONG_B} should be ranked lower.`);
    assertEquals(aliceRankings.rankedSongs[1].score, 40, `✅ ${SONG_B} score should be 40.`);

    console.log(`\nAction: Alice compares ${SONG_A} vs ${SONG_C}, prefers ${SONG_A}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_C, preferred: SONG_A });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 2nd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Alice should have 3 ranked songs.");
    // Check scores and order
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} should be highest.`); // (60 + 10 = 70)
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score should be 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, `✅ ${SONG_B} should be middle.`); // score 40, no change, order preserved due to B > C default score then B > C final score
    assertEquals(aliceRankings.rankedSongs[1].score, 40, `✅ ${SONG_B} score should be 40.`);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C, `✅ ${SONG_C} should be lowest.`); // (50 - 10 = 40)
    assertEquals(aliceRankings.rankedSongs[2].score, 40, `✅ ${SONG_C} score should be 40.`);

    console.log(`\nAction: Alice compares ${SONG_B} vs ${SONG_C}, prefers ${SONG_C}.`);
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_C });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after 3rd comparison: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Alice should still have 3 ranked songs.");
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} remains highest.`); // score 70, no change
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score is 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C, `✅ ${SONG_C} is now middle.`); // (40 + 10 = 50) - now higher than B
    assertEquals(aliceRankings.rankedSongs[1].score, 50, `✅ ${SONG_C} score is 50.`);
    assertEquals(aliceRankings.rankedSongs[2].songId, SONG_B, `✅ ${SONG_B} is now lowest.`); // (40 - 10 = 30) - now lower than C
    assertEquals(aliceRankings.rankedSongs[2].score, 30, `✅ ${SONG_B} score is 30.`);

    // 2. Another user Bob also ranks songs.
    console.log(`\nAction: Bob compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_B}.`);
    await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_B });
    let bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Bob's rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    assertEquals(bobRankings.rankedSongs.length, 2, "✅ Bob should have 2 ranked songs.");
    assertEquals(bobRankings.rankedSongs[0].songId, SONG_B, `✅ ${SONG_B} should be ranked higher for Bob.`);
    assertEquals(bobRankings.rankedSongs[0].score, 60, `✅ ${SONG_B} score should be 60 for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].songId, SONG_A, `✅ ${SONG_A} should be ranked lower for Bob.`);
    assertEquals(bobRankings.rankedSongs[1].score, 40, `✅ ${SONG_A} score should be 40 for Bob.`);

    // Verify Alice's rankings are untouched
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "✅ Alice's top song should still be A.");
    assertEquals(aliceRankings.rankedSongs[0].score, 70, "✅ Alice's A score should be unchanged.");
    console.log("Confirmed Alice's rankings are independent of Bob's actions. ✅");

    // 3. Alice removes a song.
    console.log(`\nAction: Alice removes ${SONG_B} from her rankings.`);
    await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Alice's rankings after removing ${SONG_B}: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    assertEquals(aliceRankings.rankedSongs.length, 2, "✅ Alice should now have 2 ranked songs.");
    assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), undefined, `✅ ${SONG_B} should be removed.`);
    assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A), undefined, `✅ ${SONG_A} should still exist.`);
    assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_C), undefined, `✅ ${SONG_C} should still exist.`);
    assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, `✅ ${SONG_A} remains top.`);
    assertEquals(aliceRankings.rankedSongs[0].score, 70, `✅ ${SONG_A} score is 70.`);
    assertEquals(aliceRankings.rankedSongs[1].songId, SONG_C, `✅ ${SONG_C} is second.`);
    assertEquals(aliceRankings.rankedSongs[1].score, 50, `✅ ${SONG_C} score is 50.`);

    console.log("--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addComparison requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: preferred must be songA or songB", async () => {
      console.log("\n--- Testing addComparison requirements and effects ---");
      console.log("Action: Attempt to add comparison where preferred is neither songA nor songB.");
      const result = await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_C });
      assertEquals("error" in result, true, "✅ Should return an error if preferred is not songA or songB.");
      assertEquals((result as { error: string }).error, "Preferred song must be either songA or songB.", "✅ Specific error message.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: Creates new user ranking if none exists", async () => {
      console.log("\nAction: Add comparison for a new user, expecting ranking to be created.");
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const userRanking = await rankingConcept._getRankings({ user: USER_ALICE });
      assertNotEquals("error" in userRanking, true, "✅ User ranking should now exist.");
      console.log(`Result: User ranking created for ${USER_ALICE}.`);
    });

    await test.step("Effects: Adds new songs with default score", async () => {
      console.log("\nAction: Add comparison for another new user, checking default scores.");
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_A, songB: SONG_B, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A && rs.score === 60), "✅ SONG_A should have score 60.");
      assertExists(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B && rs.score === 40), "✅ SONG_B should have score 40.");
      console.log(`Result: Bob's initial rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    });

    await test.step("Effects: Adjusts scores correctly (preferred increases, other decreases)", async () => {
      console.log("\nAction: Bob compares B vs A, prefers A. (A:60, B:40 before from previous step)");
      // Bob has A:60, B:40 from the previous step.
      await rankingConcept.addComparison({ user: USER_BOB, songA: SONG_B, songB: SONG_A, preferred: SONG_A });
      const bobRankings = await rankingConcept._getRankings({ user: USER_BOB }) as { rankedSongs: { songId: ID; score: number }[] };
      // Expected scores: A preferred -> A increases, B decreases.
      // A: 60 + 10 = 70
      // B: 40 - 10 = 30
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 70, "✅ SONG_A score should be 70.");
      assertEquals(bobRankings.rankedSongs.find(rs => rs.songId === SONG_B)?.score, 30, "✅ SONG_B score should be 30.");
      console.log(`Result: Bob's adjusted rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    });

    await test.step("Effects: Score clamping (min and max scores)", async () => {
      console.log("\nAction: Pushing SONG_A's score to max (100) for Alice and SONG_D to min (0).");
      // Alice has SONG_A at 70, SONG_C at 50 from principle test (after 3rd comparison).
      // Let's add SONG_D with default 50.
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 70+10 = 80, D: 50-10 = 40
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 80+10 = 90, D: 40-10 = 30
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 90+10 = 100, D: 30-10 = 20
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100+10 = 100 (clamped), D: 20-10 = 10
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100 (clamped), D: 10-10 = 0
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_D, preferred: SONG_A }); // A: 100 (clamped), D: 0 (clamped)
      let aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score, 100, "✅ SONG_A score should be clamped at MAX_SCORE (100).");
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_D)?.score, 0, "✅ SONG_D score should be clamped at MIN_SCORE (0).");
      console.log(`Result: Alice's scores clamped - A: ${aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A)?.score}, D: ${aliceRankings.rankedSongs.find(rs => rs.songId === SONG_D)?.score}`);
    });
    console.log("--- addComparison tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    // Setup for removal tests
    console.log("\n--- Testing remove requirements and effects ---");
    console.log("Setup: Alice ranks A, B, C.");
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A }); // A:60, B:40
    await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_C, songB: SONG_A, preferred: SONG_C }); // C:60, A:50, B:40
    let currentAliceRankings = (await rankingConcept._getRankings({ user: USER_ALICE})) as any;
    console.log(`Setup Complete. Alice's rankings: ${JSON.stringify(currentAliceRankings.rankedSongs)}`);


    await test.step("Requires: user exists in the concept state", async () => {
      console.log("Action: Attempt to remove song for a non-existent user.");
      const result = await rankingConcept.remove({ user: "user:NonExistent" as ID, song: SONG_A });
      assertEquals("error" in result, true, "✅ Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.", "✅ Specific error message for non-existent user.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Requires: song exists in the RankedSong set for the given user", async () => {
      console.log(`Action: Attempt to remove non-existent song ${SONG_D} for Alice.`);
      const result = await rankingConcept.remove({ user: USER_ALICE, song: SONG_D });
      assertEquals("error" in result, true, "✅ Should return an error if song is not in user's ranking.");
      assertEquals((result as { error: string }).error, `SongId '${SONG_D}' not found in user's ranking.`, "✅ Specific error message for non-existent song.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: deletes song from the user's RankedSong set", async () => {
      console.log(`Action: Alice removes ${SONG_B}.`);
      await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 2, "✅ After removal, only 2 songs should remain.");
      assertEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_B), undefined, `✅ ${SONG_B} should be gone.`);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_A), undefined, `✅ ${SONG_A} should still exist.`);
      assertNotEquals(aliceRankings.rankedSongs.find(rs => rs.songId === SONG_C), undefined, `✅ ${SONG_C} should still exist.`);
      console.log(`Result: Alice's rankings after removing ${SONG_B}: ${JSON.stringify(aliceRankings.rankedSongs)}`);
    });
    console.log("--- remove tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getRankings requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Requires: user exists in the concept state", async () => {
      console.log("\n--- Testing _getRankings requirements and effects ---");
      console.log("Action: Attempt to get rankings for a non-existent user.");
      const result = await rankingConcept._getRankings({ user: "user:NonExistent" as ID });
      assertEquals("error" in result, true, "✅ Should return an error if user ranking does not exist.");
      assertEquals((result as { error: string }).error, "User ranking not found for the given user.", "✅ Specific error message.");
      console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    });

    await test.step("Effects: returns current RankedSong entries, ordered by score (descending)", async () => {
      console.log("\nAction: Add several comparisons for Alice to establish a ranking order.");
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_A, songB: SONG_B, preferred: SONG_A }); // A:60, B:40
      await rankingConcept.addComparison({ user: USER_ALICE, songA: SONG_B, songB: SONG_C, preferred: SONG_B }); // B:50, C:40, A:60
      // Current scores: A:60, B:50, C:40
      // Expected order: A, B, C

      console.log("Action: Get Alice's rankings.");
      const aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(aliceRankings.rankedSongs.length, 3, "✅ Should return all ranked songs.");
      assertEquals(aliceRankings.rankedSongs[0].songId, SONG_A, "✅ Highest score song first.");
      assertEquals(aliceRankings.rankedSongs[1].songId, SONG_B, "✅ Second highest score song second.");
      assertEquals(aliceRankings.rankedSongs[2].songId, SONG_C, "✅ Lowest score song last.");
      console.log(`Result: Alice's rankings (ordered): ${JSON.stringify(aliceRankings.rankedSongs)}`);
    });
    console.log("--- _getRankings tests completed ---");
  } finally {
    await client.close();
  }
});
```

# trace: Ranking Principle

The following trace demonstrates how the **principle** of the `Ranking` concept is fulfilled by a sequence of actions.

1.  **Given**: A user `USER_ALICE` and several songs (`SONG_A`, `SONG_B`, `SONG_C`).
2.  **Initial State**: User Alice has no initial rankings.
    ```
    Ranking._getRankings({ user: "user:Alice" })
    ```
3.  **Result**: Returns an error indicating no ranking found for `USER_ALICE`. ✅
    ```
    { error: "User ranking not found for the given user." }
    ```
4.  **Action**: `USER_ALICE` compares `SONG_A` and `SONG_B`, preferring `SONG_A`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:Wonderwall", songB: "song:BohemianRhapsody", preferred: "song:Wonderwall" })
    ```
5.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 60), `SONG_B` (score: 40). ✅
6.  **Action**: `USER_ALICE` compares `SONG_A` and `SONG_C`, preferring `SONG_A`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:Wonderwall", songB: "song:StairwayToHeaven", preferred: "song:Wonderwall" })
    ```
7.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 70), `SONG_B` (score: 40), `SONG_C` (score: 40). ✅
8.  **Action**: `USER_ALICE` compares `SONG_B` and `SONG_C`, preferring `SONG_C`.
    ```
    Ranking.addComparison({ user: "user:Alice", songA: "song:BohemianRhapsody", songB: "song:StairwayToHeaven", preferred: "song:StairwayToHeaven" })
    ```
9.  **Result**: `USER_ALICE`'s ranking state is updated. `SONG_A` (score: 70), `SONG_C` (score: 50), `SONG_B` (score: 30). The order dynamically reflects these scores. ✅
10. **Action**: `USER_ALICE` views her personalized ranked list.
    ```
    Ranking._getRankings({ user: "user:Alice" })
    ```
11. **Result**: The system returns the `RankedSong` entries for `USER_ALICE`, ordered by `score` (descending): `SONG_A`, `SONG_C`, `SONG_B`. This fulfills the principle by allowing the user to view their dynamically adjusted personalized list. ✅