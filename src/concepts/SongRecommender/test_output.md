Principle: User gets daily song recommendations, past recommendations are tracked ...

--- Principle Test: Daily Song Recommendations ---
Scenario: An author adds songs, a user receives recommendations daily, and past recommendations are tracked.

Step 1: Adding initial songs to user:Alice's catalog.
  ✅ Added song:BohemianRhapsody, song:StairwayToHeaven, song:HotelCalifornia, song:Imagine to user:Alice's not-yet-recommended songs.
  ✅ Initial state: user:Alice has 4 not-yet-recommended songs and 0 past recommendations.

Step 2: Generating 1 recommendation for user:Alice (Day 1).
  ✅ user:Alice received recommendation: song:BohemianRhapsody.
  ✅ State updated: Not-yet-recommended: 3, Past: 1.

Step 3: Generating another 1 recommendation for user:Alice (Day 2).
  ✅ user:Alice received recommendation: song:StairwayToHeaven.
  ✅ State updated: Not-yet-recommended: 2, Past: 2.

Step 4: Verifying past recommendations can be viewed.
  Current past recommendations: song:BohemianRhapsody, song:StairwayToHeaven
  ✅ Confirmed: Both song:BohemianRhapsody and song:StairwayToHeaven are recorded in past recommendations.

--- Principle Test Completed Successfully ✅ ---

Principle: User gets daily song recommendations, past recommendations are tracked ... ok (1s)

Action: addSongToCatalog - Valid addition ...

--- Action Test: addSongToCatalog - Valid addition ---
Attempting to add song:BohemianRhapsody to user:Alice's catalog.
  ✅ Action successful.
  ✅ Effect confirmed: song:BohemianRhapsody added to user:Alice's notYetRecommendedSongs. Past recommendations are empty.

Action: addSongToCatalog - Valid addition ... ok (706ms)

Action: addSongToCatalog - Requires: song not already in catalog ...

--- Action Test: addSongToCatalog - Duplicate song handling ---
  ✅ Setup: song:BohemianRhapsody added initially to user:Alice's not-yet-recommended list.

Attempting to add song:BohemianRhapsody again to user:Alice's catalog (duplicate).
  ✅ Requirement check: Failed as expected. Error: Song 'song:BohemianRhapsody' is already pending recommendation for user 'user:Alice'.
  ✅ Setup: song:BohemianRhapsody and song:StairwayToHeaven moved to user:Alice's pastRecommendations.
  Current past recommendations: song:BohemianRhapsody, song:StairwayToHeaven

Attempting to add song:BohemianRhapsody to user:Alice's catalog (already in past recommendations).
  ✅ Requirement check: Failed as expected. Error: Song 'song:BohemianRhapsody' has already been recommended to user 'user:Alice'.

Action: addSongToCatalog - Requires: song not already in catalog ... ok (701ms)

Action: generateRecommendation - Valid generation ...

--- Action Test: generateRecommendation - Valid generation ---
Setup: Adding song:BohemianRhapsody, song:StairwayToHeaven, song:HotelCalifornia to user:Bob's catalog.
  ✅ Songs successfully added.

Action: Generating 2 recommendations for user:Bob.
  ✅ Action successful. Returned songs: song:BohemianRhapsody, song:StairwayToHeaven.
  ✅ Effect confirmed: Correct songs returned.
  ✅ Effect confirmed: State updated. Not-yet-recommended: song:HotelCalifornia, Past: song:BohemianRhapsody,song:StairwayToHeaven.

Action: generateRecommendation - Valid generation ... ok (685ms)

Action: generateRecommendation - Requires: count less than or equal to available songs ...

--- Action Test: generateRecommendation - Invalid count handling ---
Setup: Adding song:BohemianRhapsody, song:StairwayToHeaven to user:Alice's catalog.
  ✅ Songs successfully added. Available: 2.

Attempting to generate 3 recommendations (more than available).
  ✅ Requirement check: Failed as expected. Error: Not enough songs available for user 'user:Alice'. Requested 3, but only 2 are available.

Attempting to generate 0 recommendations.
  ✅ Requirement check: Failed as expected. Error: Count for recommendations must be a positive number.

Attempting to generate -1 recommendations (negative count).
  ✅ Requirement check: Failed as expected. Error: Count for recommendations must be a positive number.

Attempting to generate recommendations for a nonexistent user.
  ✅ Requirement check: Failed as expected. Error: User 'nonexistentUser' not found or has no songs available for recommendation.

Action: generateRecommendation - Requires: count less than or equal to available songs ... ok (688ms)

Action: removeSong - Valid removal ...

--- Action Test: removeSong - Valid removal ---
Setup: Adding song:BohemianRhapsody, song:StairwayToHeaven to user:Alice's catalog.
  ✅ Songs successfully added.

Action: Removing song:BohemianRhapsody from user:Alice's not-yet-recommended songs.
  ✅ Action successful.
  ✅ Effect confirmed: song:BohemianRhapsody removed from notYetRecommendedSongs. Remaining: song:StairwayToHeaven.

Action: removeSong - Valid removal ... ok (698ms)

Action: removeSong - Requires: song to be in notYetRecommendedSongs ...

--- Action Test: removeSong - Invalid removal handling ---
Setup: Adding song:BohemianRhapsody, song:StairwayToHeaven to user:Alice's catalog.
  ✅ Setup complete: song:BohemianRhapsody is now in pastRecommendations, song:StairwayToHeaven is in notYetRecommendedSongs.

Attempting to remove song:BohemianRhapsody (which is in pastRecommendations).
  ✅ Requirement check: Failed as expected. Error: Song 'song:BohemianRhapsody' not found in not-yet-recommended songs for user 'user:Alice'.

Attempting to remove song:HotelCalifornia (a nonexistent song).
  ✅ Requirement check: Failed as expected. Error: Song 'song:HotelCalifornia' not found in not-yet-recommended songs for user 'user:Alice'.

Attempting to remove a song for a nonexistent user.
  ✅ Requirement check: Failed as expected. Error: Song 'song:BohemianRhapsody' not found in not-yet-recommended songs for user 'nonexistentUser'.

Action: removeSong - Requires: song to be in notYetRecommendedSongs ... ok (689ms)

ok | 7 passed | 0 failed (5s)
