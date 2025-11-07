---
timestamp: 'Fri Nov 07 2025 00:49:59 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_004959.811d18fe.md]]'
content_id: 2683160137a10579fa3b31cfae06ddfe4b732497b13af878c77e94a6f744c12a
---

# API Specification: Ranking Concept

**Purpose:** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.

***

## API Endpoints

### POST /api/Ranking/addComparison

**Description:** Adds or updates song rankings for a user based on a preference between two songs, or adds a single song with a default score.

**Requirements:**

* user exists in the concept state, or a new ranking can be created for them
* preferred is either songA or songB (if songB is provided)
* if songB is not provided, preferred must be songA

**Effects:**

* If the `user` does not have a `UserRanking`, an empty one is created for them.
* If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
* If `songB` is not provided, only `songA` is added to the ranking with default score.
* If `songB` is provided, adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

**Request Body:**

```json
{
  "user": "ID",
  "songA": "ID",
  "songB": "ID",
  "preferred": "ID"
}
```

*Note: `songB` is optional.*

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

**Description:** Removes a specific song from a user's ranked list.

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

**Description:** Retrieves a user's current song rankings, sorted by score in descending order.

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
*Note: This query returns a single object containing an array, not an array of objects.*

```json
{
  "rankedSongs": [
    {
      "songId": "ID",
      "score": "number"
    }
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
