---
timestamp: 'Sun Oct 19 2025 22:34:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223420.a9b59bb7.md]]'
content_id: 58538d2c75db67f52b56fa52db8a29b34bde261eb6de9eb4048c4787a98d0cf8
---

# API Specification: Reaction Concept

**Purpose:** allow users to express sentiments towards items

***

## API Endpoints

### POST /api/Reaction/addReaction

**Description:** Adds a new reaction by a user to an item with a specific type.

**Requirements:**

* `user` exists
* `item` exists
* `type` is a non-empty string
* no `Reaction` exists for `user` on `item` with any `type`.

**Effects:**

* a new `Reaction` is created associating `user`, `item`, and `type`.

**Request Body:**

```json
{
  "user": "string",
  "item": "string",
  "type": "string"
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

### POST /api/Reaction/updateReaction

**Description:** Updates an existing reaction by a user on an item to a new reaction type.

**Requirements:**

* `user` exists
* `item` exists
* `newType` is a non-empty string
* a `Reaction` exists for `user` on `item`.

**Effects:**

* the existing `Reaction` for `user` on `item` is updated to `newType`.

**Request Body:**

```json
{
  "user": "string",
  "item": "string",
  "newType": "string"
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

### POST /api/Reaction/removeReaction

**Description:** Removes an existing reaction by a user from an item.

**Requirements:**

* `user` exists
* `item` exists
* a `Reaction` exists for `user` on `item`.

**Effects:**

* the `Reaction` for `user` on `item` is removed.

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
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

### POST /api/Reaction/\_getReactionsByItem

**Description:** Retrieves all reactions (user and type) for a given item.

**Requirements:**

* `item` exists.

**Effects:**

* returns a set of all `user`s and their `type`s of reactions for the given `item`.

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string",
    "type": "string"
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

### POST /api/Reaction/\_getReactionCountByItem

**Description:** Retrieves the count of reactions of a specific type for a given item.

**Requirements:**

* `item` exists
* `type` is a non-empty string.

**Effects:**

* returns the number of `Reaction`s of the specified `type` for the given `item`.

**Request Body:**

```json
{
  "item": "string",
  "type": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "count": "number"
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

### POST /api/Reaction/\_getUserReaction

**Description:** Retrieves the reaction type a specific user has on a given item.

**Requirements:**

* `user` exists
* `item` exists.

**Effects:**

* returns the `type` of reaction the `user` has on the `item`, or an empty result if none.

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "type": "string"
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
