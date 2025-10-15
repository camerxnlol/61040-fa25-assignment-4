--- Starting Ranking Principle Test ---
User Alice has no rankings initially

Action: Alice compares song:Wonderwall vs song:BohemianRhapsody, prefers song:Wonderwall.
Alice's rankings after 1st comparison: \[{"songId":"song:Wonderwall","score":60},{"songId":"song:BohemianRhapsody","score":40}]

Action: Alice compares song:Wonderwall vs song:StairwayToHeaven, prefers song:Wonderwall.
Alice's rankings after 2nd comparison: \[{"songId":"song:Wonderwall","score":70},{"songId":"song:BohemianRhapsody","score":40},{"songId":"song:StairwayToHeaven","score":40}]

Action: Alice compares song:BohemianRhapsody vs song:StairwayToHeaven, prefers song:StairwayToHeaven.
Alice's rankings after 3rd comparison: \[{"songId":"song:Wonderwall","score":70},{"songId":"song:StairwayToHeaven","score":50},{"songId":"song:BohemianRhapsody","score":30}]

Action: Bob compares song:Wonderwall vs song:BohemianRhapsody, prefers song:BohemianRhapsody.
Bob's rankings: \[{"songId":"song:BohemianRhapsody","score":60},{"songId":"song:Wonderwall","score":40}]
Confirmed Alice's rankings are independent of Bob's actions. ✅

Action: Alice removes song:BohemianRhapsody from her rankings.
Alice's rankings after removing song:BohemianRhapsody: \[{"songId":"song:Wonderwall","score":70},{"songId":"song:StairwayToHeaven","score":50}]
--- Principle Test Completed Successfully ---
Principle: User ranks songs, scores adjust dynamically, and rankings are viewable ... ok (1s)

Action: addComparison requirements and effects ...
  Requires: preferred must be songA or songB ...

--- Testing addComparison requirements and effects ---
Action: Attempt to add comparison where preferred is neither songA nor songB.
Result: Expected error caught: Preferred song must be either songA or songB.
  Requires: preferred must be songA or songB ... ok (1ms)

  Effects: Creates new user ranking if none exists ...
Action: Add comparison for a new user, expecting ranking to be created.
Result: User ranking created for user:Alice.
  Effects: Creates new user ranking if none exists ... ok (137ms)

  Effects: Adds new songs with default score ...
Action: Add comparison for another new user, checking default scores.
Result: Bob's initial rankings: \[{"songId":"song:Wonderwall","score":60},{"songId":"song:BohemianRhapsody","score":40}]
  Effects: Adds new songs with default score ... ok (201ms)

  Effects: Adjusts scores correctly (preferred increases, other decreases) ...
Action: Bob compares B vs A, prefers A. (A:60, B:40 before from previous step)
Result: Bob's adjusted rankings: \[{"songId":"song:Wonderwall","score":70},{"songId":"song:BohemianRhapsody","score":30}]
  Effects: Adjusts scores correctly (preferred increases, other decreases) ... ok (100ms)

  Effects: Score clamping (min and max scores) ...
Action: Pushing SONG_A's score to max (100) for Alice and SONG_D to min (0).
Result: Alice's scores clamped - A: 100, D: 0
  Effects: Score clamping (min and max scores) ... ok (421ms)
--- addComparison tests completed ---
Action: addComparison requirements and effects ... ok (1s)

Action: remove requirements and effects ...

--- Testing remove requirements and effects ---
Setup: Alice ranks A, B, C.
Setup Complete. Alice's rankings: \[{"songId":"song:StairwayToHeaven","score":60},{"songId":"song:Wonderwall","score":50},{"songId":"song:BohemianRhapsody","score":40}]

  Requires: user exists in the concept state ...
Action: Attempt to remove song for a non-existent user.
Result: Expected error caught: User ranking not found for the given user.
  Requires: user exists in the concept state ... ok (24ms)

  Requires: song exists in the RankedSong set for the given user ...
Action: Attempt to remove non-existent song song:HotelCalifornia for Alice.
Result: Expected error caught: SongId 'song:HotelCalifornia' not found in user's ranking.
  Requires: song exists in the RankedSong set for the given user ... ok (26ms)

  Effects: deletes song from the user's RankedSong set ...
Action: Alice removes song:BohemianRhapsody.
Result: Alice's rankings after removing song:BohemianRhapsody: \[{"songId":"song:StairwayToHeaven","score":60},{"songId":"song:Wonderwall","score":50}]
  Effects: deletes song from the user's RankedSong set ... ok (74ms)
--- remove tests completed ---
Action: remove requirements and effects ... ok (767ms)

Query: _getRankings requirements and effects ...
  Requires: user exists in the concept state ...

--- Testing _getRankings requirements and effects ---
Action: Attempt to get rankings for a non-existent user.
Result: Expected error caught: User ranking not found for the given user.
  Requires: user exists in the concept state ... ok (20ms)

  Effects: returns current RankedSong entries, ordered by score (descending) ...
Action: Add several comparisons for Alice to establish a ranking order.
Action: Get Alice's rankings.
Result: Alice's rankings (ordered): \[{"songId":"song:Wonderwall","score":60},{"songId":"song:BohemianRhapsody","score":50},{"songId":"song:StairwayToHeaven","score":40}]
  Effects: returns current RankedSong entries, ordered by score (descending) ... ok (116ms)
--- _getRankings tests completed ---
Query: _getRankings requirements and effects ... ok (677ms)
