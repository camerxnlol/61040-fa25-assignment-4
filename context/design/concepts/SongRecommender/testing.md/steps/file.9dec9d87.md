---
timestamp: 'Mon Oct 13 2025 12:39:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_123900.c0966b19.md]]'
content_id: 9dec9d87330dcf5040f3fbcb8dbc741b0a08981b8300fd5bad4d778a322b295b
---

# file: src/SongRecommender/SongRecommenderConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertFalse } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import {
  addSongToCatalog,
  generateRecommendation,
  removeSong,
  _getUserCatalog, // Query function added for testing
} from "./SongRecommenderConcept.ts";

// Define test users and songs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const song1 = "song:BohemianRhapsody" as ID;
const song2 = "song:StairwayToHeaven" as ID;
const song3 = "song:HotelCalifornia" as ID;
const song4 = "song:Imagine" as ID;
const song5 = "song:SweetChildOMine" as ID;

Deno.test("Principle: User gets daily song recommendations, past recommendations are tracked", async () => {
  const [db, client] = await testDb();

  try {
    console.log("\n--- Principle Test: Daily Song Recommendations ---");

    // 1. Add several songs to userA's catalog
    console.log(`Action: Adding songs for user ${userA}`);
    await addSongToCatalog(db, userA, song1);
    await addSongToCatalog(db, userA, song2);
    await addSongToCatalog(db, userA, song3);
    await addSongToCatalog(db, userA, song4);

    let userCatalog = await _getUserCatalog(db, userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 4, "Initially, 4 songs should be not-yet-recommended.");
    assertEquals(userCatalog.pastRecommendations.length, 0, "Initially, no songs should be past recommendations.");
    console.log(`State: ${userA} has ${userCatalog.notYetRecommendedSongs.length} not-yet-recommended songs.`);

    // 2. Generate the first recommendation for userA (e.g., for the first day)
    console.log(`Action: Generating 1 recommendation for user ${userA}`);
    const recommendedSongs1 = await generateRecommendation(db, userA, 1);
    assertEquals(recommendedSongs1.length, 1, "Should receive 1 song recommendation.");
    assertEquals(recommendedSongs1[0], song1, "First recommended song should be song1.");

    userCatalog = await _getUserCatalog(db, userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 3, "After 1 recommendation, 3 songs should remain.");
    assertEquals(userCatalog.pastRecommendations.length, 1, "After 1 recommendation, 1 song should be in past recommendations.");
    assertEquals(userCatalog.pastRecommendations[0], song1, "Song1 should now be in past recommendations.");
    console.log(`State: ${userA} received ${recommendedSongs1[0]}. Not-yet-recommended: ${userCatalog.notYetRecommendedSongs.length}, Past: ${userCatalog.pastRecommendations.length}`);

    // 3. Generate another recommendation for userA (e.g., for the second day)
    console.log(`Action: Generating another 1 recommendation for user ${userA}`);
    const recommendedSongs2 = await generateRecommendation(db, userA, 1);
    assertEquals(recommendedSongs2.length, 1, "Should receive another 1 song recommendation.");
    assertEquals(recommendedSongs2[0], song2, "Second recommended song should be song2.");

    userCatalog = await _getUserCatalog(db, userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 2, "After 2 recommendations, 2 songs should remain.");
    assertEquals(userCatalog.pastRecommendations.length, 2, "After 2 recommendations, 2 songs should be in past recommendations.");
    assert(userCatalog.pastRecommendations.includes(song1) && userCatalog.pastRecommendations.includes(song2), "Song1 and Song2 should be in past recommendations.");
    console.log(`State: ${userA} received ${recommendedSongs2[0]}. Not-yet-recommended: ${userCatalog.notYetRecommendedSongs.length}, Past: ${userCatalog.pastRecommendations.length}`);

    // 4. Verify past recommendations can be revisited (implicitly, they are in the 'pastRecommendations' array)
    console.log(`Verification: Past recommendations array: ${userCatalog.pastRecommendations}`);
    assert(userCatalog.pastRecommendations.includes(song1), "Song1 should be visible in past recommendations.");
    assert(userCatalog.pastRecommendations.includes(song2), "Song2 should be visible in past recommendations.");

    console.log("Principle Test Completed Successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog - Valid addition", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- addSongToCatalog: Valid addition ---");
    await addSongToCatalog(db, userA, song1);
    const userCatalog = await _getUserCatalog(db, userA);
    assertExists(userCatalog, "User catalog should exist after adding a song.");
    assertEquals(userCatalog.notYetRecommendedSongs.includes(song1), true, "Song1 should be in notYetRecommendedSongs.");
    assertEquals(userCatalog.pastRecommendations.length, 0, "Past recommendations should be empty for a new user.");
    console.log(`Effect: Song ${song1} added to ${userA}'s notYetRecommendedSongs.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog - Requires: song not already in catalog", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- addSongToCatalog: Duplicate song handling ---");
    await addSongToCatalog(db, userA, song1);
    console.log(`Effect: Song ${song1} added initially.`);

    let error: string | undefined;
    try {
      await addSongToCatalog(db, userA, song1); // Attempt to add duplicate
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Adding a duplicate song should throw an error.");
    assertEquals(error, `Song '${song1}' is already pending recommendation for user '${userA}'.`);
    console.log(`Requirement Check: Failed to add duplicate song: ${error}`);

    // Simulate a song moving to pastRecommendations
    await addSongToCatalog(db, userA, song2);
    await generateRecommendation(db, userA, 2); // Move song1 and song2 to past

    error = undefined;
    try {
      await addSongToCatalog(db, userA, song1); // Attempt to add a song already in past
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Adding a song already in pastRecommendations should throw an error.");
    assertEquals(error, `Song '${song1}' has already been recommended to user '${userA}'.`);
    console.log(`Requirement Check: Failed to add song already in past recommendations: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation - Valid generation", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- generateRecommendation: Valid generation ---");
    await addSongToCatalog(db, userB, song1);
    await addSongToCatalog(db, userB, song2);
    await addSongToCatalog(db, userB, song3);
    console.log(`Setup: Added ${song1}, ${song2}, ${song3} to ${userB}'s catalog.`);

    const recommendedSongs = await generateRecommendation(db, userB, 2);
    assertEquals(recommendedSongs.length, 2, "Should return 2 recommended songs.");
    assertEquals(recommendedSongs.includes(song1), true, "Should include song1.");
    assertEquals(recommendedSongs.includes(song2), true, "Should include song2.");
    assertFalse(recommendedSongs.includes(song3), "Should not include song3.");
    console.log(`Effect: Recommended songs: ${recommendedSongs.join(", ")}`);

    const userCatalog = await _getUserCatalog(db, userB);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 1, "notYetRecommendedSongs should have 1 song left.");
    assertEquals(userCatalog.notYetRecommendedSongs[0], song3, "song3 should be remaining.");
    assertEquals(userCatalog.pastRecommendations.length, 2, "pastRecommendations should have 2 songs.");
    assert(userCatalog.pastRecommendations.includes(song1), "pastRecommendations should include song1.");
    assert(userCatalog.pastRecommendations.includes(song2), "pastRecommendations should include song2.");
    console.log(`Effect: State updated. Not-yet-recommended: ${userCatalog.notYetRecommendedSongs}, Past: ${userCatalog.pastRecommendations}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation - Requires: count less than or equal to available songs", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- generateRecommendation: Invalid count handling ---");
    await addSongToCatalog(db, userA, song1);
    await addSongToCatalog(db, userA, song2);
    console.log(`Setup: Added ${song1}, ${song2} to ${userA}'s catalog.`);

    let error: string | undefined;

    try {
      await generateRecommendation(db, userA, 3); // Request more than available
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Generating more songs than available should throw an error.");
    assertEquals(error, `Not enough songs available for user '${userA}'. Requested 3, but only 2 are available.`);
    console.log(`Requirement Check: Failed to generate too many songs: ${error}`);

    error = undefined;
    try {
      await generateRecommendation(db, userA, 0); // Request zero songs
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Generating zero songs should throw an error.");
    assertEquals(error, "Count for recommendations must be a positive number.");
    console.log(`Requirement Check: Failed to generate zero songs: ${error}`);

    error = undefined;
    try {
      await generateRecommendation(db, userA, -1); // Request negative songs
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Generating negative songs should throw an error.");
    assertEquals(error, "Count for recommendations must be a positive number.");
    console.log(`Requirement Check: Failed to generate negative songs: ${error}`);

    // Test for a user that does not exist or has no songs
    error = undefined;
    try {
      await generateRecommendation(db, "nonexistentUser" as ID, 1);
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Generating for a nonexistent user should throw an error.");
    assertEquals(error, `User 'nonexistentUser' not found or has no songs available for recommendation.`);
    console.log(`Requirement Check: Failed for nonexistent user: ${error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSong - Valid removal", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- removeSong: Valid removal ---");
    await addSongToCatalog(db, userA, song1);
    await addSongToCatalog(db, userA, song2);
    console.log(`Setup: Added ${song1}, ${song2} to ${userA}'s catalog.`);

    await removeSong(db, userA, song1);
    console.log(`Effect: Removed ${song1} from ${userA}'s notYetRecommendedSongs.`);

    const userCatalog = await _getUserCatalog(db, userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 1, "notYetRecommendedSongs should have 1 song left.");
    assertEquals(userCatalog.notYetRecommendedSongs[0], song2, "Song2 should be the remaining song.");
    assertFalse(userCatalog.notYetRecommendedSongs.includes(song1), "Song1 should no longer be in notYetRecommendedSongs.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSong - Requires: song to be in notYetRecommendedSongs", async () => {
  const [db, client] = await testDb();
  try {
    console.log("\n--- removeSong: Invalid removal handling ---");
    await addSongToCatalog(db, userA, song1);
    await addSongToCatalog(db, userA, song2);
    // Move song1 to pastRecommendations to test that scenario
    await generateRecommendation(db, userA, 1);
    console.log(`Setup: ${song1} is in pastRecommendations, ${song2} is in notYetRecommendedSongs.`);

    let error: string | undefined;
    try {
      await removeSong(db, userA, song1); // Attempt to remove a song from pastRecommendations
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Removing a song from pastRecommendations should throw an error.");
    assertEquals(error, `Song '${song1}' not found in not-yet-recommended songs for user '${userA}'.`);
    console.log(`Requirement Check: Failed to remove song in past recommendations: ${error}`);

    error = undefined;
    try {
      await removeSong(db, userA, song3); // Attempt to remove a nonexistent song
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Removing a nonexistent song should throw an error.");
    assertEquals(error, `Song '${song3}' not found in not-yet-recommended songs for user '${userA}'.`);
    console.log(`Requirement Check: Failed to remove nonexistent song: ${error}`);

    error = undefined;
    try {
      await removeSong(db, "nonexistentUser" as ID, song1); // Attempt to remove for nonexistent user
    } catch (e) {
      error = e.message;
    }
    assertExists(error, "Removing for a nonexistent user should throw an error.");
    assertEquals(error, `Song '${song1}' not found in not-yet-recommended songs for user 'nonexistentUser'.`);
    console.log(`Requirement Check: Failed for nonexistent user: ${error}`);
  } finally {
    await client.close();
  }
});
```
