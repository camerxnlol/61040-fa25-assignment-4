---
timestamp: 'Wed Nov 05 2025 17:02:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_170231.b5838783.md]]'
content_id: 86111efb99b2583d51c867a1364844b92986081edb0f4dcbed2cf45b18763ebc
---

# response:

Of course. Here is a short, well-structured Piazza post that raises this question effectively, using your specific example.

***

**Subject: Question on Syncing with 'Query' Methods (e.g., `_getFriends`)**

Hi everyone,

I have a question about the intended design pattern for methods prefixed with an underscore (`_`), which seem to be treated as "queries" by the sync engine.

I noticed in `engine/sync.ts`, the `instrumentConcept` proxy specifically avoids fully instrumenting functions whose names start with an `_`. This means they don't receive the `.concept` property.

This became an issue when I tried to create a sync rule that listens for a data fetch action, like `_getFriends`:

```typescript
// In my syncs/friends.sync.ts
export const GetFriendsRequest = ($: Vars) => ({
    // ...
    when: actions(
        [Friends._getFriends, { user: $.user }, { friends: $.friends }]
    ),
    // ...
});
```

This code fails with the error `Error: Action bound _getFriends is not instrumented.` because the `actions()` helper requires the `.concept` property to be present.

This leads to my main question about the framework's design. My goal is to model a data fetch using the same sync patterns we use for other actions: one sync for the **request** (`_getFriends`), another for the **response**, and a third for a potential **error**. Treating the data request as an observable event that can trigger other logic feels very natural within this architecture.

Given that the engine handles these `_` methods differently, what is the recommended approach?

1. Should we make all such "queries" public actions by renaming them (e.g., `_getFriends` -> `getFriends`) so they can be fully instrumented and used in `when` clauses?
2. Or, is there a different, intended pattern for handling data fetch flows that I'm missing, where the query itself isn't meant to be a trigger?

Just looking for some clarity on the best practice here. Thanks
