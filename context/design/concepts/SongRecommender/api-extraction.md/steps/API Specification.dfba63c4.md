---
timestamp: 'Tue Oct 21 2025 00:02:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_000248.b528533d.md]]'
content_id: dfba63c4638f0e5455bae1a9d253f75ca4edb6f7823ed39254970a04664e5980
---

# API Specification: SongRecommender Concept

**Purpose:** Manages user song catalogs, allowing addition of songs, generation of recommendations, and removal of songs, to provide personalized music discovery.

***

## API Endpoints

### POST /api/SongRecommender/addSongToCatalog

**Description:** Adds new songs to a user's list of songs available for future recommendations, ensuring no duplicates exist.

**Requirements:**

* The `userId` must refer to an existing or new user.
* Each `song` in the input list must not already be in `pastRecommendations` for the user.
* Each `song` in the input list must not already be in `notYetRecommendedSongs` for the user.

**Effects:**

* If the user's catalog does not exist, it is created with an empty `pastRecommendations` list.
* Adds all provided `songs` to the user's `notYetRecommendedSongs` list, ensuring uniqueness.

**Request Body:**

```json
{
  "userId": "string",
  "songs": [
    "string"
  ]
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

### POST /api/SongRecommender/generateRecommendation

**Description:** Selects a specified number of songs from the user's `notYetRecommendedSongs`, moves them to `pastRecommendations`, and returns them as recommendations.

**Requirements:**

* `count` must be a positive number.
* The `userId` must refer to an existing user with an initialized song catalog.
* The number of `notYetRecommendedSongs` for the user must be greater than or equal to `count`.

**Effects:**

* `count` songs are removed from the user's `notYetRecommendedSongs` list.
* The same `count` songs are added to the user's `pastRecommendations` list.
* Returns the `count` song recommendations.

**Request Body:**

```json
{
  "userId": "string",
  "count": "number"
}
```

**Success Response Body (Action):**

```json
[
  "string"
]
```

*(Note: Returns an array of song IDs directly, e.g., `["songId1", "songId2"]`)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongRecommender/removeSong

**Description:** Removes a specified song from the user's `notYetRecommendedSongs` list.

**Requirements:**

* The `userId` must refer to an existing user with an initialized song catalog.
* The `songId` must be present in the user's `notYetRecommendedSongs` list.

**Effects:**

* The specified `songId` is removed from the user's `notYetRecommendedSongs` list.

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

***

### POST /api/SongRecommender/getPastRecommendations

**Description:** Retrieves the list of songs that have previously been recommended to a user.

**Requirements:**

* The `userId` must refer to an existing user with an initialized song catalog.

**Effects:**

* Returns an array of song IDs that were previously recommended to the user.

**Request Body:**

```json
{
  "userId": "string"
}
```

**Success Response Body (Query):**

```json
[
  "string"
]
```

*(Note: Returns an array of song IDs directly, e.g., `["songId1", "songId2"]`)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongRecommender/getNotYetRecommended

**Description:** Retrieves the list of songs available for a user that have not yet been recommended.

**Requirements:**

* The `userId` must refer to an existing user with an initialized song catalog.

**Effects:**

* Returns an array of song IDs that are available for future recommendation to the user.

**Request Body:**

```json
{
  "userId": "string"
}
```

**Success Response Body (Query):**

```json
[
  "string"
]
```

*(Note: Returns an array of song IDs directly, e.g., `["songId1", "songId2"]`)*

**Error Response Body:**

```json
{
  "error": "string"
}
```
