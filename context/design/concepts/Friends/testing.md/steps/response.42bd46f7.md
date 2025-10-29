---
timestamp: 'Tue Oct 28 2025 01:47:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014720.dac50340.md]]'
content_id: 42bd46f71fe6860df0aef7c91985aad75b4037e000a4be4a8483a05463480e68
---

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

* Alice and Bob become friends: `Friendship { userA: "user:Alice", userB: "user:Bob" }` is created.
* Charlie sends a request to David: `FriendRequest { sender: "user:Charlie", recipient: "user:David" }` is created.
* David sends a request to Alice: `FriendRequest { sender: "user:David", recipient: "user:Alice" }` is created.

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
