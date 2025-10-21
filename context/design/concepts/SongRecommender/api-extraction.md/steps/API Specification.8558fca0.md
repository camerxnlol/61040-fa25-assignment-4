---
timestamp: 'Sun Oct 19 2025 22:38:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223833.1847f2bb.md]]'
content_id: 8558fca0cafcf28bcd188f024b7d60426a12df601c954ec52ca02b32a9d8c2ed
---

# API Specification: SongRecommender Concept

**Purpose:** support the recommendation of songs to users by managing a catalog of available and previously recommended songs.

***

## API Endpoints

### POST /api/SongRecommender/addSongToCatalog

**Description:** Adds a new song to a user's list of songs that are available for future recommendations, ensuring it's not a duplicate within their catalog.

**Requirements:**

* The provided `songId` is not in the `pastRecommendations` for the given `userId`.
* The provided `songId` is not in the `notYetRecommendedSongs` for the given `userId`.

**Effects:**

* The `songId` is added to the `notYetRecommendedSongs` for the `userId`.
* If a catalog for the `userId` does not exist, a new one is created with the `songId` in `notYetRecommendedSongs`.

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

### POST /api/SongRecommender/generateRecommendation

**Description:** Selects a specified number of songs from a user's `notYetRecommendedSongs`, moves them to `pastRecommendations`, and returns the selected songs as recommendations.

**Requirements:**

* The `count` for recommendations must be a positive number.
* The `userId` must have an initialized song catalog.
* The `count` must be less than or equal to the number of songs currently in `notYetRecommendedSongs` for the `userId`.

**Effects:**

* `count` songs are moved from `notYetRecommendedSongs` to `pastRecommendations` for the `userId`.
* Returns the `count` recommended song IDs.

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

***

### POST /api/SongRecommender/removeSong

**Description:** Removes a specified song from the user's list of songs available for future recommendations.

**Requirements:**

* The `userId` must have an initialized song catalog.
* The `songId` must be present in the `notYetRecommendedSongs` list for the `userId`.

**Effects:**

* The `songId` is removed from `notYetRecommendedSongs` for the `userId`.

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
