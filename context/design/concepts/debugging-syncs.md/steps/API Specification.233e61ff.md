---
timestamp: 'Fri Nov 07 2025 00:49:59 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004959.811d18fe.md]]'
content_id: 233e61ff353e3b15051fd96f8a5f5f784e2a0ba42606afedaaa744b016e5369d
---

# API Specification: Reaction Concept

**Purpose:** allow users to respond to posts with lightweight emoji feedback

***

## API Endpoints

### POST /api/Reaction/add

**Description:** Adds an emoji reaction from a user to a post.

**Requirements:**

* The user has not already added the exact same emoji reaction to the same post.

**Effects:**

* A new reaction entity is created with a unique ID, associated with the given post, user, and emoji type.
* Returns the unique ID of the newly created reaction.

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

**Description:** Removes a specific emoji reaction that a user previously added to a post.

**Requirements:**

* A reaction from the specified user with the specified emoji must exist on the post.

**Effects:**

* The matching reaction is deleted.

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

**Description:** Retrieves all reactions for a specific post.

**Requirements:**

* None. This query can always be performed.

**Effects:**

* Returns the set of all reaction entities associated with the specified post.

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

**Description:** Retrieves all reactions made by a specific user on a specific post.

**Requirements:**

* None. This query can always be performed.

**Effects:**

* Returns the set of all reaction entities associated with the specified post and user.

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

***
