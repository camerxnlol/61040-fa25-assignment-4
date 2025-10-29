---
timestamp: 'Tue Oct 28 2025 01:44:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014446.2db7e386.md]]'
content_id: 64b280b340ee527f00e387ce76da48fe0d20259dd79289ebd5ffa41800d18331
---

# trace:

The following trace demonstrates how the **principle** of the `Friends` concept is fulfilled: "if a user sends a friend request to another user, and the recipient accepts, then both users will be mutually connected as friends."

1. **Given**: Two users, `userAlice` and `userBob`. Neither is friends with the other, and no friend requests are pending between them.

2. **Action**: `userAlice` sends a friend request to `userBob`.
   ```
   Friends.sendFriendRequest({ sender: "user:Alice", recipient: "user:Bob" })
   ```

3. **Result**: The action succeeds, returning `{ success: true }`. A `FriendRequest` entry is created in the concept's state, linking `user:Alice` as the sender and `user:Bob` as the recipient.
   * Query check: `Friends._getSentRequests({ user: "user:Alice" })` returns `[{ recipients: ["user:Bob"] }]`.
   * Query check: `Friends._getReceivedRequests({ user: "user:Bob" })` returns `[{ senders: ["user:Alice"] }]`.
   * Query check: `Friends._verifyFriendship({ user1: "user:Alice", user2: "user:Bob" })` returns `[{ isFriend: false }]`.

4. **Action**: `userBob` accepts the friend request from `userAlice`.
   ```
   Friends.acceptFriendRequest({ recipient: "user:Bob", sender: "user:Alice" })
   ```

5. **Result**: The action succeeds, returning `{ success: true }`. The pending `FriendRequest` is removed from the state, and a new `Friendship` entry is created, establishing a mutual connection between `user:Alice` and `user:Bob`.
   * Query check: `Friends._getSentRequests({ user: "user:Alice" })` returns `[{ recipients: [] }]`.
   * Query check: `Friends._getReceivedRequests({ user: "user:Bob" })` returns `[{ senders: [] }]`.
   * Query check: `Friends._verifyFriendship({ user1: "user:Alice", user2: "user:Bob" })` returns `[{ isFriend: true }]`.
   * Query check: `Friends._getFriends({ user: "user:Alice" })` returns `[{ friends: ["user:Bob"] }]`.
   * Query check: `Friends._getFriends({ user: "user:Bob" })` returns `[{ friends: ["user:Alice"] }]`.

This trace demonstrates that after the sequence of sending and accepting a friend request, the two users are indeed mutually connected as friends, and the intermediate request state is resolved, fulfilling the stated principle.
