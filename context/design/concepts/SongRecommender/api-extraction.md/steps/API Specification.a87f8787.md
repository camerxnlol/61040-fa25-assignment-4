---
timestamp: 'Wed Nov 05 2025 15:52:01 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_155201.0f278ad1.md]]'
content_id: a87f8787ed2ef7ef0cd35815f41032a26473fb9a33cdb64382480f6be354c0df
---

# API Specification: SongRecommender Concept

**Purpose:** To manage a catalog of songs for each user, track their listening history, and provide new song recommendations.

***

## API Endpoints

### POST /api/SongRecommender/addSongToCatalog

**Description:** Adds one or more new songs to a user's catalog of songs available for future recommendations.

**Requirements:**

* The songs to be added must not already be in the user's `pastRecommendations` list.
* The songs to be added must not already be in the user's `notYetRecommendedSongs` list.

**Effects:**

* Adds the specified songs to the user's `notYetRecommendedSongs` array.
* If the user does not have a catalog, a new one is created for them.

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

***

### POST /api/SongRecommender/generateRecommendation

**Description:** Selects a specified number of songs from the user's available songs, moves them to their history, and returns them as recommendations.

**Requirements:**

* The `count` must be a positive number.
* The `count` must be less than or equal to the number of songs in the user's `notYetRecommendedSongs` list.
* The user must have a song catalog.

**Effects:**

* Moves `count` songs from the user's `notYetRecommendedSongs` list to their `pastRecommendations` list.
* Returns the `count` songs that were moved.

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

***

### POST /api/SongRecommender/removeSongsFromCatalog

**Description:** Removes specified songs from a user's list of songs available for recommendation.

**Requirements:**

* The user must have a song catalog.
* All specified songs must exist in the user's `notYetRecommendedSongs` list.

**Effects:**

* Removes the specified songs from the user's `notYetRecommendedSongs` list.

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

***

### POST /api/SongRecommender/removeSongsFromPastRecommendations

**Description:** Removes specified songs from a user's list of past recommendations.

**Requirements:**

* The user must have a song catalog.
* All specified songs must exist in the user's `pastRecommendations` list.

**Effects:**

* Removes the specified songs from the user's `pastRecommendations` list.

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

***

### POST /api/SongRecommender/getPastRecommendations

**Description:** Retrieves the list of songs that have been previously recommended to a user.

**Requirements:**

* The user must have a song catalog.

**Effects:**

* Returns the user's `pastRecommendations` array.

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

***

### POST /api/SongRecommender/getNotYetRecommended

**Description:** Retrieves the list of songs available to be recommended to a user.

**Requirements:**

* The user must have a song catalog.

**Effects:**

* Returns the user's `notYetRecommendedSongs` array.

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

***
