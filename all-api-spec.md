# API Specification: Friends Concept

**Purpose:** support users in establishing and managing mutual connections with other users

---

## API Endpoints

### POST /api/Friends/sendFriendRequest

**Description:** Sends a friend request from one user to another.

**Requirements:**
- `sender` is not equal to `recipient`
- There is no existing `Friendship` between `sender` and `recipient`
- There is no existing `FriendRequest` from `sender` to `recipient`
- There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)

**Effects:**
- A new `FriendRequest` is created from `sender` to `recipient`.
- Returns `success: true` if successful.

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
---
### POST /api/Friends/acceptFriendRequest

**Description:** Accepts a pending friend request, creating a mutual friendship.

**Requirements:**
- There is an existing `FriendRequest` from `sender` to `recipient`.

**Effects:**
- The `FriendRequest` from `sender` to `recipient` is removed.
- A new `Friendship` is created between `sender` and `recipient`.
- Returns `success: true` if successful.

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
---
### POST /api/Friends/rejectFriendRequest

**Description:** Rejects a pending friend request from another user.

**Requirements:**
- There is an existing `FriendRequest` from `sender` to `recipient`.

**Effects:**
- The `FriendRequest` from `sender` to `recipient` is removed.
- Returns `success: true` if successful.

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
---
### POST /api/Friends/removeFriend

**Description:** Removes an existing friendship between two users.

**Requirements:**
- There is an existing `Friendship` between `user1` and `user2`.

**Effects:**
- The `Friendship` between `user1` and `user2` is removed.
- Returns `success: true` if successful.

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
---
### POST /api/Friends/_verifyFriendship

**Description:** Checks if a friendship exists between two users.

**Requirements:**
- true

**Effects:**
- Returns `true` if there is an existing `Friendship` between `user1` and `user2`; otherwise, returns `false`.

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
---
### POST /api/Friends/_getFriends

**Description:** Retrieves a list of all friends for a given user.

**Requirements:**
- true

**Effects:**
- Returns the set of all users with whom `user` has an active `Friendship`.

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
---
### POST /api/Friends/_getSentRequests

**Description:** Retrieves all outgoing friend requests sent by a user.

**Requirements:**
- true

**Effects:**
- Returns the set of all users to whom `user` has sent a `FriendRequest`.

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
---
### POST /api/Friends/_getReceivedRequests

**Description:** Retrieves all incoming friend requests received by a user.

**Requirements:**
- true

**Effects:**
- Returns the set of all users who have sent a `FriendRequest` to `user`.

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
---
# API Specification: Post Concept

**Purpose:** create a visible and retrievable record about a target, attributed to a user.

---

## API Endpoints

### POST /api/Post/create

**Description:** Creates a new post with the given content and attributes it to a user.

**Requirements:**
- Implicitly true; no specific preconditions are mentioned in the concept definition.

**Effects:**
- Adds a new post with a unique postId, associating the provided userId, content, and timestamp, returning the created post's identifier.

**Request Body:**
```json
{
  "userId": "ID",
  "content": "string",
  "timestamp": "Date"
}
```

**Success Response Body (Action):**
```json
{
  "post": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/delete

**Description:** Removes a specified post from the system.

**Requirements:**
- The post with the given `post` ID must exist.

**Effects:**
- Removes the specified post from the system.

**Request Body:**
```json
{
  "post": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/_getPostsByAuthor

**Description:** Retrieves all posts created by a specific author.

**Requirements:**
- The `authorId` is a valid identifier.

**Effects:**
- Returns an array of all posts authored by the given `authorId`.
- If no posts are found for the author, an empty array is returned.

**Request Body:**
```json
{
  "authorId": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "ID",
      "userId": "ID",
      "content": "string",
      "timestamp": "Date"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/_getPostById

**Description:** Retrieves a single post by its unique identifier.

**Requirements:**
- The `postId` is a valid identifier.

**Effects:**
- Returns the post with the matching `postId`.
- If no post is found with the given ID, an empty array is returned.

**Request Body:**
```json
{
  "postId": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "ID",
      "userId": "ID",
      "content": "string",
      "timestamp": "Date"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: Ranking Concept

**Purpose:** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.

---

## API Endpoints

### POST /api/Ranking/addComparison

**Description:** Adds or updates song rankings for a user based on a preference between two songs, or adds a single song with a default score.

**Requirements:**
- user exists in the concept state, or a new ranking can be created for them
- preferred is either songA or songB (if songB is provided)
- if songB is not provided, preferred must be songA

**Effects:**
- If the `user` does not have a `UserRanking`, an empty one is created for them.
- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
- If `songB` is not provided, only `songA` is added to the ranking with default score.
- If `songB` is provided, adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

**Request Body:**
```json
{
  "user": "ID",
  "songA": "ID",
  "songB": "ID",
  "preferred": "ID"
}
```
*Note: `songB` is optional.*

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Ranking/remove

**Description:** Removes a specific song from a user's ranked list.

**Requirements:**
- user exists in the concept state
- song exists in the `RankedSong` set for the given `user`

**Effects:**
- deletes `song` from the `user`'s `RankedSong` set.

**Request Body:**
```json
{
  "user": "ID",
  "song": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Ranking/_getRankings

**Description:** Retrieves a user's current song rankings, sorted by score in descending order.

**Requirements:**
- user exists in the concept state (has a ranking)

**Effects:**
- returns the current `RankedSong` entries for the `user`, ordered by `score` (descending).

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**
*Note: This query returns a single object containing an array, not an array of objects.*
```json
{
  "rankedSongs": [
    {
      "songId": "ID",
      "score": "number"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: Reaction Concept

**Purpose:** allow users to respond to posts with lightweight emoji feedback

---

## API Endpoints

### POST /api/Reaction/add

**Description:** Adds an emoji reaction from a user to a post.

**Requirements:**
- The user has not already added the exact same emoji reaction to the same post.

**Effects:**
- A new reaction entity is created with a unique ID, associated with the given post, user, and emoji type.
- Returns the unique ID of the newly created reaction.

**Request Body:**
```json
{
  "post": "ID",
  "reactionType": "string",
  "reactingUser": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "reactionId": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/remove

**Description:** Removes a specific emoji reaction that a user previously added to a post.

**Requirements:**
- A reaction from the specified user with the specified emoji must exist on the post.

**Effects:**
- The matching reaction is deleted.

**Request Body:**
```json
{
  "post": "ID",
  "reactionType": "string",
  "reactingUser": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/_getReactionsForPost

**Description:** Retrieves all reactions for a specific post.

**Requirements:**
- None. This query can always be performed.

**Effects:**
- Returns the set of all reaction entities associated with the specified post.

**Request Body:**
```json
{
  "post": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "reactions": {
      "_id": "ID",
      "post": "ID",
      "reactionType": "string",
      "reactingUser": "ID"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/_getReactionsByPostAndUser

**Description:** Retrieves all reactions made by a specific user on a specific post.

**Requirements:**
- None. This query can always be performed.

**Effects:**
- Returns the set of all reaction entities associated with the specified post and user.

**Request Body:**
```json
{
  "post": "ID",
  "reactingUser": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "reactions": {
      "_id": "ID",
      "post": "ID",
      "reactionType": "string",
      "reactingUser": "ID"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: SongRecommender Concept

**Purpose:** To manage a catalog of songs for each user, track their listening history, and provide new song recommendations.

---

## API Endpoints

### POST /api/SongRecommender/addSongToCatalog

**Description:** Adds one or more new songs to a user's catalog of songs available for future recommendations.

**Requirements:**
- The songs to be added must not already be in the user's `pastRecommendations` list.
- The songs to be added must not already be in the user's `notYetRecommendedSongs` list.

**Effects:**
- Adds the specified songs to the user's `notYetRecommendedSongs` array.
- If the user does not have a catalog, a new one is created for them.

**Request Body:**
```json
{
  "userId": "ID",
  "songs": ["ID"]
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "Song '...' is already pending recommendation for user '...'."
}
```
---
### POST /api/SongRecommender/generateRecommendation

**Description:** Selects a specified number of songs from the user's available songs, moves them to their history, and returns them as recommendations.

**Requirements:**
- The `count` must be a positive number.
- The `count` must be less than or equal to the number of songs in the user's `notYetRecommendedSongs` list.
- The user must have a song catalog.

**Effects:**
- Moves `count` songs from the user's `notYetRecommendedSongs` list to their `pastRecommendations` list.
- Returns the `count` songs that were moved.

**Request Body:**
```json
{
  "userId": "ID",
  "count": "number"
}
```

**Success Response Body (Action):**
```json
{
  "recommendations": ["ID"]
}
```

**Error Response Body:**
```json
{
  "error": "Not enough songs available for user '...'. Requested ..., but only ... are available."
}
```
---
### POST /api/SongRecommender/removeSongsFromCatalog

**Description:** Removes specified songs from a user's list of songs available for recommendation.

**Requirements:**
- The user must have a song catalog.
- All specified songs must exist in the user's `notYetRecommendedSongs` list.

**Effects:**
- Removes the specified songs from the user's `notYetRecommendedSongs` list.

**Request Body:**
```json
{
  "userId": "ID",
  "songs": ["ID"]
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "Song '...' not found in not-yet-recommended songs for user '...'."
}
```
---
### POST /api/SongRecommender/removeSongsFromPastRecommendations

**Description:** Removes specified songs from a user's list of past recommendations.

**Requirements:**
- The user must have a song catalog.
- All specified songs must exist in the user's `pastRecommendations` list.

**Effects:**
- Removes the specified songs from the user's `pastRecommendations` list.

**Request Body:**
```json
{
  "userId": "ID",
  "songs": ["ID"]
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "Song '...' not found in past recommendations for user '...'."
}
```
---
### POST /api/SongRecommender/getPastRecommendations

**Description:** Retrieves the list of songs that have been previously recommended to a user.

**Requirements:**
- The user must have a song catalog.

**Effects:**
- Returns the user's `pastRecommendations` array.

**Request Body:**
```json
{
  "userId": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "pastRecommendations": ["ID"]
}
```

**Error Response Body:**
```json
{
  "error": "User '...' not found or has no song catalog."
}
```
---
### POST /api/SongRecommender/getNotYetRecommended

**Description:** Retrieves the list of songs available to be recommended to a user.

**Requirements:**
- The user must have a song catalog.

**Effects:**
- Returns the user's `notYetRecommendedSongs` array.

**Request Body:**
```json
{
  "userId": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "notYetRecommendedSongs": ["ID"]
}
```

**Error Response Body:**
```json
{
  "error": "User '...' not found or has no song catalog."
}
```
---
# API Specification: UserAuthentication Concept

**Purpose:** To securely manage user identities and credentials, allowing users to prove who they are.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user with a username and password.

**Requirements:**
- No User exists with the given `username`.

**Effects:**
- A new `salt` is generated (e.g., a cryptographically secure random string).
- The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
- A new `User` is created.
- The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
- Returns the new `User` identifier.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/authenticate

**Description:** Verifies a user's credentials and returns their identifier upon success.

**Requirements:**
- A User exists with the given `username`.

**Effects:**
- The `salt` associated with the User identified by `username` is retrieved from the state.
- The provided `password` is combined with the retrieved `salt` and hashed using the same cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
- If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns the `User` identifier.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/delete

**Description:** Deletes a user and all their associated data.

**Requirements:**
- The given `user` exists in the state.

**Effects:**
- The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/changePassword

**Description:** Updates a user's password after verifying their old password.

**Requirements:**
- The given `user` exists in the state.
- The `oldPassword`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.

**Effects:**
- A *new* `salt` is generated for the `user`.
- The `newPassword` is combined with the new `salt` and hashed, resulting in an updated `hashedPassword`.
- The `user`'s `hashedPassword` and `salt` are updated in the state.

**Request Body:**
```json
{
  "user": "ID",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/changeUsername

**Description:** Updates a user's username after verifying their password.

**Requirements:**
- The given `user` exists in the state.
- The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
- No other `User` exists with the `newUsername`.

**Effects:**
- The `user`'s `username` in the state is updated to `newUsername`.

**Request Body:**
```json
{
  "user": "ID",
  "newUsername": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/_getUserByUsername

**Description:** Retrieves a user's identifier by their username.

**Requirements:**
- A User exists with the given `username`.

**Effects:**
- Returns the `User` identifier associated with the `username`.

**Request Body:**
```json
{
  "username": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/_getUsername

**Description:** Retrieves a username by their user identifier.

**Requirements:**
- The given `user` exists.

**Effects:**
- Returns the `username` of the `user`.

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
    "username": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---