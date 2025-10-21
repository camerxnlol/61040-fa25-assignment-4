---
timestamp: 'Sun Oct 19 2025 22:33:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223348.fc9734c1.md]]'
content_id: 8557cfbcd24c8d4255ffd8ad0d96fdf0041564dbfc5d1108ed5b841535f8f2a6
---

# API Specification: Ranking Concept

**Purpose:** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.

***

## API Endpoints

### POST /api/Ranking/addComparison

**Description:** Allows a user to compare two songs, indicating which one is preferred, and dynamically updates their personalized ranking based on this comparison.

**Requirements:**

* user exists in the concept state, or a new ranking can be created for them
* preferred is either songA or songB

**Effects:**

* If the `user` does not have a `UserRanking`, an empty one is created for them.
* If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
* Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

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

***

### POST /api/Ranking/remove

**Description:** Deletes a specific song from a user's personalized ranked song set.

**Requirements:**

* user exists in the concept state
* song exists in the `RankedSong` set for the given `user`

**Effects:**

* deletes `song` from the `user`'s `RankedSong` set.

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

***

### POST /api/Ranking/\_getRankings

**Description:** Retrieves a user's current ranked songs, ordered by their assigned score in descending order.

**Requirements:**

* user exists in the concept state (has a ranking)

**Effects:**

* returns the current `RankedSong` entries for the `user`, ordered by `score` (descending).

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

***
