---
timestamp: 'Wed Nov 05 2025 15:46:09 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_154609.216ea147.md]]'
content_id: 8101a46f85ed33ba73a38725b8931831f64f9c486b191eb3f3551a907aff0e0d
---

# API Specification: Friends Concept

**Purpose:** support users in establishing and managing mutual connections with other users

***

## API Endpoints

### POST /api/Friends/sendFriendRequest

**Description:** Sends a friend request from one user to another.

**Requirements:**

* `sender` is not equal to `recipient`
* There is no existing `Friendship` between `sender` and `recipient`
* There is no existing `FriendRequest` from `sender` to `recipient`
* There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)

**Effects:**

* A new `FriendRequest` is created from `sender` to `recipient`.
* Returns `success: true` if successful.

**Request Body:**

```json
{
  "sender": "ID",
  "recipient": "ID"
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

**Description:** Accepts a pending friend request, creating a mutual friendship.

**Requirements:**

* There is an existing `FriendRequest` from `sender` to `recipient`.

**Effects:**

* The `FriendRequest` from `sender` to `recipient` is removed.
* A new `Friendship` is created between `sender` and `recipient`.
* Returns `success: true` if successful.

**Request Body:**

```json
{
  "recipient": "ID",
  "sender": "ID"
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

**Description:** Rejects a pending friend request from another user.

**Requirements:**

* There is an existing `FriendRequest` from `sender` to `recipient`.

**Effects:**

* The `FriendRequest` from `sender` to `recipient` is removed.
* Returns `success: true` if successful.

**Request Body:**

```json
{
  "recipient": "ID",
  "sender": "ID"
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

* There is an existing `Friendship` between `user1` and `user2`.

**Effects:**

* The `Friendship` between `user1` and `user2` is removed.
* Returns `success: true` if successful.

**Request Body:**

```json
{
  "user1": "ID",
  "user2": "ID"
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

**Description:** Checks if a friendship exists between two users.

**Requirements:**

* true

**Effects:**

* Returns `true` if there is an existing `Friendship` between `user1` and `user2`; otherwise, returns `false`.

**Request Body:**

```json
{
  "user1": "ID",
  "user2": "ID"
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

**Description:** Retrieves a list of all friends for a given user.

**Requirements:**

* true

**Effects:**

* Returns the set of all users with whom `user` has an active `Friendship`.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "friends": [
      "ID"
    ]
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

**Description:** Retrieves all outgoing friend requests sent by a user.

**Requirements:**

* true

**Effects:**

* Returns the set of all users to whom `user` has sent a `FriendRequest`.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipients": [
      "ID"
    ]
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

**Description:** Retrieves all incoming friend requests received by a user.

**Requirements:**

* true

**Effects:**

* Returns the set of all users who have sent a `FriendRequest` to `user`.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "senders": [
      "ID"
    ]
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
