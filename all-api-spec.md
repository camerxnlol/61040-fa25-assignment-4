# API Specification: Post Concept

**Purpose:** create a visible and retrievable record about a target, attributed to a user.

---

## API Endpoints

### POST /api/Post/create

**Description:** Creates a new post, associating the provided user ID, content, and timestamp.

**Requirements:**
- Implicitly true; no specific preconditions are mentioned in the concept definition.

**Effects:**
- Adds a new post with a unique postId, associating the provided userId, content, and timestamp, returning the created post's identifier.

**Request Body:**
```json
{
  "userId": "string",
  "content": "string",
  "timestamp": "string"
}
```

**Success Response Body (Action):**
```json
{
  "post": "string"
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

**Description:** Removes the specified post from the system.

**Requirements:**
- The post with the given `post` ID must exist.

**Effects:**
- Removes the specified post from the system.

**Request Body:**
```json
{
  "post": "string"
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

**Description:** Returns an array of all posts authored by the given author ID.

**Requirements:**
- The `authorId` is a valid identifier.

**Effects:**
- Returns an array of all posts authored by the given `authorId`.
- If no posts are found for the author, an empty array is returned.

**Request Body:**
```json
{
  "authorId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "string",
      "userId": "string",
      "content": "string",
      "timestamp": "string"
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

**Description:** Returns the post with the matching post ID.

**Requirements:**
- The `postId` is a valid identifier.

**Effects:**
- Returns the post with the matching `postId`.
- If no post is found with the given ID, an empty array is returned.

**Request Body:**
```json
{
  "postId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "string",
      "userId": "string",
      "content": "string",
      "timestamp": "string"
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

**Description:** Allows a user to compare two songs, indicating which one is preferred, and dynamically updates their personalized ranking based on this comparison.

**Requirements:**
- user exists in the concept state, or a new ranking can be created for them
- preferred is either songA or songB

**Effects:**
- If the `user` does not have a `UserRanking`, an empty one is created for them.
- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

**Request Body:**
```json
{
  "user": "ID",
  "songA": "ID",
  "songB": "ID",
  "preferred": "ID"
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

### POST /api/Ranking/remove

**Description:** Deletes a specific song from a user's personalized ranked song set.

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

**Description:** Retrieves a user's current ranked songs, ordered by their assigned score in descending order.

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
```json
[
  {
    "songId": "ID",
    "score": "number"
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
# API Specification: Reaction Concept

**Purpose:** allow users to respond to posts with lightweight emoji feedback

---

## API Endpoints

### POST /api/Reaction/add

**Description:** Adds a new emoji reaction by a user to a specific post.

**Requirements:**
- reactionType IS_VALID_EMOJI (Note: In the current implementation, any string is treated as a valid EmojiString.)
- User cannot add the exact same emoji reaction to the same post twice.

**Effects:**
- create new_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser
- add new_reaction to Reaction
- returns new_reaction.id as 'reactionId'

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

**Description:** Removes a specific emoji reaction by a user from a post.

**Requirements:**
- EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

**Effects:**
- delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

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

**Description:** Retrieves all reactions associated with a specific post.

**Requirements:**
- true

**Effects:**
- returns the set of all Reaction entities where reaction.post == post

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

**Description:** Retrieves all reactions for a specific post by a specific user.

**Requirements:**
- true

**Effects:**
- returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser

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

# API Specification: SongRecommender Concept

**Purpose:** support the recommendation of songs to users by managing a catalog of available and previously recommended songs.

---

## API Endpoints

### POST /api/SongRecommender/addSongToCatalog

**Description:** Adds a new song to a user's list of songs that are available for future recommendations, ensuring it's not a duplicate within their catalog.

**Requirements:**
- The provided `songId` is not in the `pastRecommendations` for the given `userId`.
- The provided `songId` is not in the `notYetRecommendedSongs` for the given `userId`.

**Effects:**
- The `songId` is added to the `notYetRecommendedSongs` for the `userId`.
- If a catalog for the `userId` does not exist, a new one is created with the `songId` in `notYetRecommendedSongs`.

**Request Body:**
```json
{
  "userId": "string",
  "songId": "string"
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

### POST /api/SongRecommender/generateRecommendation

**Description:** Selects a specified number of songs from a user's `notYetRecommendedSongs`, moves them to `pastRecommendations`, and returns the selected songs as recommendations.

**Requirements:**
- The `count` for recommendations must be a positive number.
- The `userId` must have an initialized song catalog.
- The `count` must be less than or equal to the number of songs currently in `notYetRecommendedSongs` for the `userId`.

**Effects:**
- `count` songs are moved from `notYetRecommendedSongs` to `pastRecommendations` for the `userId`.
- Returns the `count` recommended song IDs.

**Request Body:**
```json
{
  "userId": "string",
  "count": "number"
}
```

**Success Response Body (Action):**
```json
{
  "recommendedSongs": ["string"]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/SongRecommender/removeSong

**Description:** Removes a specified song from the user's list of songs available for future recommendations.

**Requirements:**
- The `userId` must have an initialized song catalog.
- The `songId` must be present in the `notYetRecommendedSongs` list for the `userId`.

**Effects:**
- The `songId` is removed from `notYetRecommendedSongs` for the `userId`.

**Request Body:**
```json
{
  "userId": "string",
  "songId": "string"
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

# API Specification: UserAuthentication Concept

**Purpose:** To securely manage user identities and credentials, allowing users to prove who they are.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account with a unique username and a securely hashed password.

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
  "user": "string"
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

**Description:** Verifies user credentials and returns the user identifier upon successful authentication.

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
  "user": "string"
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

**Description:** Removes a user and all their associated credentials from the system.

**Requirements:**
- The given `user` exists in the state.

**Effects:**
- The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

**Request Body:**
```json
{
  "user": "string"
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

**Description:** Updates a user's password after verifying the old password.

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
  "user": "string",
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

**Description:** Updates a user's username after verifying their password and ensuring the new username is unique.

**Requirements:**
- The given `user` exists in the state.
- The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
- No other `User` exists with the `newUsername`.

**Effects:**
- The `user`'s `username` in the state is updated to `newUsername`.

**Request Body:**
```json
{
  "user": "string",
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

**Description:** Retrieves the user identifier for a given username.

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
    "user": "string"
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

**Description:** Retrieves the username for a given user identifier.

**Requirements:**
- The given `user` exists.

**Effects:**
- Returns the `username` of the `user`.

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