--- Principle Test: User adds and removes reactions ---
✅ Alice (user:Alice) adds 👍 to Post A (post:article_123).
✅ Verified: Post A has 1 reaction by Alice: 👍
✅ Verified: Alice has 1 reaction on Post A: 👍
✅ Alice (user:Alice) removes 👍 from Post A (post:article_123).
✅ Verified: Post A now has 0 reactions.
✅ Verified: Alice now has 0 reactions on Post A.
--- Principle test complete and passed ---
Principle: User adds and removes emoji feedback for a post ... ok (782ms)

Action: add - successfully adds a unique reaction ...

--- Test: add - success case ---
✅ Bob (user:Bob) adds ❤️ to Post A (post:article_123).
✅ Effect confirmed: Reaction added and verified via query.
Action: add - successfully adds a unique reaction ... ok (648ms)

Action: add - prevents duplicate reactions (Requirement 2) ...

--- Test: add - duplicate reaction failure ---
Setup: Alice (user:Alice) adds 👍 to Post A (post:article_123).
✅ Alice (user:Alice) tries to add 👍 again to Post A (post:article_123).
✅ Requirement confirmed: Duplicate reaction was prevented.
✅ Effect confirmed: State remains unchanged.
Action: add - prevents duplicate reactions (Requirement 2) ... ok (698ms)

Action: remove - successfully removes an existing reaction ...

--- Test: remove - success case ---
Setup: Alice (user:Alice) adds 😂 to Post B (post:image_456).
✅ Alice (user:Alice) removes 😂 from Post B (post:image_456).
✅ Effect confirmed: Reaction removed and verified via query.
Action: remove - successfully removes an existing reaction ... ok (679ms)

Action: remove - fails to remove a non-existent reaction (Requirement) ...

--- Test: remove - non-existent reaction failure ---
✅ Alice (user:Alice) tries to remove non-existent 👍 from Post A (post:article_123).
✅ Requirement confirmed: Removal of non-existent reaction was prevented.
✅ Effect confirmed: State remains unchanged.
Action: remove - fails to remove a non-existent reaction (Requirement) ... ok (569ms)

Queries: _getReactionsForPost and _getReactionsByPostAndUser work correctly ...

--- Test: Query functionality ---
Setup: Adding multiple reactions...
✅ Querying reactions for Post A (post:article_123).
✅ Verified: Post A has reactions: ["user:Alice-❤️","user:Alice-👍","user:Bob-👍"]
✅ Querying reactions for Post B (post:image_456).
✅ Verified: Post B has reaction: user:Alice-😂
✅ Querying reactions for Post A (post:article_123) by Alice (user:Alice).
✅ Verified: Alice has reactions on Post A: ["❤️","👍"]
✅ Querying reactions for Post A (post:article_123) by Bob (user:Bob).
✅ Verified: Bob has reactions on Post A: user:Bob-👍
Queries: _getReactionsForPost and _getReactionsByPostAndUser work correctly ... ok (767ms)

running 7 tests from ./src/concepts/SongRecommender/SongRecommenderConcept.test.ts
Principle: User gets daily song recommendations, past recommendations are tracked ...
