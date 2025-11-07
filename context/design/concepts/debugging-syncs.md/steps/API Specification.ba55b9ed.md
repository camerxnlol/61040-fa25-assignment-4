---
timestamp: 'Fri Nov 07 2025 00:49:59 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004959.811d18fe.md]]'
content_id: ba55b9ed9424f86d3fcf8927a4e6ce9abe3ab6dc2b2032eeae35f3c288271265
---

# API Specification: Post Concept

**Purpose:** create a visible and retrievable record about a target, attributed to a user.

***

## API Endpoints

### POST /api/Post/create

**Description:** Creates a new post with the given content and attributes it to a user.

**Requirements:**

* Implicitly true; no specific preconditions are mentioned in the concept definition.

**Effects:**

* Adds a new post with a unique postId, associating the provided userId, content, and timestamp, returning the created post's identifier.

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

***

### POST /api/Post/delete

**Description:** Removes a specified post from the system.

**Requirements:**

* The post with the given `post` ID must exist.

**Effects:**

* Removes the specified post from the system.

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

***

### POST /api/Post/\_getPostsByAuthor

**Description:** Retrieves all posts created by a specific author.

**Requirements:**

* The `authorId` is a valid identifier.

**Effects:**

* Returns an array of all posts authored by the given `authorId`.
* If no posts are found for the author, an empty array is returned.

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

***

### POST /api/Post/\_getPostById

**Description:** Retrieves a single post by its unique identifier.

**Requirements:**

* The `postId` is a valid identifier.

**Effects:**

* Returns the post with the matching `postId`.
* If no post is found with the given ID, an empty array is returned.

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

***
