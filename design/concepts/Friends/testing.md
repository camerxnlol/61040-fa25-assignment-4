[@implementation](../Friends/implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@example-testing](../LikertSurvey/testing.md)

# test: Friends
# response:

# file: src/friends/FriendsConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendsConcept from "./FriendsConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;

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

Deno.test("Action: sendFriendRequest - requirements", async (test) => {
  const [db, client] = await testDb();
  const friendsConcept = new FriendsConcept(db);

  try {
    await test.step("Cannot send friend request to self", async () => {
      console.log(`  Attempting ${userAlice} to send request to ${userAlice}`);
      const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userAlice });
      assertEquals("error" in result, true, "Should not allow sending request to self.");
      assertEquals((result as { error: string }).error, "Cannot send friend request to self.");
    });

    await test.step("Cannot send if friendship already exists", async () => {
      // Establish initial friendship
      await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
      await friendsConcept.acceptFriendRequest({ recipient: userBob, sender: userAlice });

      console.log(`  Attempting ${userAlice} to send request to ${userBob} (already friends)`);
      const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userBob });
      assertEquals("error" in result, true, "Should not allow sending request if friendship exists.");
      assertEquals((result as { error: string }).error, "Friendship already exists.");
    });

    await test.step("Cannot send if request already sent", async () => {
      // Initial request
      await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });

      console.log(`  Attempting ${userAlice} to send request to ${userCharlie} again`);
      const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });
      assertEquals("error" in result, true, "Should not allow sending duplicate request.");
      assertEquals((result as { error: string }).error, "Friend request already sent.");
    });

    await test.step("Cannot send if request already received (reverse direction)", async () => {
      // Charlie sends to Alice
      await friendsConcept.sendFriendRequest({ sender: userCharlie, recipient: userAlice });

      console.log(`  Attempting ${userAlice} to send request to ${userCharlie} (Charlie already sent to Alice)`);
      const result = await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });
      assertEquals("error" in result, true, "Should not allow sending request if a request from recipient to sender already exists.");
      assertEquals((result as { error: string }).error, "Friend request already received from recipient.");
    });
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

    // David sent request to Alice (pending)
    await friendsConcept.sendFriendRequest({ sender: userDavid, recipient: userAlice });

    await test.step("Query: _verifyFriendship", async () => {
      const fb_ab = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userBob });
      assertEquals(fb_ab[0].isFriend, true, "Alice and Bob should be friends.");

      const fb_ac = await friendsConcept._verifyFriendship({ user1: userAlice, user2: userCharlie });
      assertEquals(fb_ac[0].isFriend, false, "Alice and Charlie should not be friends.");
    });

    await test.step("Query: _getFriends", async () => {
      const aliceFriends = await friendsConcept._getFriends({ user: userAlice });
      assertEquals(aliceFriends[0].friends.sort(), [userBob, userDavid].sort(), "Alice's friends should include Bob."); // David is now a friend due to _getFriends finding him via _getCanonicalUsers
      
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
      assertEquals(davidSent[0].recipients, [userAlice], "David should have a sent request to Alice.");
    });

    await test.step("Query: _getReceivedRequests", async () => {
      const aliceReceived = await friendsConcept._getReceivedRequests({ user: userAlice });
      assertEquals(aliceReceived[0].senders, [userDavid], "Alice should have a received request from David.");

      const bobReceived = await friendsConcept._getReceivedRequests({ user: userBob });
      assertEquals(bobReceived[0].senders.length, 0, "Bob should have no pending received requests (Alice accepted).");

      const davidReceived = await friendsConcept._getReceivedRequests({ user: userDavid });
      assertEquals(davidReceived[0].senders, [userCharlie], "David should have a received request from Charlie.");
    });
  } finally {
    await client.close();
  }
});
```

# trace:

The following trace demonstrates how the **principle** of the `Friends` concept is fulfilled: "if a user sends a friend request to another user, and the recipient accepts, then both users will be mutually connected as friends."

1.  **Given**: Two users, `userAlice` and `userBob`. Neither is friends with the other, and no friend requests are pending between them.

2.  **Action**: `userAlice` sends a friend request to `userBob`.
    ```
    Friends.sendFriendRequest({ sender: "user:Alice", recipient: "user:Bob" })
    ```
3.  **Result**: The action succeeds, returning `{ success: true }`. A `FriendRequest` entry is created in the concept's state, linking `user:Alice` as the sender and `user:Bob` as the recipient.
    *   Query check: `Friends._getSentRequests({ user: "user:Alice" })` returns `[{ recipients: ["user:Bob"] }]`.
    *   Query check: `Friends._getReceivedRequests({ user: "user:Bob" })` returns `[{ senders: ["user:Alice"] }]`.
    *   Query check: `Friends._verifyFriendship({ user1: "user:Alice", user2: "user:Bob" })` returns `[{ isFriend: false }]`.

4.  **Action**: `userBob` accepts the friend request from `userAlice`.
    ```
    Friends.acceptFriendRequest({ recipient: "user:Bob", sender: "user:Alice" })
    ```
5.  **Result**: The action succeeds, returning `{ success: true }`. The pending `FriendRequest` is removed from the state, and a new `Friendship` entry is created, establishing a mutual connection between `user:Alice` and `user:Bob`.
    *   Query check: `Friends._getSentRequests({ user: "user:Alice" })` returns `[{ recipients: [] }]`.
    *   Query check: `Friends._getReceivedRequests({ user: "user:Bob" })` returns `[{ senders: [] }]`.
    *   Query check: `Friends._verifyFriendship({ user1: "user:Alice", user2: "user:Bob" })` returns `[{ isFriend: true }]`.
    *   Query check: `Friends._getFriends({ user: "user:Alice" })` returns `[{ friends: ["user:Bob"] }]`.
    *   Query check: `Friends._getFriends({ user: "user:Bob" })` returns `[{ friends: ["user:Alice"] }]`.

This trace demonstrates that after the sequence of sending and accepting a friend request, the two users are indeed mutually connected as friends, and the intermediate request state is resolved, fulfilling the stated principle.

# prompt: Action: sendFriendRequest - requirements ... Cannot send if request already received (reverse direction) => ./src/concepts/Friends/FreindsConcept.test.ts:87:16Queries: _verifyFriendship, _getFriends, _getSentRequests, _getReceivedRequests ... Query: _getFriends => ./src/concepts/Friends/FreindsConcept.test.ts:233:16 FAILED | 41 passed (41 steps) | 2 failed (2 steps) (30s) error: Test failed. Is this a test error or implementation error?
# response:

It looks like you've pinpointed two distinct issues based on the test output. Let's break them down:

### 1. `Action: sendFriendRequest - requirements ... Cannot send if request already received (reverse direction)`

This failure indicates a problem with the test setup or state management between test steps within the `Deno.test("Action: sendFriendRequest - requirements", ...)` block.

**Analysis:**
The `Deno.test.beforeAll` hook ensures the database is dropped *before each test file*. However, if you have multiple `test.step` calls within a single `Deno.test` block, the database state persists *between those steps*.

In your test, the step `Cannot send if request already sent` first executes:
```typescript
// Initial request
await friendsConcept.sendFriendRequest({ sender: userAlice, recipient: userCharlie });
```
This leaves a pending request from `userAlice` to `userCharlie` in the database.

Then, the next step `Cannot send if request already received (reverse direction)` executes:
```typescript
// Charlie sends to Alice
await friendsConcept.sendFriendRequest({ sender: userCharlie, recipient: userAlice });
```
When this call runs, the `sendFriendRequest` method checks for existing requests, including one from `recipient` (`userAlice`) to `sender` (`userCharlie`). It finds the request created in the *previous step* (`Alice -> Charlie`), which makes this call fail with the error "Friend request already received from recipient." This is likely not the scenario you intended to test at this point, or it prevents the subsequent assertion from running in the expected state.

**Solution for Failure 1:**
The most robust way to handle this is to split each distinct requirement test into its own top-level `Deno.test` block. This ensures that `testDb()` provides a clean database state for *each* requirement test, preventing state leaks between them.

### 2. `Queries: _verifyFriendship, _getFriends, _getSentRequests, _getReceivedRequests ... Query: _getFriends`

This failure points to an incorrect expectation in your test assertion for the `_getFriends` query.

**Analysis:**
In the setup for the "Queries" test:
*   Alice and Bob become friends: `Friendship { userA: "user:Alice", userB: "user:Bob" }` is created.
*   Charlie sends a request to David: `FriendRequest { sender: "user:Charlie", recipient: "user:David" }` is created.
*   David sends a request to Alice: `FriendRequest { sender: "user:David", recipient: "user:Alice" }` is created.

When you query for Alice's friends:
```typescript
const aliceFriends = await friendsConcept._getFriends({ user: userAlice });
assertEquals(aliceFriends[0].friends.sort(), [userBob, userDavid].sort(), "Alice's friends should include Bob.");
```
The `_getFriends` method correctly queries *only* the `friendships` collection. Based on the setup, Alice is only friends with Bob. David has sent a *request* to Alice, but Alice has *not yet accepted it*, so they are not friends.

Therefore, the expectation `[userBob, userDavid].sort()` is incorrect. It should only be `[userBob]`.

**Solution for Failure 2:**
Correct the assertion for Alice's friends:
```typescript
assertEquals(aliceFriends[0].friends.sort(), [userBob].sort(), "Alice's friends should include Bob.");
```

### Revised `src/friends/FriendsConcept.test.ts`

Here's the updated test file incorporating these fixes:

# file: src/friends/FriendsConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
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
```