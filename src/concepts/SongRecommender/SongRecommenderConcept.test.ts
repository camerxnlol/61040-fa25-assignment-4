import { assert, assertEquals, assertExists, assertFalse } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

import {
  SongRecommenderConcept,
  USER_SONG_CATALOG_COLLECTION,
} from "./SongRecommenderConcept.ts";

function expectExists<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is T {
  assertExists(value, message);
}

// Define test users and songs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const song1 = "song:BohemianRhapsody" as ID;
const song2 = "song:StairwayToHeaven" as ID;
const song3 = "song:HotelCalifornia" as ID;
const song4 = "song:Imagine" as ID;

Deno.test("Principle: User gets daily song recommendations, past recommendations are tracked", async () => {
  const [db, client] = await testDb();

  try {
    console.log("\n--- Principle Test: Daily Song Recommendations ---");
    console.log(
      "Scenario: An author adds songs, a user receives recommendations daily, and past recommendations are tracked.",
    );

    // Create an instance of the SongRecommenderConcept class
    const songRecommender = new SongRecommenderConcept(db);

    // 1. Add several songs to userA's catalog
    console.log(`\nStep 1: Adding initial songs to ${userA}'s catalog.`);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2, song3, song4],
    });
    console.log(
      `  ✅ Added ${song1}, ${song2}, ${song3}, ${song4} to ${userA}'s not-yet-recommended songs.`,
    );

    let userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION).findOne(
      { _id: userA },
    );
    expectExists(userCatalog, "User catalog should exist after adding songs.");
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      4,
      "Initially, 4 songs should be not-yet-recommended.",
    );
    assertEquals(
      userCatalog.pastRecommendations.length,
      0,
      "Initially, no songs should be past recommendations.",
    );
    console.log(
      `  ✅ Initial state: ${userA} has ${userCatalog.notYetRecommendedSongs.length} not-yet-recommended songs and ${userCatalog.pastRecommendations.length} past recommendations.`,
    );

    // 2. Generate the first recommendation for userA (e.g., for the first day)
    console.log(`\nStep 2: Generating 1 recommendation for ${userA} (Day 1).`);
    const recommendedSongs1 = await songRecommender.generateRecommendation({
      userId: userA,
      count: 1,
    });
    assertEquals(
      recommendedSongs1.length,
      1,
      "Should receive 1 song recommendation.",
    );
    assertEquals(
      recommendedSongs1[0],
      song1,
      `First recommended song should be ${song1}.`,
    );
    console.log(
      `  ✅ ${userA} received recommendation: ${recommendedSongs1[0]}.`,
    );

    userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION).findOne({
      _id: userA,
    });
    expectExists(userCatalog, "User catalog should still exist.");
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      3,
      "After 1 recommendation, 3 songs should remain in not-yet-recommended.",
    );
    assertEquals(
      userCatalog.pastRecommendations.length,
      1,
      "After 1 recommendation, 1 song should be in past recommendations.",
    );
    assertEquals(
      userCatalog.pastRecommendations[0],
      song1,
      `${song1} should now be in past recommendations.`,
    );
    console.log(
      `  ✅ State updated: Not-yet-recommended: ${userCatalog.notYetRecommendedSongs.length}, Past: ${userCatalog.pastRecommendations.length}.`,
    );

    // 3. Generate another recommendation for userA (e.g., for the second day)
    console.log(
      `\nStep 3: Generating another 1 recommendation for ${userA} (Day 2).`,
    );
    const recommendedSongs2 = await songRecommender.generateRecommendation({
      userId: userA,
      count: 1,
    });
    assertEquals(
      recommendedSongs2.length,
      1,
      "Should receive another 1 song recommendation.",
    );
    assertEquals(
      recommendedSongs2[0],
      song2,
      `Second recommended song should be ${song2}.`,
    );
    console.log(
      `  ✅ ${userA} received recommendation: ${recommendedSongs2[0]}.`,
    );

    userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION).findOne({
      _id: userA,
    });
    expectExists(userCatalog, "User catalog should still exist.");
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      2,
      "After 2 recommendations, 2 songs should remain in not-yet-recommended.",
    );
    assertEquals(
      userCatalog.pastRecommendations.length,
      2,
      "After 2 recommendations, 2 songs should be in past recommendations.",
    );
    assert(
      userCatalog.pastRecommendations.includes(song1) &&
        userCatalog.pastRecommendations.includes(song2),
      `${song1} and ${song2} should be in past recommendations.`,
    );
    console.log(
      `  ✅ State updated: Not-yet-recommended: ${userCatalog.notYetRecommendedSongs.length}, Past: ${userCatalog.pastRecommendations.length}.`,
    );

    // 4. Verify past recommendations can be revisited (implicitly, they are in the 'pastRecommendations' array)
    console.log(`\nStep 4: Verifying past recommendations can be viewed.`);
    console.log(
      `  Current past recommendations: ${
        userCatalog.pastRecommendations.join(", ")
      }`,
    );
    assert(
      userCatalog.pastRecommendations.includes(song1),
      `${song1} should be visible in past recommendations.`,
    );
    assert(
      userCatalog.pastRecommendations.includes(song2),
      `${song2} should be visible in past recommendations.`,
    );
    console.log(
      `  ✅ Confirmed: Both ${song1} and ${song2} are recorded in past recommendations.`,
    );

    console.log("\n--- Principle Test Completed Successfully ✅ ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog - Valid addition", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- Action Test: addSongToCatalog - Valid addition ---");
    console.log(`Attempting to add ${song1} to ${userA}'s catalog.`);

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({ userId: userA, songs: [song1] });
    console.log(`  ✅ Action successful.`);

    const userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION)
      .findOne({ _id: userA });
    expectExists(userCatalog, "User catalog should exist after adding a song.");
    assertEquals(
      userCatalog.notYetRecommendedSongs.includes(song1),
      true,
      `${song1} should be in notYetRecommendedSongs.`,
    );
    assertEquals(
      userCatalog.pastRecommendations.length,
      0,
      "Past recommendations should be empty for a new user.",
    );
    console.log(
      `  ✅ Effect confirmed: ${song1} added to ${userA}'s notYetRecommendedSongs. Past recommendations are empty.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog - Requires: song not already in catalog", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: addSongToCatalog - Duplicate song handling ---",
    );

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({ userId: userA, songs: [song1] });
    console.log(
      `  ✅ Setup: ${song1} added initially to ${userA}'s not-yet-recommended list.`,
    );

    let error: string | undefined;
    console.log(
      `\nAttempting to add ${song1} again to ${userA}'s catalog (duplicate).`,
    );
    try {
      await songRecommender.addSongToCatalog({ userId: userA, songs: [song1] }); // Attempt to add duplicate
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Adding a duplicate song should throw an error.");
    assertEquals(
      error,
      `Song '${song1}' is already pending recommendation for user '${userA}'.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    // Simulate a song moving to pastRecommendations
    await songRecommender.addSongToCatalog({ userId: userA, songs: [song2] });
    await songRecommender.generateRecommendation({ userId: userA, count: 2 }); // Move song1 and song2 to past
    const userCatalogAfterMove = await db.collection(
      USER_SONG_CATALOG_COLLECTION,
    ).findOne({ _id: userA });
    expectExists(userCatalogAfterMove);
    console.log(
      `  ✅ Setup: ${song1} and ${song2} moved to ${userA}'s pastRecommendations.`,
    );
    console.log(
      `  Current past recommendations: ${
        userCatalogAfterMove.pastRecommendations.join(", ")
      }`,
    );

    error = undefined;
    console.log(
      `\nAttempting to add ${song1} to ${userA}'s catalog (already in past recommendations).`,
    );
    try {
      await songRecommender.addSongToCatalog({ userId: userA, songs: [song1] }); // Attempt to add a song already in past
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(
      error,
      "Adding a song already in pastRecommendations should throw an error.",
    );
    assertEquals(
      error,
      `Song '${song1}' has already been recommended to user '${userA}'.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation - Valid generation", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: generateRecommendation - Valid generation ---",
    );
    console.log(
      `Setup: Adding ${song1}, ${song2}, ${song3} to ${userB}'s catalog.`,
    );

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userB,
      songs: [song1, song2, song3],
    });
    console.log(`  ✅ Songs successfully added.`);

    console.log(`\nAction: Generating 2 recommendations for ${userB}.`);
    const recommendedSongs = await songRecommender.generateRecommendation({
      userId: userB,
      count: 2,
    });
    console.log(
      `  ✅ Action successful. Returned songs: ${recommendedSongs.join(", ")}.`,
    );

    assertEquals(
      recommendedSongs.length,
      2,
      "Should return 2 recommended songs.",
    );
    assertEquals(
      recommendedSongs.includes(song1),
      true,
      `Returned songs should include ${song1}.`,
    );
    assertEquals(
      recommendedSongs.includes(song2),
      true,
      `Returned songs should include ${song2}.`,
    );
    assertFalse(
      recommendedSongs.includes(song3),
      `Returned songs should not include ${song3}.`,
    );
    console.log(`  ✅ Effect confirmed: Correct songs returned.`);

    const userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION)
      .findOne({ _id: userB });
    expectExists(userCatalog);
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      1,
      "notYetRecommendedSongs should have 1 song left.",
    );
    assertEquals(
      userCatalog.notYetRecommendedSongs[0],
      song3,
      `${song3} should be the remaining song.`,
    );
    assertEquals(
      userCatalog.pastRecommendations.length,
      2,
      "pastRecommendations should have 2 songs.",
    );
    assert(
      userCatalog.pastRecommendations.includes(song1),
      `pastRecommendations should include ${song1}.`,
    );
    assert(
      userCatalog.pastRecommendations.includes(song2),
      `pastRecommendations should include ${song2}.`,
    );
    console.log(
      `  ✅ Effect confirmed: State updated. Not-yet-recommended: ${userCatalog.notYetRecommendedSongs}, Past: ${userCatalog.pastRecommendations}.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation - Requires: count less than or equal to available songs", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: generateRecommendation - Invalid count handling ---",
    );
    console.log(`Setup: Adding ${song1}, ${song2} to ${userA}'s catalog.`);

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2],
    });
    console.log(`  ✅ Songs successfully added. Available: 2.`);

    let error: string | undefined;

    console.log(
      `\nAttempting to generate 3 recommendations (more than available).`,
    );
    try {
      await songRecommender.generateRecommendation({ userId: userA, count: 3 }); // Request more than available
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(
      error,
      "Generating more songs than available should throw an error.",
    );
    assertEquals(
      error,
      `Not enough songs available for user '${userA}'. Requested 3, but only 2 are available.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    error = undefined;
    console.log(`\nAttempting to generate 0 recommendations.`);
    try {
      await songRecommender.generateRecommendation({ userId: userA, count: 0 }); // Request zero songs
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Generating zero songs should throw an error.");
    assertEquals(error, "Count for recommendations must be a positive number.");
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    error = undefined;
    console.log(
      `\nAttempting to generate -1 recommendations (negative count).`,
    );
    try {
      await songRecommender.generateRecommendation({
        userId: userA,
        count: -1,
      }); // Request negative songs
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Generating negative songs should throw an error.");
    assertEquals(error, "Count for recommendations must be a positive number.");
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    error = undefined;
    console.log(
      `\nAttempting to generate recommendations for a nonexistent user.`,
    );
    try {
      await songRecommender.generateRecommendation({
        userId: "nonexistentUser" as ID,
        count: 1,
      });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(
      error,
      "Generating for a nonexistent user should throw an error.",
    );
    assertEquals(
      error,
      `User 'nonexistentUser' not found or has no songs available for recommendation.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSongsFromCatalog - Valid removal", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: removeSongsFromCatalog - Valid removal ---",
    );
    console.log(`Setup: Adding ${song1}, ${song2} to ${userA}'s catalog.`);

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2],
    });
    console.log(`  ✅ Songs successfully added.`);

    console.log(
      `\nAction: Removing ${song1} from ${userA}'s not-yet-recommended songs.`,
    );
    await songRecommender.removeSongsFromCatalog({
      userId: userA,
      songs: [song1],
    });
    console.log(`  ✅ Action successful.`);

    const userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION)
      .findOne({ _id: userA });
    expectExists(userCatalog);
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      1,
      "notYetRecommendedSongs should have 1 song left.",
    );
    assertEquals(
      userCatalog.notYetRecommendedSongs[0],
      song2,
      `${song2} should be the remaining song.`,
    );
    assertFalse(
      userCatalog.notYetRecommendedSongs.includes(song1),
      `${song1} should no longer be in notYetRecommendedSongs.`,
    );
    console.log(
      `  ✅ Effect confirmed: ${song1} removed from notYetRecommendedSongs. Remaining: ${userCatalog.notYetRecommendedSongs}.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSongsFromCatalog - Requires: song to be in notYetRecommendedSongs", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: removeSongsFromCatalog - Invalid removal handling ---",
    );
    console.log(`Setup: Adding ${song1}, ${song2} to ${userA}'s catalog.`);

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2],
    });
    // Move song1 to pastRecommendations to test that scenario
    await songRecommender.generateRecommendation({ userId: userA, count: 1 });
    console.log(
      `  ✅ Setup complete: ${song1} is now in pastRecommendations, ${song2} is in notYetRecommendedSongs.`,
    );

    let error: string | undefined;
    console.log(
      `\nAttempting to remove ${song1} (which is in pastRecommendations).`,
    );
    try {
      await songRecommender.removeSongsFromCatalog({
        userId: userA,
        songs: [song1],
      }); // Attempt to remove a song from pastRecommendations
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(
      error,
      "Removing a song from pastRecommendations should throw an error.",
    );
    assertEquals(
      error,
      `Song '${song1}' not found in not-yet-recommended songs for user '${userA}'.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    error = undefined;
    console.log(`\nAttempting to remove ${song3} (a nonexistent song).`);
    try {
      await songRecommender.removeSongsFromCatalog({
        userId: userA,
        songs: [song3],
      }); // Attempt to remove a nonexistent song
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Removing a nonexistent song should throw an error.");
    assertEquals(
      error,
      `Song '${song3}' not found in not-yet-recommended songs for user '${userA}'.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);

    error = undefined;
    console.log(`\nAttempting to remove a song for a nonexistent user.`);
    try {
      await songRecommender.removeSongsFromCatalog({
        userId: "nonexistentUser" as ID,
        songs: [song1],
      }); // Attempt to remove for nonexistent user
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(
      error,
      "Removing for a nonexistent user should throw an error.",
    );
    assertEquals(
      error,
      `User 'nonexistentUser' not found or has no song catalog.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: getPastRecommendations - Valid retrieval", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Query Test: getPastRecommendations - Valid retrieval ---",
    );
    console.log(
      `Setup: Adding songs to ${userA}'s catalog and generating recommendations.`,
    );

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2, song3],
    });
    console.log(`  ✅ Songs added to catalog.`);

    // Generate recommendations to move songs to past recommendations
    await songRecommender.generateRecommendation({ userId: userA, count: 2 });
    console.log(`  ✅ Generated 2 recommendations.`);

    console.log(`\nQuery: Getting past recommendations for ${userA}.`);
    const pastRecommendations = await songRecommender.getPastRecommendations({
      userId: userA,
    });
    console.log(
      `  ✅ Query successful. Past recommendations: ${
        pastRecommendations.join(", ")
      }.`,
    );

    assertEquals(
      pastRecommendations.length,
      2,
      "Should have 2 past recommendations.",
    );
    assert(
      pastRecommendations.includes(song1),
      `Past recommendations should include ${song1}.`,
    );
    assert(
      pastRecommendations.includes(song2),
      `Past recommendations should include ${song2}.`,
    );
    assertFalse(
      pastRecommendations.includes(song3),
      `Past recommendations should not include ${song3}.`,
    );
    console.log(
      `  ✅ Effect confirmed: Correct past recommendations returned.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Query: getNotYetRecommended - Valid retrieval", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- Query Test: getNotYetRecommended - Valid retrieval ---");
    console.log(`Setup: Adding songs to ${userB}'s catalog.`);

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userB,
      songs: [song1, song2, song3, song4],
    });
    console.log(`  ✅ Songs added to catalog.`);

    console.log(`\nQuery: Getting not-yet-recommended songs for ${userB}.`);
    const notYetRecommended = await songRecommender.getNotYetRecommended({
      userId: userB,
    });
    console.log(
      `  ✅ Query successful. Not-yet-recommended: ${
        notYetRecommended.join(", ")
      }.`,
    );

    assertEquals(
      notYetRecommended.length,
      4,
      "Should have 4 not-yet-recommended songs.",
    );
    assert(
      notYetRecommended.includes(song1),
      `Not-yet-recommended should include ${song1}.`,
    );
    assert(
      notYetRecommended.includes(song2),
      `Not-yet-recommended should include ${song2}.`,
    );
    assert(
      notYetRecommended.includes(song3),
      `Not-yet-recommended should include ${song3}.`,
    );
    assert(
      notYetRecommended.includes(song4),
      `Not-yet-recommended should include ${song4}.`,
    );
    console.log(
      `  ✅ Effect confirmed: Correct not-yet-recommended songs returned.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Query: getPastRecommendations - User not found", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Query Test: getPastRecommendations - User not found ---",
    );

    const songRecommender = new SongRecommenderConcept(db);

    let error: string | undefined;
    console.log(`\nQuery: Getting past recommendations for nonexistent user.`);
    try {
      await songRecommender.getPastRecommendations({
        userId: "nonexistentUser" as ID,
      });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Querying for nonexistent user should throw an error.");
    assertEquals(
      error,
      `User 'nonexistentUser' not found or has no song catalog.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: getNotYetRecommended - User not found", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- Query Test: getNotYetRecommended - User not found ---");

    const songRecommender = new SongRecommenderConcept(db);

    let error: string | undefined;
    console.log(
      `\nQuery: Getting not-yet-recommended songs for nonexistent user.`,
    );
    try {
      await songRecommender.getNotYetRecommended({
        userId: "nonexistentUser" as ID,
      });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
    assertExists(error, "Querying for nonexistent user should throw an error.");
    assertEquals(
      error,
      `User 'nonexistentUser' not found or has no song catalog.`,
    );
    console.log(`  ✅ Requirement check: Failed as expected. Error: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSongsFromCatalog - Multiple songs removal", async () => {
  const [db, client] = await testDb();
  try {
    console.log(
      "\n--- Action Test: removeSongsFromCatalog - Multiple songs removal ---",
    );
    console.log(
      `Setup: Adding ${song1}, ${song2}, ${song3} to ${userA}'s catalog.`,
    );

    const songRecommender = new SongRecommenderConcept(db);
    await songRecommender.addSongToCatalog({
      userId: userA,
      songs: [song1, song2, song3],
    });
    console.log(`  ✅ Songs successfully added.`);

    console.log(
      `\nAction: Removing ${song1} and ${song2} from ${userA}'s not-yet-recommended songs.`,
    );
    await songRecommender.removeSongsFromCatalog({
      userId: userA,
      songs: [song1, song2],
    });
    console.log(`  ✅ Action successful.`);

    const userCatalog = await db.collection(USER_SONG_CATALOG_COLLECTION)
      .findOne({ _id: userA });
    expectExists(userCatalog);
    assertEquals(
      userCatalog.notYetRecommendedSongs.length,
      1,
      "notYetRecommendedSongs should have 1 song left.",
    );
    assertEquals(
      userCatalog.notYetRecommendedSongs[0],
      song3,
      `${song3} should be the remaining song.`,
    );
    assertFalse(
      userCatalog.notYetRecommendedSongs.includes(song1),
      `${song1} should no longer be in notYetRecommendedSongs.`,
    );
    assertFalse(
      userCatalog.notYetRecommendedSongs.includes(song2),
      `${song2} should no longer be in notYetRecommendedSongs.`,
    );
    console.log(
      `  ✅ Effect confirmed: ${song1} and ${song2} removed from notYetRecommendedSongs. Remaining: ${userCatalog.notYetRecommendedSongs}.`,
    );
  } finally {
    await client.close();
  }
});
