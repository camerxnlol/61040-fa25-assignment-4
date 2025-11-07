[@implementation](implementation.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md) 

# prompt: Was this concept made to be called every time we make a comparison between two songs or only once compared to the highest or lowest ranked song
# response:

Based on the provided specification and implementation, the `Ranking` concept is designed to be called **every time a user makes a comparison between any two songs**.

Here is a breakdown of why this is the case, drawing directly from the concept specification:

1.  **Action Signature:** The primary action is `addComparison (user: User, songA: SongId, songB: SongId, preferred: SongId)`. The signature itself requires three song identifiers: two to be compared (`songA`, `songB`) and one to indicate the winner (`preferred`). This structure is explicitly designed for a pairwise comparison and would not work for comparing a single song to the top or bottom of the list.

2.  **Purpose:** The purpose states the goal is "To allow users to order songs **relative to one another**". This phrasing strongly implies that the core mechanic is comparing one song directly against another, not just slotting it into a pre-existing list.

3.  **Principle:** The principle describes the user experience: "...they can compare it to **songs they’ve already ranked**" (plural). It doesn't say "compare it to the highest-ranked song." This supports the idea that the user can pick any two songs they have an opinion on and register their preference, making the ranking more flexible and dynamic.

4.  **State and Effects:** The state uses a `score` for each song. The `effects` of `addComparison` are to "adjust the `score` of `songA` and `songB`". This mechanism is similar to an Elo rating system (used in chess and other competitive games). In such systems, a ranking is derived from the outcomes of many individual matches (or in this case, comparisons). Comparing any two songs and adjusting their scores accordingly is the most effective way to build a robust, score-based ladder over time.

In summary, the concept is not built for a simple "insert this song at position #5" workflow. Instead, it builds a more nuanced and accurate ranking by accumulating the results of many individual pairwise comparisons, allowing the relative scores of all songs to shift dynamically.