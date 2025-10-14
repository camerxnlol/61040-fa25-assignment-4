---
timestamp: 'Tue Oct 14 2025 01:54:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_015419.06703127.md]]'
content_id: 55031183c27ff08f3572217f965097f3f23fcc4eb4242e1c226ef7dd0e0986d8
---

# file: src/concepts/Reaction/ReactionConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReactionConcept from "./ReactionConcept.ts";

// Define some mock IDs for testing
const postA = "post:article_123" as ID;
const postB = "post:image_456" as ID;
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

// Define some emoji strings
const emojiThumbsUp = "👍" as string;
const emojiHeart = "❤️" as string;
const emojiLaugh = "😂" as string;

Deno.test("Principle: User adds and removes emoji feedback for a post", async () => {
  console.log("\n--- Principle Test: User adds and removes reactions ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Trace Step 1: User Alice adds a 'thumbs up' reaction to Post A
    console.log(`✅ Alice (${userAlice}) adds ${emojiThumbsUp} to Post A (${postA}).`);
    const addResult1 = await reactionConcept.add({
      post: postA,
      reactionType: emojiThumbsUp,
      reactingUser: userAlice,
    });
    assertNotEquals("error" in addResult1, true, "Adding reaction should succeed.");
    const { reactionId: reaction1Id } = addResult1 as { reactionId: ID };
    assertExists(reaction1Id, "Reaction ID should be returned.");

    // Trace Step 2: Verify the reaction is recorded for Post A and User Alice
    const reactionsForPostA = await reactionConcept._getReactionsForPost({
      post: postA,
    });
    assertEquals(reactionsForPostA.length, 1, "Post A should have 1 reaction.");
    assertEquals(reactionsForPostA[0].reactions.reactingUser, userAlice);
    assertEquals(reactionsForPostA[0].reactions.reactionType, emojiThumbsUp);
    console.log(`✅ Verified: Post A has 1 reaction by Alice: ${emojiThumbsUp}`);

    const reactionsByAliceOnPostA = await reactionConcept._getReactionsByPostAndUser({
      post: postA,
      reactingUser: userAlice,
    });
    assertEquals(reactionsByAliceOnPostA.length, 1, "Alice should have 1 reaction on Post A.");
    console.log(`✅ Verified: Alice has 1 reaction on Post A: ${emojiThumbsUp}`);

    // Trace Step 3: User Alice removes her 'thumbs up' reaction from Post A
    console.log(`✅ Alice (${userAlice}) removes ${emojiThumbsUp} from Post A (${postA}).`);
    const removeResult1 = await reactionConcept.remove({
      post: postA,
      reactionType: emojiThumbsUp,
      reactingUser: userAlice,
    });
    assertEquals("error" in removeResult1, false, "Removing existing reaction should succeed.");

    // Trace Step 4: Verify the reaction is no longer recorded
    const reactionsForPostA_afterRemove = await reactionConcept._getReactionsForPost({
      post: postA,
    });
    assertEquals(reactionsForPostA_afterRemove.length, 0, "Post A should have 0 reactions after removal.");
    console.log(`✅ Verified: Post A now has 0 reactions.`);

    const reactionsByAliceOnPostA_afterRemove = await reactionConcept._getReactionsByPostAndUser({
      post: postA,
      reactingUser: userAlice,
    });
    assertEquals(reactionsByAliceOnPostA_afterRemove.length, 0, "Alice should have 0 reactions on Post A after removal.");
    console.log(`✅ Verified: Alice now has 0 reactions on Post A.`);

    console.log("--- Principle test complete and passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: add - successfully adds a unique reaction", async () => {
  console.log("\n--- Test: add - success case ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Scenario: User Bob adds a heart reaction to Post A
    console.log(`✅ Bob (${userBob}) adds ${emojiHeart} to Post A (${postA}).`);
    const addResult = await reactionConcept.add({
      post: postA,
      reactionType: emojiHeart,
      reactingUser: userBob,
    });
    assertEquals("error" in addResult, false, "Adding a unique reaction should succeed.");
    const { reactionId } = addResult as { reactionId: ID };
    assertExists(reactionId, "A reaction ID should be returned.");

    // Verify effect: The reaction should exist in the database
    const reactions = await reactionConcept._getReactionsForPost({ post: postA });
    assertEquals(reactions.length, 1, "There should be one reaction for Post A.");
    assertEquals(reactions[0].reactions.reactingUser, userBob);
    assertEquals(reactions[0].reactions.reactionType, emojiHeart);
    console.log(`✅ Effect confirmed: Reaction added and verified via query.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: add - prevents duplicate reactions (Requirement 2)", async () => {
  console.log("\n--- Test: add - duplicate reaction failure ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Pre-condition: User Alice adds a 'thumbs up' to Post A
    console.log(`Setup: Alice (${userAlice}) adds ${emojiThumbsUp} to Post A (${postA}).`);
    const initialAddResult = await reactionConcept.add({
      post: postA,
      reactionType: emojiThumbsUp,
      reactingUser: userAlice,
    });
    assertEquals("error" in initialAddResult, false, "Initial reaction add should succeed.");

    // Scenario: User Alice tries to add the exact same 'thumbs up' again to Post A
    console.log(`❌ Alice (${userAlice}) tries to add ${emojiThumbsUp} again to Post A (${postA}).`);
    const duplicateAddResult = await reactionConcept.add({
      post: postA,
      reactionType: emojiThumbsUp,
      reactingUser: userAlice,
    });
    assertEquals("error" in duplicateAddResult, true, "Adding a duplicate reaction should fail.");
    assertEquals((duplicateAddResult as { error: string }).error, "User has already added this exact emoji reaction to this post.", "Expected error message for duplicate reaction.");
    console.log(`✅ Requirement confirmed: Duplicate reaction was prevented.`);

    // Verify effect: No new reaction should have been added
    const reactions = await reactionConcept._getReactionsForPost({ post: postA });
    assertEquals(reactions.length, 1, "Only the original reaction should exist for Post A.");
    console.log(`✅ Effect confirmed: State remains unchanged.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove - successfully removes an existing reaction", async () => {
  console.log("\n--- Test: remove - success case ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Pre-condition: User Alice adds a 'laugh' reaction to Post B
    console.log(`Setup: Alice (${userAlice}) adds ${emojiLaugh} to Post B (${postB}).`);
    const addResult = await reactionConcept.add({
      post: postB,
      reactionType: emojiLaugh,
      reactingUser: userAlice,
    });
    assertEquals("error" in addResult, false, "Initial reaction add should succeed.");

    let reactionsBeforeRemove = await reactionConcept._getReactionsForPost({ post: postB });
    assertEquals(reactionsBeforeRemove.length, 1, "Post B should have 1 reaction before removal.");

    // Scenario: User Alice removes her 'laugh' reaction from Post B
    console.log(`✅ Alice (${userAlice}) removes ${emojiLaugh} from Post B (${postB}).`);
    const removeResult = await reactionConcept.remove({
      post: postB,
      reactionType: emojiLaugh,
      reactingUser: userAlice,
    });
    assertEquals("error" in removeResult, false, "Removing an existing reaction should succeed.");

    // Verify effect: The reaction should no longer exist in the database
    const reactionsAfterRemove = await reactionConcept._getReactionsForPost({ post: postB });
    assertEquals(reactionsAfterRemove.length, 0, "Post B should have 0 reactions after removal.");
    console.log(`✅ Effect confirmed: Reaction removed and verified via query.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: remove - fails to remove a non-existent reaction (Requirement)", async () => {
  console.log("\n--- Test: remove - non-existent reaction failure ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Pre-condition: No reactions exist for Post A
    let reactionsInitial = await reactionConcept._getReactionsForPost({ post: postA });
    assertEquals(reactionsInitial.length, 0, "Post A should start with 0 reactions.");

    // Scenario: User Alice tries to remove a reaction that doesn't exist
    console.log(`❌ Alice (${userAlice}) tries to remove non-existent ${emojiThumbsUp} from Post A (${postA}).`);
    const removeResult = await reactionConcept.remove({
      post: postA,
      reactionType: emojiThumbsUp,
      reactingUser: userAlice,
    });
    assertEquals("error" in removeResult, true, "Removing a non-existent reaction should fail.");
    assertEquals((removeResult as { error: string }).error, "No matching reaction found to remove.", "Expected error message for non-existent reaction.");
    console.log(`✅ Requirement confirmed: Removal of non-existent reaction was prevented.`);

    // Verify effect: State remains unchanged
    const reactionsAfterAttempt = await reactionConcept._getReactionsForPost({ post: postA });
    assertEquals(reactionsAfterAttempt.length, 0, "No reaction should have been removed (because none existed).");
    console.log(`✅ Effect confirmed: State remains unchanged.`);
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getReactionsForPost and _getReactionsByPostAndUser work correctly", async () => {
  console.log("\n--- Test: Query functionality ---");
  const [db, client] = await testDb();
  const reactionConcept = new ReactionConcept(db);

  try {
    // Setup multiple reactions for different posts and users
    console.log("Setup: Adding multiple reactions...");
    await reactionConcept.add({ post: postA, reactionType: emojiThumbsUp, reactingUser: userAlice });
    await reactionConcept.add({ post: postA, reactionType: emojiHeart, reactingUser: userAlice }); // Alice adds two different reactions to Post A
    await reactionConcept.add({ post: postA, reactionType: emojiThumbsUp, reactingUser: userBob }); // Bob adds same emoji as Alice to Post A
    await reactionConcept.add({ post: postB, reactionType: emojiLaugh, reactingUser: userAlice }); // Alice adds reaction to Post B

    // Query: _getReactionsForPost(postA)
    console.log(`✅ Querying reactions for Post A (${postA}).`);
    const reactionsForPostA = await reactionConcept._getReactionsForPost({ post: postA });
    assertEquals(reactionsForPostA.length, 3, "Post A should have 3 reactions.");
    // Check specific reactions exist (order might vary)
    const postAReactionsTypesUsers = reactionsForPostA.map(r => `${r.reactions.reactingUser}-${r.reactions.reactionType}`).sort();
    assertEquals(postAReactionsTypesUsers, [`${userAlice}-${emojiHeart}`, `${userAlice}-${emojiThumbsUp}`, `${userBob}-${emojiThumbsUp}`].sort());
    console.log(`✅ Verified: Post A has reactions: ${JSON.stringify(postAReactionsTypesUsers)}`);


    // Query: _getReactionsForPost(postB)
    console.log(`✅ Querying reactions for Post B (${postB}).`);
    const reactionsForPostB = await reactionConcept._getReactionsForPost({ post: postB });
    assertEquals(reactionsForPostB.length, 1, "Post B should have 1 reaction.");
    assertEquals(reactionsForPostB[0].reactions.reactingUser, userAlice);
    assertEquals(reactionsForPostB[0].reactions.reactionType, emojiLaugh);
    console.log(`✅ Verified: Post B has reaction: ${reactionsForPostB[0].reactions.reactingUser}-${reactionsForPostB[0].reactions.reactionType}`);

    // Query: _getReactionsByPostAndUser(postA, userAlice)
    console.log(`✅ Querying reactions for Post A (${postA}) by Alice (${userAlice}).`);
    const reactionsByAliceOnPostA = await reactionConcept._getReactionsByPostAndUser({ post: postA, reactingUser: userAlice });
    assertEquals(reactionsByAliceOnPostA.length, 2, "Alice should have 2 reactions on Post A.");
    const alicePostAReactionsTypes = reactionsByAliceOnPostA.map(r => r.reactions.reactionType).sort();
    assertEquals(alicePostAReactionsTypes, [emojiHeart, emojiThumbsUp].sort());
    console.log(`✅ Verified: Alice has reactions on Post A: ${JSON.stringify(alicePostAReactionsTypes)}`);

    // Query: _getReactionsByPostAndUser(postA, userBob)
    console.log(`✅ Querying reactions for Post A (${postA}) by Bob (${userBob}).`);
    const reactionsByBobOnPostA = await reactionConcept._getReactionsByPostAndUser({ post: postA, reactingUser: userBob });
    assertEquals(reactionsByBobOnPostA.length, 1, "Bob should have 1 reaction on Post A.");
    assertEquals(reactionsByBobOnPostA[0].reactions.reactingUser, userBob);
    assertEquals(reactionsByBobOnPostA[0].reactions.reactionType, emojiThumbsUp);
    console.log(`✅ Verified: Bob has reactions on Post A: ${reactionsByBobOnPostA[0].reactions.reactingUser}-${reactionsByBobOnPostA[0].reactions.reactionType}`);

  } finally {
    await client.close();
  }
});
```
