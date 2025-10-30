[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md) 
 
**concept** Ranking\[User]  
    **purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.  
    **principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10) and adjusts the user’s overall rankings dynamically as more data is provided.  
    **state**  
       a set of `RankedSongs` with  
         a `songId` String  
         a `genre` String  
         a `score` Number  
    **actions**  
      `addComparison(songA: Song, songB: Song, preferred: Song)`  
         **effect** adjusts score of `songA` and `songB` and updates the ranking order  
      `remove(song: Song)`  
         **requires** song to exist in `RankedSongs`  
         **effect** deletes song and recalculates scores of other songs  
      `viewRankings() : (songs: Songs[])`  
        **effect** returns the current ranking of songs ordered by score

# prompt: You are a skeptical senior software engineer and concept master. Review the current implementation of the concept and provide recommendations for improvement. Focus only on the state and actions and how they can be improved.
# response:

As a skeptical senior software engineer and "concept master," I've reviewed your `Ranking` concept specification. While the overall intent is clear, there are several critical areas in the `state` and `actions` that deviate from core concept design principles, particularly regarding separation of concerns, completeness, and independence.

Here are my recommendations for improvement, focusing solely on the `state` and `actions`:

---

### **Recommendations for `Ranking` Concept State**

1.  **Introduce User Association (Critical Flaw):**
    *   **Problem:** The concept is declared as `Ranking [User]`, implying a per-user ranking system (reinforced by the `purpose` and `principle`). However, the `state` (`a set of RankedSongs`) lacks any association with a `User`. This means the current state describes a *single, global* ranking, not individual user rankings. The `User` type parameter is currently unused and therefore misleading.
    *   **Recommendation:** The state *must* explicitly link rankings to users.
        ```diff
        concept Ranking [User, SongId] // Renamed Song for clarity in state/actions
        ...
        state
        - a set of `RankedSongs` with
        -    a `songId` String
        -    a `genre` String
        -    a `score` Number
        + a map from `User` to `UserRanking`
        + a `UserRanking` is a set of `RankedSong`
        + a `RankedSong` with
        +    a `songId` SongId // Use the type parameter
        +    a `score` Number
        ```
    *   **Justification:** This ensures that the concept adheres to its declared type parameter `User` and fulfills its purpose of managing "user's overall rankings." Each user now has their own set of `RankedSong` entries.

2.  **Separate `genre` (Separation of Concerns):**
    *   **Problem:** The `genre` property is included within the `RankedSongs` state. `genre` is an attribute of a `Song` itself, not inherently tied to how a *user ranks* that song. The `Ranking` concept's purpose is about *ordering preferences*, not managing song metadata.
    *   **Recommendation:** Remove `genre` from the `Ranking` concept's state. If the `Ranking` concept needs `genre` information (e.g., for internal ranking algorithms or display), it should *query* this information from a separate `MusicCatalog` or `SongMetadata` concept using a synchronization or by relying on external objects (passed as arguments to actions) that include genre.
        ```diff
        state
        - a `RankedSong` with
        -    a `songId` SongId
        -    a `genre` String // This line removed
        -    a `score` Number
        + a `RankedSong` with
        +    a `songId` SongId
        +    a `score` Number
        ```
    *   **Justification:** This improves separation of concerns. The `Ranking` concept can remain focused on user preferences and scores, making it more modular and reusable. The properties of a `Song` itself belong in a concept responsible for song definition.

3.  **Refine Type Parameters and Naming:**
    *   **Problem:** The action signatures use `Song` as a type, but the state uses `songId String`. This inconsistency is confusing. Also, it's better to make the `Song` identifier a generic type parameter (`SongId`) to enforce polymorphism and avoid assumptions about its internal structure.
    *   **Recommendation:** Rename `Song` in the type parameters and action signatures to `SongId` to reflect it's an external identifier.
        ```diff
        concept Ranking [User, SongId] // Renamed Song to SongId
        ```
    *   **Justification:** Explicitly defining `SongId` as a type parameter (like `User`) clarifies that the concept treats these as opaque identifiers, enhancing polymorphism and independence.

### **Recommendations for `Ranking` Concept Actions**

1.  **Add `User` Argument to All User-Facing Actions (Critical Flaw):**
    *   **Problem:** As with the state, none of the actions currently take a `User` as an argument, making them operate on a non-existent global ranking. This directly contradicts the concept's `purpose` and `principle`.
    *   **Recommendation:** All actions (`addComparison`, `remove`, `viewRankings`) must explicitly accept a `User` argument.
        ```diff
        actions
        - `addComparison(songA: Song, songB: Song, preferred: Song)`
        + `addComparison(user: User, songA: SongId, songB: SongId, preferred: SongId)`

        - `remove(song: Song)`
        + `remove(user: User, song: SongId)`

        - `viewRankings() : (songs: Songs[])`
        + `viewRankings(user: User) : (rankedSongs: RankedSong[])` // Query, not action. See next point.
        ```
    *   **Justification:** This makes the concept functionally complete and consistent with its stated purpose of providing *user-specific* rankings.

2.  **Reclassify `viewRankings` as a Query:**
    *   **Problem:** `viewRankings` is specified as an action with an `effect` that "returns the current ranking of songs." Actions are primarily for state mutation; reads are queries.
    *   **Recommendation:** Move `viewRankings` to a `queries` section.
        ```diff
        // In the `actions` section:
        - `viewRankings() : (songs: Songs[])`
        -   **effect** returns the current ranking of songs ordered by score

        // Create a new `queries` section:
        queries
        `getRankings(user: User) : (rankedSongs: RankedSong[])`
            **requires** user exists in the concept state (has a ranking)
            **effects** returns the current ranking of songs for the user, ordered by score
        ```
    *   **Justification:** This adheres to the distinction between actions (mutators) and queries (readers), as outlined in the "Concept actions" and "Concept queries" sections of the provided document. Queries typically don't have "effects" in the sense of changing the system state, but rather "return" data.

3.  **Refine `addComparison` Pre/Post Conditions and Input Semantics:**
    *   **Problem A (Input Ambiguity):** `preferred: Song` implies `preferred` must be either `songA` or `songB`. This implicit constraint should be explicit or reflected in the action signature.
    *   **Problem B (Completeness):** The action implicitly assumes `songA` and `songB` are already part of the user's `RankedSongs`. If not, how are they added? This is a point of incompleteness.
    *   **Recommendation:**
        *   Add a `requires` clause to `addComparison` to ensure `preferred` is one of the compared songs.
        *   Clarify what happens if `songA` or `songB` are new. The most coherent approach for a *ranking* concept is that they are implicitly added with a default score or initial state if not present.
        ```diff
        actions
        `addComparison(user: User, songA: SongId, songB: SongId, preferred: SongId)`
            **requires** user has an existing ranking or a new ranking can be created for them
            **requires** preferred is either songA or songB
            **effects**
                - If user does not have a ranking, create an empty one for them.
                - If songA or songB are not in user's ranked songs, add them with a neutral default score.
                - Adjusts the scores of songA and songB for the given user based on `preferred` and updates the ranking order.
        ```
    *   **Justification:** Explicit preconditions make the concept more robust and understandable. Clarifying how new songs are handled makes the action complete within the concept's scope.

4.  **Refine `remove` Pre/Post Conditions:**
    *   **Problem:** The `effect` mentions "recalculates scores of other songs," but this might be an internal detail of the ranking algorithm rather than a core observable effect of the concept.
    *   **Recommendation:** Simplify the `effect` to focus on the essential outcome.
        ```diff
        actions
        `remove(user: User, song: SongId)`
            **requires** user exists in the concept state
            **requires** song exists in the `RankedSong` set for the given user
            **effects** deletes song from the user's `RankedSong` set.
        ```
    *   **Justification:** While recalculations are necessary, the essential effect is the removal. How other scores are affected is an implementation detail of the `Ranking` concept, not necessarily a part of its abstract functional contract unless it implies a specific observable change beyond the removal itself.


By implementing these changes, your `Ranking` concept will be significantly more aligned with the principles of concept design, leading to greater modularity, clarity, and reusability.

# Prompt: Rewrite the entire spec with the improvements
# response:

Okay, I've taken your original `Ranking` concept specification and thoroughly rewritten it, incorporating all the recommended improvements to the state and actions based on concept design principles.

Here is the revised specification:

***

**concept** Ranking \[User, SongId]
**purpose** To allow users to order songs relative to one another and generate a dynamic ladder of preferences over time.
**principle** When a user listens to a song, they can compare it to songs they’ve already ranked. The system then assigns each song a score (e.g., 1–10) and adjusts the user’s overall rankings dynamically as more data is provided, allowing them to view their personalized ranked list at any time.

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
      - If the `user` does not have a `UserRanking`, an empty one is created for them.
      - If `songA` or `songB` are not in the `user`'s `RankedSong` set, they are added with a neutral default score.
      - Adjusts the `score` of `songA` and `songB` for the given `user` based on `preferred` and updates the ranking order of their `RankedSong` set.

  `remove (user: User, song: SongId)`
    **requires** user exists in the concept state
    **requires** song exists in the `RankedSong` set for the given `user`
    **effects** deletes `song` from the `user`'s `RankedSong` set.

**queries**
  `getRankings (user: User) : (rankedSongs: RankedSong[])`
    **requires** user exists in the concept state (has a ranking)
    **effects** returns the current `RankedSong` entries for the `user`, ordered by `score`.
    
# prompt: Can you summarize the changes you made to the concept
# response:

I've made several significant changes to the `Ranking` concept specification to align it more closely with core concept design principles, particularly concerning **separation of concerns, completeness of functionality, independence, and the proper use of state and actions.**

Here's a summary of the key improvements:

1.  **Introduced User-Specific Ranking (Critical for Purpose & Principle):**
    *   **Change:** The `state` was fundamentally restructured from a single, global `set of RankedSongs` to a `map from User to UserRanking`, where each `UserRanking` is a `set of RankedSong`. Crucially, all `actions` (`addComparison`, `remove`) and the new `query` (`getRankings`) now explicitly require a `user: User` argument.
    *   **Why:** The original specification had `Ranking [User]` but then had a global state and actions that didn't take a user. This contradicted the stated `purpose` ("users to order songs") and `principle` ("user listens... adjusts the user's overall rankings"). The concept now correctly implements per-user rankings, making it functionally complete for its stated purpose and consistent with its type parameters.

2.  **Improved Separation of Concerns by Removing `genre` from State:**
    *   **Change:** The `genre` property was removed from the `RankedSong` definition within the `Ranking` concept's `state`.
    *   **Why:** `genre` is an attribute of a `Song` itself, not an aspect of a user's *preference or ranking* of a song. Including it conflated concerns. The `Ranking` concept should focus purely on the user's relationship to songs (their score/preference). If `genre` information is needed, it should be managed by a separate `SongMetadata` or `MusicCatalog` concept, promoting better modularity and reusability of the `Ranking` concept.

3.  **Reclassified `viewRankings` as a `query` and Renamed it:**
    *   **Change:** The `viewRankings()` entry was removed from the `actions` section, renamed to `getRankings()`, and moved to a new `queries` section. It also now takes a `user: User` argument.
    *   **Why:** Actions are for state mutation, while reads are queries. This change adheres to the distinction between `actions` (mutators) and `queries` (readers) as outlined in the concept design guidelines, making the concept's behavior more clearly defined.

4.  **Refined Type Parameters for Polymorphism and Clarity:**
    *   **Change:** The concept's second type parameter was clarified from `Song` to `SongId` (`Ranking [User, SongId]`). All action signatures were updated to consistently use `SongId`.
    *   **Why:** This emphasizes that the `Ranking` concept treats these identifiers polymorphically, without making assumptions about the internal structure of `Song` objects. This enhances the concept's independence and reusability across different applications that might represent songs differently.

5.  **Enhanced Action Pre/Post Conditions for Robustness and Completeness:**
    *   **Change:** Detailed `requires` clauses were added to `addComparison` and `remove` to specify preconditions (e.g., `user exists`, `preferred is either songA or songB`). The `effects` for `addComparison` now explicitly cover the creation of a new `UserRanking` if one doesn't exist, and the addition of new songs with a default score if they are not already ranked by the user.
    *   **Why:** Explicit preconditions clarify when an action can occur (as "firing conditions") and improve the robustness and understandability of the concept. Clarifying implicit behaviors (like adding new songs or creating a ranking) ensures "completeness of functionality" for the concept, reducing ambiguity and ensuring it can fully achieve its purpose.