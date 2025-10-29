---
timestamp: 'Tue Oct 28 2025 01:51:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_015130.89de73e6.md]]'
content_id: fb51251e0eedfc5af0fae18ecdbd63f0efd7468a23d9b3c655f8569ff43b6686
---

# API Specification: Friends Concept

**Purpose:** support users in establishing and managing mutual connections with other users

***

## API Endpoints

### POST /api/Friends/sendFriendRequest

**Description:** Sends a new friend request from a sender to a recipient.

**Requirements:**

* `sender` is not equal to `recipient`
* There is no existing `Friendship` between `sender` and `recipient`
* There is no existing `FriendRequest` from `sender` to `recipient`
* There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)

**Effects:**

* A new `FriendRequest` is created from `sender` to `recipient`.
* Returns `success: true` if successful, or `error: String` if any precondition is not met.

**Request Body:**

```json
{
  "sender": "string",
  "recipient": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/acceptFriendRequest

**Description:** Accepts an existing friend request, removing the request and establishing a new friendship.

**Requirements:**

* There is an existing `FriendRequest` from `sender` to `recipient`

**Effects:**

* The `FriendRequest` from `sender` to `recipient` is removed.
* A new `Friendship` is created between `sender` and `recipient`. (The concept ensures `userA` and `userB` are stored in canonical order).
* Returns `success: true` if successful, or `error: String` if the precondition is not met.

**Request Body:**

```json
{
  "recipient": "string",
  "sender": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/rejectFriendRequest

**Description:** Rejects an existing friend request, removing the request.

**Requirements:**

* There is an existing `FriendRequest` from `sender` to `recipient`

**Effects:**

* The `FriendRequest` from `sender` to `recipient` is removed.
* Returns `success: true` if successful, or `error: String` if the precondition is not met.

**Request Body:**

```json
{
  "recipient": "string",
  "sender": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/removeFriend

**Description:** Removes an existing friendship between two users.

**Requirements:**

* There is an existing `Friendship` between `user1` and `user2`

**Effects:**

* The `Friendship` between `user1` and `user2` is removed.
* Returns `success: true` if successful, or `error: String` if the precondition is not met.

**Request Body:**

```json
{
  "user1": "string",
  "user2": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/\_verifyFriendship

**Description:** Checks if there is an existing friendship between two users.

**Requirements:**

* true

**Effects:**

* returns `true` if there is an existing `Friendship` between `user1` and `user2`; otherwise, returns `false`.
* Queries always return an array.

**Request Body:**

```json
{
  "user1": "string",
  "user2": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "isFriend": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/\_getFriends

**Description:** Retrieves the set of all users with whom a given user has an active friendship.

**Requirements:**

* true

**Effects:**

* returns the set of all users with whom `user` has an active `Friendship`.
* Queries always return an array.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "friends": "string[]"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/\_getSentRequests

**Description:** Retrieves the set of all users to whom a given user has sent a friend request.

**Requirements:**

* true

**Effects:**

* returns the set of all users to whom `user` has sent a `FriendRequest`.
* Queries always return an array.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipients": "string[]"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friends/\_getReceivedRequests

**Description:** Retrieves the set of all users who have sent a friend request to a given user.

**Requirements:**

* true

**Effects:**

* returns the set of all users who have sent a `FriendRequest` to `user`.
* Queries always return an array.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "senders": "string[]"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
