[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md) 

**concept** Reaction  
    **purpose** allow friends to respond to posts with lightweight feedback  
    **principle** when a friend reacts to a post, the reaction is stored and displayed with the post  
    **state**  
       a set of `Reactions` with  
        a `postId` String  
        a `reactionType` String  
        a `reactingUserId` String  
    **actions**  
      `add(postId: String, reactionType: String, reactingUserId: String)`  
        **effect** adds a new reaction to the post  
      `remove(reaction: Reaction)`  
        **requires** reaction exists  
        **effect** deletes the reaction  
      `view(postId: String) : (reactions: Reactions[])`  
        **effect** returns reactions for the given post

# prompt: You are a skeptical senior software engineer and concept master. Review the current implementation of the concept and provide recommendations for improvement. Focus only on the state and actions and how they can be improved.

# response:

Alright, let's dissect this `Reaction` concept. As a concept master, I appreciate the attempt to distill a common social pattern, but this current specification reveals some areas where its "conceptual purity" could be significantly improved, particularly in its state definition and action protocols.

The goal here is robust modularity, independence, and clarity for both users and developers. This draft, while functional, doesn't quite hit those marks consistently.

Here are my recommendations for improving the `state` and `actions` sections:

---

### Review of `Reaction` Concept (State and Actions)

**Original Specification:**

```
concept Reaction
purpose allow friends to respond to posts with lightweight feedback
principle when a friend reacts to a post, the reaction is stored and displayed with the post
state
  a set of `Reactions` with
   a `postId` String
   a `reactionType` String
   a `reactingUserId` String
actions
  add(postId: String, reactionType: String, reactingUserId: String)
   **effect** adds a new reaction to the post
  remove(reaction: Reaction)
   **requires** reaction exists
   **effect** deletes the reaction
  view(postId: String) : (reactions: Reactions[])
   **effect** returns reactions for the given post
```

---

### Recommendations for Improvement

#### 1. Concept Signature: Introduce Type Parameters for Polymorphism and Independence

The first thing that jumps out is the lack of type parameters. The concept text explicitly states: "These type parameters are for the types of objects that are created externally to the concept, and must be treated completely polymorphically by the concept".
Your `Reaction` concept clearly refers to external entities: `Post` and `User`. Representing these as generic `String` identifiers breaks polymorphism and couples this concept to specific `String` representations, rather than abstract identities.

*   **Current:** `concept Reaction`
*   **Recommendation:** `concept Reaction [Post, User]`
    *   This immediately signals that `Reaction` operates on generic `Post` and `User` types, making it reusable across *any* application that has posts and users, regardless of how those are identified or structured internally by other concepts.

#### 2. State Definition: Leverage Type Parameters and Clarify Entity Naming

With the type parameters established, the state should reflect them. Also, the plural `Reactions` for the singular entity type within the "a set of" construct can be confusing.

*   **Current State:**
    ```
    a set of `Reactions` with
       a `postId` String
       a `reactionType` String
       a `reactingUserId` String
    ```
*   **Recommendation:**
    ```
    state
      a set of Reaction with // Use singular 'Reaction' for the entity type
        postId: Post        // Use the generic Post type
        reactionType: String
        reactingUser: User  // Use the generic User type
    ```
    *   This makes the state schema more precise and aligns with the polymorphic nature of the concept.

#### 3. Action `add`: Enforce Behavioral Logic and Provide Clear Pre/Post Conditions

The `add` action is currently too simplistic. "adds a new reaction to the post" doesn't capture typical reaction behavior, which usually implies a single reaction *of a specific type* per user per post. Preventing double-voting in `Upvote` was highlighted as important; `Reaction` needs similar behavioral constraints if it's truly "lightweight feedback" (e.g., you can "heart" a post once, but you might also "laugh" at it).

*   **Current:** `add(postId: String, reactionType: String, reactingUserId: String)`
    *   `**effect** adds a new reaction to the post`
*   **Recommendation:**
    ```
    add(post: Post, reactionType: String, reactingUser: User) : (reactionId: Reaction) // Consider returning the identifier of the created reaction
      **requires** NOT (EXISTS r IN Reaction SUCH THAT r.postId == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType)
      **effects** create new_reaction with postId = post, reactionType = reactionType, reactingUser = reactingUser
                add new_reaction to Reaction
                returns new_reaction // If subsequent actions (like remove) need a specific Reaction identifier
    ```
    *   The `requires` clause ensures a user cannot add the *exact same type* of reaction multiple times to the same post. This aligns with the "no double voting" principle from the `Upvote` example and is critical for meaningful "lightweight feedback." If multiple reactions of the same type *are* desired (e.g., "claps"), the `reactionType` needs to be more granular or a `count` added to the `Reaction` entity. For general "Reaction," uniqueness is usually implied.
    *   The `effects` now clearly describe state mutation. Returning `reactionId` could simplify `remove` later.

#### 4. Action `remove`: Improve UX and Maintain Independence

The `remove(reaction: Reaction)` signature is problematic. How does a client (UI or another concept) obtain a `Reaction` *entity* to pass to this action? This breaks the user-facing protocol and implies that clients need to have pre-existing knowledge of internal concept entities or perform a query first, which reduces independence and increases coupling. Actions should typically take user-level inputs.

*   **Current:** `remove(reaction: Reaction)`
    *   `**requires** reaction exists`
    *   `**effect** deletes the reaction`
*   **Recommendation:**
    ```
    remove(post: Post, reactionType: String, reactingUser: User)
      **requires** EXISTS r IN Reaction SUCH THAT r.postId == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType
      **effects** delete r from Reaction WHERE r.postId == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType
    ```
    *   This signature matches the common user experience of "un-reacting" by specifying *what* post, *what type* of reaction, and *who* is performing the action. It allows the concept to identify and remove its own internal state using the same parameters used to add it, without relying on an externally provided `Reaction` entity. This promotes concept independence.
    *   The `requires` clause ensures that only existing reactions can be removed.

#### 5. `view` Operation: Distinguish Actions from Queries

The `view` operation does not mutate the state; it queries it. The concept design principles make a clear distinction: "The events are instances of *actions*, and usually mutators of the state. A concept specification always includes definitions of its actions. Queries, by contrast, are often defined implicitly by the state and do not need to be explicitly specified." If explicitly specified, they belong in a `queries` section.

*   **Current:** `view(postId: String) : (reactions: Reactions[])` within `actions`
*   **Recommendation:** Move this to a dedicated `queries` section and rename for clarity.
    ```
    queries
      getReactionsForPost(post: Post) : (reactions: Reaction[])
        **requires** true
        **effects** returns the set of all Reaction entities where reaction.postId == post
    ```
    *   This clarifies the intent and adheres to the separation of concerns between state-mutating actions and state-reading queries. The `Post` type parameter is used here as well. The plural `Reactions[]` should be `Reaction[]` for consistency with the singular `Reaction` entity name.

---

By addressing these points, the `Reaction` concept becomes more robust, truly modular, and self-contained, embodying the principles of concept design more effectively. It will be easier to understand in isolation, more reusable across different applications, and less prone to unexpected behavior due to underspecified actions.

# prompt: Rewrite the entire spec with the improvements
# response:

Alright, a proper concept specification for `Reaction` requires adherence to the principles of polymorphism, clear pre/post conditions, and correct classification of actions vs. queries.

Here is the revised `Reaction` concept specification incorporating the recommended improvements:

***

### Revised `Reaction` Concept Specification

```
concept Reaction [Post, User]
purpose allow users to respond to posts with lightweight feedback
principle when a user adds a specific type of reaction to a post, that reaction is recorded and associated with the post and user; subsequently, the user can remove their specific reaction.
state
  a set of Reaction with // Using singular 'Reaction' for the entity type
    id: UUID            // Add an explicit identifier for each reaction entity
    post: Post          // Use the generic Post type parameter
    reactionType: String
    reactingUser: User  // Use the generic User type parameter

actions
  add(post: Post, reactionType: String, reactingUser: User) : (reactionId: UUID)
    **requires** NOT (EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType)
    **effects** create new_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser
              add new_reaction to Reaction
              returns new_reaction.id

  remove(post: Post, reactionType: String, reactingUser: User)
    **requires** EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType
    **effects** delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

queries
  getReactionsForPost(post: Post) : (reactions: Reaction[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post

  getReactionsByPostAndUser(post: Post, reactingUser: User) : (reactions: Reaction[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser
```

***

### Summary of Changes:

1.  **Concept Signature:** Added `[Post, User]` type parameters to indicate polymorphism over external entity types.
2.  **Purpose & Principle:** Slightly refined to align with the new action specificity and user interaction.
3.  **State Definition:**
    *   Changed `a set of Reactions` to `a set of Reaction` for proper singular entity naming.
    *   Introduced an explicit `id: UUID` for each `Reaction` entity, which is good practice for unique identification within the concept's state.
    *   Used `post: Post` and `reactingUser: User` leveraging the new type parameters.
4.  **`add` Action:**
    *   Updated signature to use `Post` and `User` types.
    *   Added a precise `**requires**` clause to prevent a user from adding the *exact same reaction type* to the same post twice. This is crucial for typical "lightweight feedback" behavior.
    *   Improved `**effects**` to explicitly describe the creation of a new `Reaction` entity and now returns the `UUID` of the newly created reaction.
5.  **`remove` Action:**
    *   Signature changed to take `post: Post`, `reactionType: String`, and `reactingUser: User`. This allows removal based on user-centric input, enhancing independence from internal `Reaction` entity IDs (though `id` could also be an option for more direct removal if the UI provides it).
    *   Added a `**requires**` clause to ensure the specified reaction exists before attempting to delete it.
    *   Improved `**effects**` to explicitly describe the deletion.
6.  **`view` Action -> `queries` Section:**
    *   Moved `view` to a new `queries` section as it's a read-only operation.
    *   Renamed to `getReactionsForPost` for clarity and consistency with naming conventions.
    *   Updated signature to use the `Post` type parameter.
    *   Ensured the return type `Reaction[]` is consistent with the singular entity name.
    *   Added an additional query `getReactionsByPostAndUser` for more granular access, demonstrating common querying needs for reactions (e.g., "what has *this user* reacted with on *this post*?").

This revised specification makes the `Reaction` concept far more robust, independent, and clear, aligning it much more closely with the foundational principles of concept design.

# prompt: Add that reactions can only be emojis, and show me the full concept spec and summary of changes again.
# response:

Alright, excellent suggestion. Constraining reaction types to emojis makes the "lightweight feedback" purpose even more specific and consistent with common UX patterns.

Here is the revised `Reaction` concept specification, with the emoji constraint, and an updated summary of changes.

***

### Revised `Reaction` Concept Specification (with Emoji Constraint)

```
concept Reaction [Post, User]
purpose allow users to respond to posts with lightweight emoji feedback
principle when a user adds a specific type of emoji reaction to a post, that reaction is recorded and associated with the post and user; subsequently, the user can remove their specific emoji reaction.
state
  a set of Reaction with // Using singular 'Reaction' for the entity type
    id: UUID            // Add an explicit identifier for each reaction entity
    post: Post          // Use the generic Post type parameter
    reactionType: EmojiString // New type or constraint implying emoji
    reactingUser: User  // Use the generic User type parameter

actions
  add(post: Post, reactionType: EmojiString, reactingUser: User) : (reactionId: UUID)
    **requires**
      // 1. reactionType must be a valid emoji
      reactionType IS_VALID_EMOJI
      // 2. User cannot add the exact same emoji reaction to the same post twice
      AND NOT (EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType)
    **effects** create new_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser
              add new_reaction to Reaction
              returns new_reaction.id

  remove(post: Post, reactionType: EmojiString, reactingUser: User)
    **requires** EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType
    **effects** delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

queries
  getReactionsForPost(post: Post) : (reactions: Reaction[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post

  getReactionsByPostAndUser(post: Post, reactingUser: User) : (reactions: Reaction[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser
```

***

### Summary of Changes:

1.  **Concept Signature:** Remains `[Post, User]` type parameters.
2.  **Purpose & Principle:** Slightly refined to explicitly include "emoji feedback" to match the new constraint.
3.  **State Definition:**
    *   The type of `reactionType` is now denoted as `EmojiString`. This could imply a special primitive type, or a `String` with an implicit runtime validation constraint. For a concept spec, `EmojiString` communicates the intent clearly.
    *   Maintains `id: UUID`, `post: Post`, and `reactingUser: User` leveraging the type parameters.
4.  **`add` Action:**
    *   Updated signature to use `EmojiString` for `reactionType`.
    *   **Crucially, a new `**requires**` clause `reactionType IS_VALID_EMOJI` has been added.** This enforces that any string passed as `reactionType` must conform to the definition of a valid emoji. This check logically precedes the uniqueness check.
    *   `**effects**` remain the same, explicitly describing creation and returning the `UUID`.
5.  **`remove` Action:**
    *   Signature updated to use `EmojiString` for `reactionType`.
    *   `**requires**` and `**effects**` clauses remain, ensuring removal of an existing reaction.
6.  **`queries` Section:**
    *   Remains unchanged, providing read-only access to reaction data. The `reactionType` field in the returned `Reaction` entities would, of course, be of type `EmojiString`.

This update further refines the concept's scope and behavior, making its definition even more precise and aligned with its stated purpose.