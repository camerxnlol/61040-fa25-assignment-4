import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
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
    const initialRankings = await rankingConcept._getRankings({
      user: USER_ALICE,
    });
    assertEquals(
      "error" in initialRankings,
      true,
      "✅ Alice should not have rankings initially.",
    );
    console.log(
      `User Alice has no rankings initially: ${
        JSON.stringify(initialRankings)
      }`,
    );

    // 1. User Alice listens to songs and makes comparisons.
    console.log(
      `\nAction: Alice compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_A}.`,
    );
    await rankingConcept.addComparison({
      user: USER_ALICE,
      songA: SONG_A,
      songB: SONG_B,
      preferred: SONG_A,
    });
    let aliceRankings = await rankingConcept._getRankings({
      user: USER_ALICE,
    }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(
      `Alice's rankings after 1st comparison: ${
        JSON.stringify(aliceRankings.rankedSongs)
      }`,
    );
    assertEquals(
      aliceRankings.rankedSongs.length,
      2,
      "✅ Alice should have 2 ranked songs.",
    );
    assertEquals(
      aliceRankings.rankedSongs[0].songId,
      SONG_A,
      `✅ ${SONG_A} should be ranked higher.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[0].score,
      60,
      `✅ ${SONG_A} score should be 60.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].songId,
      SONG_B,
      `✅ ${SONG_B} should be ranked lower.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].score,
      40,
      `✅ ${SONG_B} score should be 40.`,
    );

    console.log(
      `\nAction: Alice compares ${SONG_A} vs ${SONG_C}, prefers ${SONG_A}.`,
    );
    await rankingConcept.addComparison({
      user: USER_ALICE,
      songA: SONG_A,
      songB: SONG_C,
      preferred: SONG_A,
    });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as {
      rankedSongs: { songId: ID; score: number }[];
    };
    console.log(
      `Alice's rankings after 2nd comparison: ${
        JSON.stringify(aliceRankings.rankedSongs)
      }`,
    );
    assertEquals(
      aliceRankings.rankedSongs.length,
      3,
      "✅ Alice should have 3 ranked songs.",
    );
    // Check scores and order
    assertEquals(
      aliceRankings.rankedSongs[0].songId,
      SONG_A,
      `✅ ${SONG_A} should be highest.`,
    ); // (60 + 10 = 70)
    assertEquals(
      aliceRankings.rankedSongs[0].score,
      70,
      `✅ ${SONG_A} score should be 70.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].songId,
      SONG_B,
      `✅ ${SONG_B} should be middle.`,
    ); // score 40, no change, order preserved due to B > C default score then B > C final score
    assertEquals(
      aliceRankings.rankedSongs[1].score,
      40,
      `✅ ${SONG_B} score should be 40.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[2].songId,
      SONG_C,
      `✅ ${SONG_C} should be lowest.`,
    ); // (50 - 10 = 40)
    assertEquals(
      aliceRankings.rankedSongs[2].score,
      40,
      `✅ ${SONG_C} score should be 40.`,
    );

    console.log(
      `\nAction: Alice compares ${SONG_B} vs ${SONG_C}, prefers ${SONG_C}.`,
    );
    await rankingConcept.addComparison({
      user: USER_ALICE,
      songA: SONG_B,
      songB: SONG_C,
      preferred: SONG_C,
    });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as {
      rankedSongs: { songId: ID; score: number }[];
    };
    console.log(
      `Alice's rankings after 3rd comparison: ${
        JSON.stringify(aliceRankings.rankedSongs)
      }`,
    );
    assertEquals(
      aliceRankings.rankedSongs.length,
      3,
      "✅ Alice should still have 3 ranked songs.",
    );
    assertEquals(
      aliceRankings.rankedSongs[0].songId,
      SONG_A,
      `✅ ${SONG_A} remains highest.`,
    ); // score 70, no change
    assertEquals(
      aliceRankings.rankedSongs[0].score,
      70,
      `✅ ${SONG_A} score is 70.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].songId,
      SONG_C,
      `✅ ${SONG_C} is now middle.`,
    ); // (40 + 10 = 50) - now higher than B
    assertEquals(
      aliceRankings.rankedSongs[1].score,
      50,
      `✅ ${SONG_C} score is 50.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[2].songId,
      SONG_B,
      `✅ ${SONG_B} is now lowest.`,
    ); // (40 - 10 = 30) - now lower than C
    assertEquals(
      aliceRankings.rankedSongs[2].score,
      30,
      `✅ ${SONG_B} score is 30.`,
    );

    // 2. Another user Bob also ranks songs.
    console.log(
      `\nAction: Bob compares ${SONG_A} vs ${SONG_B}, prefers ${SONG_B}.`,
    );
    await rankingConcept.addComparison({
      user: USER_BOB,
      songA: SONG_A,
      songB: SONG_B,
      preferred: SONG_B,
    });
    const bobRankings = await rankingConcept._getRankings({
      user: USER_BOB,
    }) as { rankedSongs: { songId: ID; score: number }[] };
    console.log(`Bob's rankings: ${JSON.stringify(bobRankings.rankedSongs)}`);
    assertEquals(
      bobRankings.rankedSongs.length,
      2,
      "✅ Bob should have 2 ranked songs.",
    );
    assertEquals(
      bobRankings.rankedSongs[0].songId,
      SONG_B,
      `✅ ${SONG_B} should be ranked higher for Bob.`,
    );
    assertEquals(
      bobRankings.rankedSongs[0].score,
      60,
      `✅ ${SONG_B} score should be 60 for Bob.`,
    );
    assertEquals(
      bobRankings.rankedSongs[1].songId,
      SONG_A,
      `✅ ${SONG_A} should be ranked lower for Bob.`,
    );
    assertEquals(
      bobRankings.rankedSongs[1].score,
      40,
      `✅ ${SONG_A} score should be 40 for Bob.`,
    );

    // Verify Alice's rankings are untouched
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as {
      rankedSongs: { songId: ID; score: number }[];
    };
    assertEquals(
      aliceRankings.rankedSongs[0].songId,
      SONG_A,
      "✅ Alice's top song should still be A.",
    );
    assertEquals(
      aliceRankings.rankedSongs[0].score,
      70,
      "✅ Alice's A score should be unchanged.",
    );
    console.log(
      "Confirmed Alice's rankings are independent of Bob's actions. ✅",
    );

    // 3. Alice removes a song.
    console.log(`\nAction: Alice removes ${SONG_B} from her rankings.`);
    await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
    aliceRankings = await rankingConcept._getRankings({ user: USER_ALICE }) as {
      rankedSongs: { songId: ID; score: number }[];
    };
    console.log(
      `Alice's rankings after removing ${SONG_B}: ${
        JSON.stringify(aliceRankings.rankedSongs)
      }`,
    );
    assertEquals(
      aliceRankings.rankedSongs.length,
      2,
      "✅ Alice should now have 2 ranked songs.",
    );
    assertEquals(
      aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_B),
      undefined,
      `✅ ${SONG_B} should be removed.`,
    );
    assertNotEquals(
      aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_A),
      undefined,
      `✅ ${SONG_A} should still exist.`,
    );
    assertNotEquals(
      aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_C),
      undefined,
      `✅ ${SONG_C} should still exist.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[0].songId,
      SONG_A,
      `✅ ${SONG_A} remains top.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[0].score,
      70,
      `✅ ${SONG_A} score is 70.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].songId,
      SONG_C,
      `✅ ${SONG_C} is second.`,
    );
    assertEquals(
      aliceRankings.rankedSongs[1].score,
      50,
      `✅ ${SONG_C} score is 50.`,
    );

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
      console.log(
        "Action: Attempt to add comparison where preferred is neither songA nor songB.",
      );
      const result = await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_B,
        preferred: SONG_C,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error if preferred is not songA or songB.",
      );
      assertEquals(
        (result as { error: string }).error,
        "Preferred song must be either songA or songB.",
        "✅ Specific error message.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Effects: Creates new user ranking if none exists", async () => {
      console.log(
        "\nAction: Add comparison for a new user, expecting ranking to be created.",
      );
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_B,
        preferred: SONG_A,
      });
      const userRanking = await rankingConcept._getRankings({
        user: USER_ALICE,
      });
      assertNotEquals(
        "error" in userRanking,
        true,
        "✅ User ranking should now exist.",
      );
      console.log(`Result: User ranking created for ${USER_ALICE}.`);
    });

    await test.step("Effects: Adds new songs with default score", async () => {
      console.log(
        "\nAction: Add comparison for another new user, checking default scores.",
      );
      await rankingConcept.addComparison({
        user: USER_BOB,
        songA: SONG_A,
        songB: SONG_B,
        preferred: SONG_A,
      });
      const bobRankings = await rankingConcept._getRankings({
        user: USER_BOB,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertExists(
        bobRankings.rankedSongs.find((rs) =>
          rs.songId === SONG_A && rs.score === 60
        ),
        "✅ SONG_A should have score 60.",
      );
      assertExists(
        bobRankings.rankedSongs.find((rs) =>
          rs.songId === SONG_B && rs.score === 40
        ),
        "✅ SONG_B should have score 40.",
      );
      console.log(
        `Result: Bob's initial rankings: ${
          JSON.stringify(bobRankings.rankedSongs)
        }`,
      );
    });

    await test.step("Effects: Adjusts scores correctly (preferred increases, other decreases)", async () => {
      console.log(
        "\nAction: Bob compares B vs A, prefers A. (A:60, B:40 before from previous step)",
      );
      // Bob has A:60, B:40 from the previous step.
      await rankingConcept.addComparison({
        user: USER_BOB,
        songA: SONG_B,
        songB: SONG_A,
        preferred: SONG_A,
      });
      const bobRankings = await rankingConcept._getRankings({
        user: USER_BOB,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      // Expected scores: A preferred -> A increases, B decreases.
      // A: 60 + 10 = 70
      // B: 40 - 10 = 30
      assertEquals(
        bobRankings.rankedSongs.find((rs) => rs.songId === SONG_A)?.score,
        70,
        "✅ SONG_A score should be 70.",
      );
      assertEquals(
        bobRankings.rankedSongs.find((rs) => rs.songId === SONG_B)?.score,
        30,
        "✅ SONG_B score should be 30.",
      );
      console.log(
        `Result: Bob's adjusted rankings: ${
          JSON.stringify(bobRankings.rankedSongs)
        }`,
      );
    });

    await test.step("Effects: Score clamping (min and max scores)", async () => {
      console.log(
        "\nAction: Pushing SONG_A's score to max (100) for Alice and SONG_D to min (0).",
      );
      // Alice has SONG_A at 70, SONG_C at 50 from principle test (after 3rd comparison).
      // Let's add SONG_D with default 50.
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 70+10 = 80, D: 50-10 = 40
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 80+10 = 90, D: 40-10 = 30
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 90+10 = 100, D: 30-10 = 20
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 100+10 = 100 (clamped), D: 20-10 = 10
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 100 (clamped), D: 10-10 = 0
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_D,
        preferred: SONG_A,
      }); // A: 100 (clamped), D: 0 (clamped)
      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_A)?.score,
        100,
        "✅ SONG_A score should be clamped at MAX_SCORE (100).",
      );
      assertEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_D)?.score,
        0,
        "✅ SONG_D score should be clamped at MIN_SCORE (0).",
      );
      console.log(
        `Result: Alice's scores clamped - A: ${
          aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_A)?.score
        }, D: ${
          aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_D)?.score
        }`,
      );
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
    await rankingConcept.addComparison({
      user: USER_ALICE,
      songA: SONG_A,
      songB: SONG_B,
      preferred: SONG_A,
    }); // A:60, B:40
    await rankingConcept.addComparison({
      user: USER_ALICE,
      songA: SONG_C,
      songB: SONG_A,
      preferred: SONG_C,
    }); // C:60, A:50, B:40
    const currentAliceRankings =
      (await rankingConcept._getRankings({ user: USER_ALICE })) as {
        rankedSongs: { songId: ID; score: number }[];
      };
    console.log(
      `Setup Complete. Alice's rankings: ${
        JSON.stringify(currentAliceRankings.rankedSongs)
      }`,
    );

    await test.step("Requires: user exists in the concept state", async () => {
      console.log("Action: Attempt to remove song for a non-existent user.");
      const result = await rankingConcept.remove({
        user: "user:NonExistent" as ID,
        song: SONG_A,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error if user ranking does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        "User ranking not found for the given user.",
        "✅ Specific error message for non-existent user.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Requires: song exists in the RankedSong set for the given user", async () => {
      console.log(
        `Action: Attempt to remove non-existent song ${SONG_D} for Alice.`,
      );
      const result = await rankingConcept.remove({
        user: USER_ALICE,
        song: SONG_D,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error if song is not in user's ranking.",
      );
      assertEquals(
        (result as { error: string }).error,
        `SongId '${SONG_D}' not found in user's ranking.`,
        "✅ Specific error message for non-existent song.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Effects: deletes song from the user's RankedSong set", async () => {
      console.log(`Action: Alice removes ${SONG_B}.`);
      await rankingConcept.remove({ user: USER_ALICE, song: SONG_B });
      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.length,
        2,
        "✅ After removal, only 2 songs should remain.",
      );
      assertEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_B),
        undefined,
        `✅ ${SONG_B} should be gone.`,
      );
      assertNotEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_A),
        undefined,
        `✅ ${SONG_A} should still exist.`,
      );
      assertNotEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_C),
        undefined,
        `✅ ${SONG_C} should still exist.`,
      );
      console.log(
        `Result: Alice's rankings after removing ${SONG_B}: ${
          JSON.stringify(aliceRankings.rankedSongs)
        }`,
      );
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
      const result = await rankingConcept._getRankings({
        user: "user:NonExistent" as ID,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error if user ranking does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        "User ranking not found for the given user.",
        "✅ Specific error message.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Effects: returns current RankedSong entries, ordered by score (descending)", async () => {
      console.log(
        "\nAction: Add several comparisons for Alice to establish a ranking order.",
      );
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_B,
        preferred: SONG_A,
      }); // A:60, B:40
      await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_B,
        songB: SONG_C,
        preferred: SONG_B,
      }); // B:50, C:40, A:60
      // Current scores: A:60, B:50, C:40
      // Expected order: A, B, C

      console.log("Action: Get Alice's rankings.");
      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.length,
        3,
        "✅ Should return all ranked songs.",
      );
      assertEquals(
        aliceRankings.rankedSongs[0].songId,
        SONG_A,
        "✅ Highest score song first.",
      );
      assertEquals(
        aliceRankings.rankedSongs[1].songId,
        SONG_B,
        "✅ Second highest score song second.",
      );
      assertEquals(
        aliceRankings.rankedSongs[2].songId,
        SONG_C,
        "✅ Lowest score song last.",
      );
      console.log(
        `Result: Alice's rankings (ordered): ${
          JSON.stringify(aliceRankings.rankedSongs)
        }`,
      );
    });
    console.log("--- _getRankings tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addComparison single song functionality", async (test) => {
  const [db, client] = await testDb();
  const rankingConcept = new RankingConcept(db);

  try {
    await test.step("Single song: Add first song to user's ranking", async () => {
      console.log("\n--- Testing single song addComparison functionality ---");
      console.log("Action: Add a single song to a new user's ranking.");
      const result = await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        preferred: SONG_A,
      });
      assertEquals(
        "error" in result,
        false,
        "✅ Should successfully add single song.",
      );
      console.log(`Result: Single song added successfully.`);

      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.length,
        1,
        "✅ User should have exactly 1 song.",
      );
      assertEquals(
        aliceRankings.rankedSongs[0].songId,
        SONG_A,
        "✅ Should be the added song.",
      );
      assertEquals(
        aliceRankings.rankedSongs[0].score,
        50,
        "✅ Should have default score (50).",
      );
      console.log(
        `Result: Alice's single song ranking: ${
          JSON.stringify(aliceRankings.rankedSongs)
        }`,
      );
    });

    await test.step("Single song: Error when preferred is not the song", async () => {
      console.log(
        "\nAction: Attempt to add single song with wrong preferred song.",
      );
      const result = await rankingConcept.addComparison({
        user: USER_BOB,
        songA: SONG_A,
        preferred: SONG_B,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error when preferred is not the song.",
      );
      assertEquals(
        (result as { error: string }).error,
        "When comparing a single song, preferred must be that song.",
        "✅ Specific error message.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Single song: Error when song already exists", async () => {
      console.log(
        "\nAction: Attempt to add the same song again to Alice's ranking.",
      );
      const result = await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        preferred: SONG_A,
      });
      assertEquals(
        "error" in result,
        true,
        "✅ Should return an error when song already exists.",
      );
      assertEquals(
        (result as { error: string }).error,
        "Song already exists in user's ranking.",
        "✅ Specific error message.",
      );
      console.log(
        `Result: Expected error caught: ${(result as { error: string }).error}`,
      );
    });

    await test.step("Single song: Add second song to existing ranking", async () => {
      console.log("\nAction: Add a second song to Alice's ranking.");
      const result = await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_B,
        preferred: SONG_B,
      });
      assertEquals(
        "error" in result,
        false,
        "✅ Should successfully add second song.",
      );
      console.log(`Result: Second song added successfully.`);

      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.length,
        2,
        "✅ User should now have 2 songs.",
      );
      assertEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_A)?.score,
        50,
        "✅ First song should still have default score.",
      );
      assertEquals(
        aliceRankings.rankedSongs.find((rs) => rs.songId === SONG_B)?.score,
        50,
        "✅ Second song should have default score.",
      );
      console.log(
        `Result: Alice's two-song ranking: ${
          JSON.stringify(aliceRankings.rankedSongs)
        }`,
      );
    });

    await test.step("Single song: Can then do comparisons between existing songs", async () => {
      console.log("\nAction: Compare the two songs Alice now has.");
      const result = await rankingConcept.addComparison({
        user: USER_ALICE,
        songA: SONG_A,
        songB: SONG_B,
        preferred: SONG_A,
      });
      assertEquals(
        "error" in result,
        false,
        "✅ Should successfully compare existing songs.",
      );
      console.log(`Result: Comparison successful.`);

      const aliceRankings = await rankingConcept._getRankings({
        user: USER_ALICE,
      }) as { rankedSongs: { songId: ID; score: number }[] };
      assertEquals(
        aliceRankings.rankedSongs.length,
        2,
        "✅ Should still have 2 songs.",
      );
      assertEquals(
        aliceRankings.rankedSongs[0].songId,
        SONG_A,
        "✅ Preferred song should be ranked higher.",
      );
      assertEquals(
        aliceRankings.rankedSongs[0].score,
        60,
        "✅ Preferred song score should be 60.",
      );
      assertEquals(
        aliceRankings.rankedSongs[1].songId,
        SONG_B,
        "✅ Other song should be ranked lower.",
      );
      assertEquals(
        aliceRankings.rankedSongs[1].score,
        40,
        "✅ Other song score should be 40.",
      );
      console.log(
        `Result: Alice's compared ranking: ${
          JSON.stringify(aliceRankings.rankedSongs)
        }`,
      );
    });

    console.log("--- Single song addComparison tests completed ---");
  } finally {
    await client.close();
  }
});
