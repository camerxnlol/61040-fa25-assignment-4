**concept** Friends \[User]

**purpose** support users in establishing and managing mutual connections with other users

**principle** if a user sends a friend request to another user, and the recipient accepts, then both users will be mutually connected as friends.

**state**
A concept for managing friendships maintains two main types of relationships: active friendships and pending friend requests. To avoid duplicate entries for mutual friendships, we assume `User` identifiers are comparable (e.g., as strings or numbers), and `userA` refers to the user with the lexicographically smaller identifier in a friendship.

```
a set of Friendships with
    userA: User  // User with the lexicographically smaller identifier
    userB: User  // User with the lexicographically larger identifier

a set of FriendRequests with
    sender: User
    recipient: User
```

**actions**

**sendFriendRequest (sender: User, recipient: User): (success: Boolean) or (error: String)**
*   **requires**
    *   `sender` is not equal to `recipient`
    *   There is no existing `Friendship` between `sender` and `recipient`
    *   There is no existing `FriendRequest` from `sender` to `recipient`
    *   There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)
*   **effects**
    *   A new `FriendRequest` is created from `sender` to `recipient`.
    *   Returns `success: true` if successful, or `error: String` if any precondition is not met.

**acceptFriendRequest (recipient: User, sender: User): (success: Boolean) or (error: String)**
*   **requires**
    *   There is an existing `FriendRequest` from `sender` to `recipient`
*   **effects**
    *   The `FriendRequest` from `sender` to `recipient` is removed.
    *   A new `Friendship` is created between `sender` and `recipient`. (The concept ensures `userA` and `userB` are stored in canonical order).
    *   Returns `success: true` if successful, or `error: String` if the precondition is not met.

**rejectFriendRequest (recipient: User, sender: User): (success: Boolean) or (error: String)**
*   **requires**
    *   There is an existing `FriendRequest` from `sender` to `recipient`
*   **effects**
    *   The `FriendRequest` from `sender` to `recipient` is removed.
    *   Returns `success: true` if successful, or `error: String` if the precondition is not met.

**removeFriend (user1: User, user2: User): (success: Boolean) or (error: String)**
*   **requires**
    *   There is an existing `Friendship` between `user1` and `user2`
*   **effects**
    *   The `Friendship` between `user1` and `user2` is removed.
    *   Returns `success: true` if successful, or `error: String` if the precondition is not met.

**queries**

**verifyFriendship (user1: User, user2: User): (isFriend: Boolean)**
*   **requires** true
*   **effects** returns `true` if there is an existing `Friendship` between `user1` and `user2`; otherwise, returns `false`.

**getFriends (user: User): (friends: set of User)**
*   **requires** true
*   **effects** returns the set of all users with whom `user` has an active `Friendship`.

**getSentRequests (user: User): (recipients: set of User)**
*   **requires** true
*   **effects** returns the set of all users to whom `user` has sent a `FriendRequest`.

**getReceivedRequests (user: User): (senders: set of User)**
*   **requires** true
*   **effects** returns the set of all users who have sent a