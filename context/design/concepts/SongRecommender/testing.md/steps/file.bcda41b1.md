---
timestamp: 'Sat Oct 11 2025 10:29:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_102953.17187c88.md]]'
content_id: bcda41b19b414e2089ac864160989fd1a8a6430c7eb9f0328eab5a1b35c949c7
---

# file: src/SongRecommender/SongRecommenderConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SongRecommenderConcept from "./SongRecommenderConcept.ts";

const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

const song1 = "song:Wonderwall" as ID;
const song2 = "song:BohemianRhapsody" as ID;
const song3 = "song:StairwayToHeaven" as ID;
const song4 = "song:HotelCalifornia" as ID;
const song5 = "song:SweetChildOMine" as ID;

Deno.test("Principle: System presents new songs, user can revisit past, recommendations refresh daily", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    // 1. User adds initial songs to their catalog
    await recommender.addSongToCatalog({ user: userA, song: song1 });
    await recommender.addSongToCatalog({ user: userA, song: song2 });
    await recommender.addSongToCatalog({ user: userA, song: song3 });

    let userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 3);
    assertEquals(userCatalog.pastRecommendations.length, 0);

    // 2. Each day, the system presents a new song to the user, chosen from a list of songs.
    // (Simulate 1st day recommendation)
    const rec1Result = await recommender.generateRecommendation({ user: userA, count: 1 });
    assertNotEquals("error" in rec1Result, true, "First recommendation should succeed.");
    const { songs: recSongs1 } = rec1Result as { songs: ID[] };
    assertEquals(recSongs1.length, 1);
    assertArrayIncludes([song1, song2, song3], recSongs1); // It picks one of them

    userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 2); // One song moved
    assertEquals(userCatalog.pastRecommendations.length, 1); // One song added to past
    assertArrayIncludes(userCatalog.pastRecommendations, recSongs1);
    assertNotEquals(userCatalog.notYetRecommendedSongs.includes(recSongs1[0]), true, "Recommended song should no longer be in notYetRecommended.");

    // (Simulate 2nd day recommendation)
    const rec2Result = await recommender.generateRecommendation({ user: userA, count: 1 });
    assertNotEquals("error" in rec2Result, true, "Second recommendation should succeed.");
    const { songs: recSongs2 } = rec2Result as { songs: ID[] };
    assertEquals(recSongs2.length, 1);
    assertArrayIncludes([song1, song2, song3], recSongs2);
    assertNotEquals(recSongs1[0], recSongs2[0], "Should recommend a different song."); // Assuming order of songs in notYetRecommendedSongs is stable for slice(0,1)

    userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 1);
    assertEquals(userCatalog.pastRecommendations.length, 2);
    assertArrayIncludes(userCatalog.pastRecommendations, [...recSongs1, ...recSongs2]);

    // 3. Past recommendations can be revisited.
    // (Querying pastRecommendations directly shows they are available)
    assertArrayIncludes(userCatalog.pastRecommendations, recSongs1, "Past recommendations should include previously recommended song.");
    assertArrayIncludes(userCatalog.pastRecommendations, recSongs2, "Past recommendations should include second recommended song.");

    // 4. User can remove a song not yet recommended
    const removeResult = await recommender.removeSong({ user: userA, song: song3 });
    assertEquals("error" in removeResult, false, "Removing a song should succeed.");

    userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 0); // song3 removed, only other one was recommended
    assertEquals(userCatalog.pastRecommendations.length, 2);
    assertEquals(userCatalog.notYetRecommendedSongs.includes(song3), false, "Song3 should be removed from notYetRecommended.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog successfully adds a new song", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    const result = await recommender.addSongToCatalog({ user: userA, song: song1 });
    assertEquals("error" in result, false, "Adding a new song should succeed.");

    const userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs, [song1], "Song should be in notYetRecommendedSongs.");
    assertEquals(userCatalog.pastRecommendations.length, 0, "pastRecommendations should be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSongToCatalog requires song to not be already present", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    // Add song initially
    await recommender.addSongToCatalog({ user: userA, song: song1 });
    let userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs, [song1]);

    // Try adding the same song again to notYetRecommendedSongs
    const duplicateAddResult = await recommender.addSongToCatalog({ user: userA, song: song1 });
    assertEquals("error" in duplicateAddResult, true, "Adding a song already in notYetRecommendedSongs should fail.");
    assertEquals((duplicateAddResult as { error: string }).error, `Song '${song1}' is already pending recommendation for user '${userA}'.`);

    // Move song to pastRecommendations
    await recommender.generateRecommendation({ user: userA, count: 1 });
    userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 0);
    assertEquals(userCatalog.pastRecommendations, [song1]);

    // Try adding the same song again when it's in pastRecommendations
    const pastAddResult = await recommender.addSongToCatalog({ user: userA, song: song1 });
    assertEquals("error" in pastAddResult, true, "Adding a song already in pastRecommendations should fail.");
    assertEquals((pastAddResult as { error: string }).error, `Song '${song1}' has already been recommended to user '${userA}'.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation successfully moves songs and returns them", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    await recommender.addSongToCatalog({ user: userA, song: song1 });
    await recommender.addSongToCatalog({ user: userA, song: song2 });
    await recommender.addSongToCatalog({ user: userA, song: song3 });

    const recResult = await recommender.generateRecommendation({ user: userA, count: 2 });
    assertEquals("error" in recResult, false, "Generating recommendation should succeed.");
    const { songs } = recResult as { songs: ID[] };
    assertEquals(songs.length, 2, "Should return 2 songs.");
    assertArrayIncludes([song1, song2], songs, "Should return the first two songs.");

    const userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 1, "Only one song should remain in notYetRecommended.");
    assertEquals(userCatalog.notYetRecommendedSongs[0], song3, "song3 should remain in notYetRecommended.");
    assertEquals(userCatalog.pastRecommendations.length, 2, "Two songs should be in pastRecommendations.");
    assertArrayIncludes(userCatalog.pastRecommendations, [song1, song2], "song1 and song2 should be in pastRecommendations.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendation requires enough songs", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    await recommender.addSongToCatalog({ user: userA, song: song1 }); // Only 1 song available

    // Request more songs than available
    const resultTooMany = await recommender.generateRecommendation({ user: userA, count: 2 });
    assertEquals("error" in resultTooMany, true, "Requesting too many songs should fail.");
    assertEquals((resultTooMany as { error: string }).error, "Not enough songs available for recommendation. Requested 2, but only 1 available.");

    // Request from user with no songs
    const resultNoSongs = await recommender.generateRecommendation({ user: userB, count: 1 });
    assertEquals("error" in resultNoSongs, true, "Requesting from a user with no songs should fail.");
    assertEquals((resultNoSongs as { error: string }).error, `No songs available for recommendation for user '${userB}'.`);

    // Request 0 or negative songs
    const resultZero = await recommender.generateRecommendation({ user: userA, count: 0 });
    assertEquals("error" in resultZero, true, "Requesting 0 songs should fail.");
    assertEquals((resultZero as { error: string }).error, "Count must be a positive number.");
    const resultNegative = await recommender.generateRecommendation({ user: userA, count: -1 });
    assertEquals("error" in resultNegative, true, "Requesting negative songs should fail.");
    assertEquals((resultNegative as { error: string }).error, "Count must be a positive number.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSong successfully removes a song from notYetRecommendedSongs", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    await recommender.addSongToCatalog({ user: userA, song: song1 });
    await recommender.addSongToCatalog({ user: userA, song: song2 });

    let userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 2);
    assertArrayIncludes(userCatalog.notYetRecommendedSongs, [song1, song2]);

    const removeResult = await recommender.removeSong({ user: userA, song: song1 });
    assertEquals("error" in removeResult, false, "Removing an existing song should succeed.");

    userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 1, "One song should be removed.");
    assertEquals(userCatalog.notYetRecommendedSongs[0], song2, "Only song2 should remain.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSong requires song to be in notYetRecommendedSongs", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    await recommender.addSongToCatalog({ user: userA, song: song1 });
    await recommender.addSongToCatalog({ user: userA, song: song2 });
    await recommender.generateRecommendation({ user: userA, count: 1 }); // song1 moves to past

    // Try removing a song that is in pastRecommendations
    const removePastResult = await recommender.removeSong({ user: userA, song: song1 });
    assertEquals("error" in removePastResult, true, "Removing a song from pastRecommendations should fail.");
    assertEquals((removePastResult as { error: string }).error, `Song '${song1}' is not in notYetRecommendedSongs for user '${userA}'.`);

    // Try removing a non-existent song
    const removeNonExistentResult = await recommender.removeSong({ user: userA, song: song4 });
    assertEquals("error" in removeNonExistentResult, true, "Removing a non-existent song should fail.");
    assertEquals((removeNonExistentResult as { error: string }).error, `Song '${song4}' is not in notYetRecommendedSongs for user '${userA}'.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateRecommendationFromLLM adds new songs to catalog", async () => {
  const [db, client] = await testDb();
  const recommender = new SongRecommenderConcept(db);

  try {
    // LLM is a mock, so we just pass a string
    const llmMock = "Gemini" as GeminiLLM;

    // Generate 3 new songs for userA
    const result = await recommender.generateRecommendationFromLLM({ user: userA, llm: llmMock, count: 3 });
    assertEquals("error" in result, false, "LLM generation should succeed.");

    const userCatalog = await recommender._getUserCatalog(userA);
    assertExists(userCatalog);
    assertEquals(userCatalog.notYetRecommendedSongs.length, 3, "Three new songs should be added.");
    assertEquals(userCatalog.pastRecommendations.length, 0, "Past recommendations should remain empty.");

    // Generate more songs
    await recommender.generateRecommendationFromLLM({ user: userA, llm: llmMock, count: 2 });
    const updatedCatalog = await recommender._getUserCatalog(userA);
    assertExists(updatedCatalog);
    assertEquals(updatedCatalog.notYetRecommendedSongs.length, 5, "Total five songs should be added.");

    // Edge case: Request 0 or negative songs
    const resultZero = await recommender.generateRecommendationFromLLM({ user: userA, llm: llmMock, count: 0 });
    assertEquals("error" in resultZero, true, "Requesting 0 songs should fail.");
    assertEquals((resultZero as { error: string }).error, "Count must be a positive number.");
  } finally {
    await client.close();
  }
});
```
