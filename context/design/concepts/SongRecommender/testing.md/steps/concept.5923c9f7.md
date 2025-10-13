---
timestamp: 'Sat Oct 11 2025 10:29:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_102953.17187c88.md]]'
content_id: 5923c9f76328f8cbd79ba9067ca8b443769baf3d0609da464a3b67f77c2b81ce
---

# concept: SongRecommender

* **concept**: SongRecommender \[User, Song]
* **purpose**: To introduce a new song for the user each day.
* **principle**: Each day, the system presents a new song to the user, chosen from a list of songs. The user can listen to the song. Recommendations refresh daily and past recommendations can be revisited.
* **state**:
  * A set of `Users` with
    * a `set of pastRecommendations` of type `Songs`
    * a `set of notYetRecommendedSongs` of type `Songs`
* **invariant**: The intersection of `pastRecommendations` and `notYetRecommendedSongs` is empty.
* **actions**:
  * `addSongToCatalog(user: User, song: Song)`
    * **requires**: `song` is not in `pastRecommendations` or `notYetRecommendedSongs` for user.
    * **effects**: Adds `song` to `notYetRecommendedSongs` for user.
  * `generateRecommendation(user: User, count: Number): (songs: Song[])`
    * **requires**: `count` is less than or equal to the number of songs in `notYetRecommendedSongs` for user.
    * **effects**: Returns `count` song recommendations, moves song(s) from `notYetRecommendedSongs` to `pastRecommendations` for user.
  * `removeSong(user: User, song: Song)`
    * **requires**: `song` to be in `notYetRecommendedSongs` for user.
    * **effects**: Removes `song` from `notYetRecommendedSongs` for user.
  * `async generateRecommendationFromLLM(user: User, llm: GeminiLLM, count: Number, basisSongs: Song[]?)`
    * **effects**: Uses an LLM to generate `count` new songs and adds them to `notYetRecommendedSongs`. If `basisSongs` is provided, the new songs are based on the provided songs. If `basisSongs` is not provided, the new songs are based on current "trending" music that is different from the user's taste.
