---
timestamp: 'Sun Oct 19 2025 22:31:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223104.4f2a1e98.md]]'
content_id: 0cab26b7eec8ceaade7eb8b0ffe506257a9d60a2c6cfaa9784b855c40575e1ed
---

# API Specification: Post Concept

**Purpose:** create a visible and retrievable record about a target, attributed to a user.

***

## API Endpoints

### POST /api/Post/create

**Description:** Creates a new post, associating the provided user ID, content, and timestamp.

**Requirements:**

* Implicitly true; no specific preconditions are mentioned in the concept definition.

**Effects:**

* Adds a new post with a unique postId, associating the provided userId, content, and timestamp, returning the created post's identifier.

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

***

### POST /api/Post/delete

**Description:** Removes the specified post from the system.

**Requirements:**

* The post with the given `post` ID must exist.

**Effects:**

* Removes the specified post from the system.

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

***

### POST /api/Post/\_getPostsByAuthor

**Description:** Returns an array of all posts authored by the given author ID.

**Requirements:**

* The `authorId` is a valid identifier.

**Effects:**

* Returns an array of all posts authored by the given `authorId`.
* If no posts are found for the author, an empty array is returned.

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

***

### POST /api/Post/\_getPostById

**Description:** Returns the post with the matching post ID.

**Requirements:**

* The `postId` is a valid identifier.

**Effects:**

* Returns the post with the matching `postId`.
* If no post is found with the given ID, an empty array is returned.

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

***
