# concept: Ranking \[User, SongId]

**purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.
**principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–100) and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

**state**
a map from `User` to `UserRanking`
a `UserRanking` is a set of `RankedSong`
a `RankedSong` with
a `songId` SongId
a `score` Number

**actions**
`addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId)`
**requires** user exists in the concept state, or a new ranking can be created for them
**requires** preferred is either songA or songB
**effects**
\- If the `user` does not have a `UserRanking`, an empty one is created for them.
\- If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
\- Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

`remove (user: User, song: SongId)`
**requires** user exists in the concept state
**requires** song exists in the `RankedSong` set for the given `user`
**effects** deletes `song` from the `user`'s `RankedSong` set.

**queries**
`getRankings (user: User) : (rankedSongs: RankedSong[])`
**requires** user exists in the concept state (has a ranking)
**effects** returns the current `RankedSong` entries for the `user`, ordered by `score`.