# Design Changes for Post

**Problem:** `actionDescription` is too specific to "ranking actions." The `Post` concept's responsibility is to *store* a visible record, not to *interpret* or *generate* specific action descriptions. The *content* of the post should be provided by an external concept (like `Ranking`) via a synchronization.
    *   **Principle Violated:** Separation of Concerns (conflating generic posting with specific action summarization).
    *   **Improvement:** Rename `actionDescription` to `content: String`.
**Reclassify `view` as a Query:**
    *   **Problem:** The document states: "The events are instances of *actions*, and usually mutators of the state. ... Queries, by contrast, are often defined implicitly by the state and do not need to be explicitly specified." `view` is clearly a read operation, not a mutator. Including it under `actions` conflates these two categories.
    *   **Principle Violated:** Clarity in specification (actions vs. queries).
    *   **Improvement:** Move `view` to a dedicated `queries` section and rename it to be more explicit about what it retrieves.