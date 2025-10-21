---
timestamp: 'Sun Oct 19 2025 22:37:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223737.0b9d14b7.md]]'
content_id: 28465290053346e3b77677a5810ea6e99538a4ad679b04b3398b86f1b3be8652
---

# API Specification: Reaction Concept

**Purpose:** allow users to respond to posts with lightweight emoji feedback

***

## API Endpoints

### POST /api/Reaction/add

**Description:** Adds a new emoji reaction by a user to a specific post.

**Requirements:**

* reactionType IS\_VALID\_EMOJI (Note: In the current implementation, any string is treated as a valid EmojiString.)
* User cannot add the exact same emoji reaction to the same post twice.

**Effects:**

* create new\_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser
* add new\_reaction to Reaction
* returns new\_reaction.id as 'reactionId'

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

***

### POST /api/Reaction/remove

**Description:** Removes a specific emoji reaction by a user from a post.

**Requirements:**

* EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

**Effects:**

* delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

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

***

### POST /api/Reaction/\_getReactionsForPost

**Description:** Retrieves all reactions associated with a specific post.

**Requirements:**

* true

**Effects:**

* returns the set of all Reaction entities where reaction.post == post

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

***

### POST /api/Reaction/\_getReactionsByPostAndUser

**Description:** Retrieves all reactions for a specific post by a specific user.

**Requirements:**

* true

**Effects:**

* returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser

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
