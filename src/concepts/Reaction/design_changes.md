# Design Changes for Reaction

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