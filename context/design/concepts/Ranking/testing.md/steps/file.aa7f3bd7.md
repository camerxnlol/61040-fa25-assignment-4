---
timestamp: 'Tue Oct 14 2025 01:36:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_013633.07816230.md]]'
content_id: aa7f3bd7c8a4eb1bbfcacb185526d4524817590ccd701f0748b63f794d9be631
---

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
