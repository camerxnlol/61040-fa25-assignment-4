import { assertEquals, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendsConcept from "./FriendsConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;
const userEve = "user:Eve" as ID; // Added for more distinct test cases

Deno.test("Principle: User sends request, recipient accepts, they become friends", async () => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    console.log("Trace: Demonstrating the Friends concept principle.");

    // Action: Alice sends a friend request to Bob
    console.log(`  ${userAlice} sends friend request to ${userBob}`);
    const sendResult = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
    assertNotEquals("error" in sendResult, true, "Alice should be able to send a request to Bob.");
    assertEquals((sendResult as { success: boolean }).success, true);

    // Verify Bob received the request
    const bobReceivedRequests = await friendsConcept._getReceivedRequests({ user: userBob });
    assertEquals(bobReceivedRequests[0].senders, [userAlice], "Bob should have a received request from Alice.");

    // Action: Bob accepts the friend request from Alice
    console.log(`  ${userBob} accepts friend request from ${userAlice}`);
    const acceptResult = await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });
    assertNotEquals("error" in acceptResult, true, "Bob should be able to accept Alice's request.");
    assertEquals((acceptResult as { success: boolean }).success, true);

    // Verify they are now friends
    const aliceFriends = await friendsConcept._getFriends({ user: userAlice });
    assertEquals(aliceFriends[0].friends, [userBob], "Alice should now have Bob as a friend.");

    const bobFriends = await friendsConcept._getFriends({ user: userBob });
    assertEquals(bobFriends[0].friends, [userAlice], "Bob should now have Alice as a friend.");

    const isFriendshipVerified = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userBob });
    assertEquals(isFriendshipVerified[0].isFriend, true, "Friendship should be verified between Alice and Bob.");

    // Verify the request is gone
    const bobReceivedRequestsAfterAccept = await friendsConcept._getReceivedRequests({ user: userBob });
    assertEquals(bobReceivedRequestsAfterAccept[0].senders.length, 0, "Bob should no longer have a pending request from Alice.");

    console.log("Trace complete: Alice and Bob are now friends.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: sendFriendRequest - Cannot send request to self", async () => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);
  try {
    console.log(`  Attempting ${userAlice} to send request to ${userAlice}`);
    const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userAlice });
    assertEquals("error" in result, true, "Should not allow sending request to self.");
    assertEquals((result as { error: string }).error, "Cannot send friend request to self.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: sendFriendRequest - Cannot send if friendship already exists", async () => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);
  try {
    // Establish initial friendship
    await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
    await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });

    console.log(`  Attempting ${userAlice} to send request to ${userBob} (already friends)`);
    const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
    assertEquals("error" in result, true, "Should not allow sending request if friendship exists.");
    assertEquals((result as { error: string }).error, "Friendship already exists.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: sendFriendRequest - Cannot send if request already sent", async () => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);
  try {
    // Initial request
    await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });

    console.log(`  Attempting ${userAlice} to send request to ${userCharlie} again`);
    const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });
    assertEquals("error" in result, true, "Should not allow sending duplicate request.");
    assertEquals((result as { error: string }).error, "Friend request already sent.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: sendFriendRequest - Cannot send if request already received (reverse direction)", async () => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);
  try {
    // Charlie sends to Alice
    await friendsConcept.sendFriendRequest({ sender: userCharlie, recipient: userAlice });

    console.log(`  Attempting ${userAlice} to send request to ${userCharlie} (Charlie already sent to Alice)`);
    const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });
    assertEquals("error" in result, true, "Should not allow sending request if a request from recipient to sender already exists.");
    assertEquals((result as { error: string }).error, "Friend request already received from recipient.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptFriendRequest - requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    await test.step("Cannot accept if no pending request", async () => {
      console.log(`  Attempting ${userBob} to accept request from ${userAlice} (no request sent)`);
      const result = await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });
      assertEquals("error" in result, true, "Should not allow accepting if no request exists.");
      assertEquals((result as { error: string }).error, "No pending friend request from sender to recipient.");
    });

    await test.step("Successfully accepts a request and creates friendship", async () => {
      await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userDavid });
      let davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders, [userAlice], "David should have a pending request.");

      console.log(`  ${userDavid} accepts request from ${userAlice}`);
      const acceptResult = await friendsConcept.acceptFriendRequest({ recipient: userDavid, sender: userAlice });
      assertEquals("error" in acceptResult, false, "Accepting a valid request should succeed.");
      assertEquals((acceptResult as { success: boolean }).success, true);

      // Verify effects: request removed, friendship created
      davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders.length, 0, "Pending request should be removed after acceptance.");

      const davidFriends = await friendsConcept._getFriends({ user: userDavid });
      assertEquals(davidFriends[0].friends, [userAlice], "David should be friends with Alice.");
      const aliceFriends = await friendsConcept._getFriends({ user: userAlice });
      assertEquals(aliceFriends[0].friends, [userDavid], "Alice should be friends with David.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: rejectFriendRequest - requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    await test.step("Cannot reject if no pending request", async () => {
      console.log(`  Attempting ${userBob} to reject request from ${userCharlie} (no request sent)`);
      const result = await friendsConcept.rejectFriendRequest({ recipient: userBob, sender: userCharlie });
      assertEquals("error" in result, true, "Should not allow rejecting if no request exists.");
      assertEquals((result as { error: string }).error, "No pending friend request from sender to recipient.");
    });

    await test.step("Successfully rejects a request", async () => {
      await friendsConcept.sendFriendRequest({ sender: userCharlie, recipient: userDavid });
      let davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders, [userCharlie], "David should have a pending request.");

      console.log(`  ${userDavid} rejects request from ${userCharlie}`);
      const rejectResult = await friendsConcept.rejectFriendRequest({ recipient: userDavid, sender: userCharlie });
      assertEquals("error" in rejectResult, false, "Rejecting a valid request should succeed.");
      assertEquals((rejectResult as { success: boolean }).success, true);

      // Verify effects: request removed, no friendship created
      davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders.length, 0, "Pending request should be removed after rejection.");

      const davidFriends = await friendsConcept._getFriends({ user: userDavid });
      assertEquals(davidFriends[0].friends.length, 0, "No friendship should be created after rejection.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeFriend - requirements and effects", async (test) => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    await test.step("Cannot remove if no existing friendship", async () => {
      console.log(`  Attempting ${userAlice} to remove non-existent friend ${userCharlie}`);
      const result = await friendsConcept.removeFriend({ user1: userAlice, user2: userCharlie });
      assertEquals("error" in result, true, "Should not allow removing if no friendship exists.");
      assertEquals((result as { error: string }).error, "No existing friendship between the users.");
    });

    await test.step("Successfully removes an existing friendship", async () => {
      // Establish initial friendship
      await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
      await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });
      let aliceFriends = await friendsConcept._getFriends({ user: userAlice });
      assertEquals(aliceFriends[0].friends, [userBob], "Alice should be friends with Bob initially.");

      console.log(`  ${userAlice} removes ${userBob} as friend`);
      const removeResult = await friendsConcept.removeFriend({ user1: userAlice, user2: userBob });
      assertEquals("error" in removeResult, false, "Removing an existing friend should succeed.");
      assertEquals((removeResult as { success: boolean }).success, true);

      // Verify effects: friendship removed
      aliceFriends = await friendsConcept._getFriends({ user: userAlice });
      assertEquals(aliceFriends[0].friends.length, 0, "Alice should no longer have Bob as a friend.");
      const bobFriends = await friendsConcept._getFriends({ user: userBob });
      assertEquals(bobFriends[0].friends.length, 0, "Bob should no longer have Alice as a friend.");

      const isFriendshipVerified = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userBob });
      assertEquals(isFriendshipVerified[0].isFriend, false, "Friendship should no longer be verified.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _verifyFriendship, _getFriends, _getSentRequests, _getReceivedRequests", async (test) => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    // Setup various states:
    // Alice and Bob are friends
    await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
    await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });

    // Charlie sent request to David
    await friendsConcept.sendFriendRequest({ sender: userCharlie, recipient: userDavid });

    // David sent request to Eve (pending)
    await friendsConcept.sendFriendRequest({ sender: userDavid, recipient: userEve });

    await test.step("Query: _verifyFriendship", async () => {
      const fb_ab = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userBob });
      assertEquals(fb_ab[0].isFriend, true, "Alice and Bob should be friends.");

      const fb_ac = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userCharlie });
      assertEquals(fb_ac[0].isFriend, false, "Alice and Charlie should not be friends.");

      const fb_cd = await friendsConcept._verifyFriendship({ user1: userCharlie, user2: userDavid });
      assertEquals(fb_cd[0].isFriend, false, "Charlie and David should not be friends (only a request was sent).");
    });

    await test.step("Query: _getFriends", async () => {
      const aliceFriends = await friendsConcept._getFriends({ user: userAlice });
      // Corrected expectation: Alice is only friends with Bob.
      assertEquals(aliceFriends[0].friends.sort(), [userBob].sort(), "Alice's friends should only include Bob.");
      
      const bobFriends = await friendsConcept._getFriends({ user: userBob });
      assertEquals(bobFriends[0].friends.sort(), [userAlice].sort(), "Bob's friends should include Alice.");

      const charlieFriends = await friendsConcept._getFriends({ user: userCharlie });
      assertEquals(charlieFriends[0].friends.length, 0, "Charlie should have no friends yet.");
    });

    await test.step("Query: _getSentRequests", async () => {
      const aliceSent = await friendsConcept._getSentRequests({ user: userAlice });
      assertEquals(aliceSent[0].recipients.length, 0, "Alice should have no pending sent requests (Bob accepted).");

      const charlieSent = await friendsConcept._getSentRequests({ user: userCharlie });
      assertEquals(charlieSent[0].recipients, [userDavid], "Charlie should have a sent request to David.");

      const davidSent = await friendsConcept._getSentRequests({ user: userDavid });
      assertEquals(davidSent[0].recipients, [userEve], "David should have a sent request to Eve.");
    });

    await test.step("Query: _getReceivedRequests", async () => {
      const aliceReceived = await friendsConcept._getReceivedRequests({ user: userAlice });
      assertEquals(aliceReceived[0].senders.length, 0, "Alice should have no pending received requests (David's request was not sent to Alice in this setup)."); // Corrected comment - D sends to E

      const bobReceived = await friendsConcept._getReceivedRequests({ user: userBob });
      assertEquals(bobReceived[0].senders.length, 0, "Bob should have no pending received requests (Alice accepted).");

      const davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders, [userCharlie], "David should have a received request from Charlie.");
      
      const eveReceived = await friendsConcept._getReceivedRequests({ user: userEve });
      assertEquals(eveReceived[0].senders, [userDavid], "Eve should have a received request from David.");
    });
  } finally {
    await client.close();
  }
});