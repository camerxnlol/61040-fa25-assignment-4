---
timestamp: 'Wed Nov 05 2025 16:40:30 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_164030.462ddde7.md]]'
content_id: c210cd59a1e5b8e20e768f9c57b46285c8bc0b3fddae243163ef49451a34a0c8
---

# response:

Of course. That's an excellent and very common constraint—avoiding changes to a core library file. Let's analyze the problem again with this new rule.

You are absolutely right, we can resolve this by changing the application code (the concepts and syncs) to work *with* the engine's intended design.

### Root Cause (Revisited)

The core issue remains the same: the engine in `engine/sync.ts` is explicitly designed to treat functions starting with an underscore (`_`) differently.

```ts
// From engine/sync.ts
// Bind queries (starts with "_") without instrumenting
if (typeof value === "function" && value.name.startsWith("_")) {
    // This code path is taken for `_getFriends`.
    // It binds the function but does NOT add the `.concept` property.
    return bound; 
}

if (typeof value === "function" && !value.name.startsWith("_")) {
    // This code path is for all other functions.
    // It fully instruments the function, adding the crucial `.concept` property.
    instrumented.concept = concept;
    return instrumented;
}
```

The `actions()` helper function in your sync file fails because it needs that `.concept` property to exist on any action passed to it. The function `_getFriends` doesn't have it because of the underscore prefix.

This implies a design pattern intended by the engine's author:

* **Public methods (no underscore):** These are considered "Actions" that can be observed and used in synchronization rules (`when`/`then` clauses).
* **Private/Query methods (with underscore):** These are treated as internal helpers or simple data queries that are not meant to trigger synchronizations directly.

### The Fix: Aligning with the Engine's Design

There are two excellent ways to fix this in your application code.

***

### Solution 1 (Recommended): Rename the Action

The simplest and most direct solution is to rename `_getFriends` to `getFriends`. By removing the leading underscore, you are signaling to the engine that this function should be treated as a full-fledged, instrumentable action.

This is the most likely intended use pattern for the framework.

**1. Change the Concept Definition**

In your `friends.concept.ts` file (or wherever `_getFriends` is defined), rename the method.

**Before:**

```ts
// src/concepts/friends.concept.ts
export class FriendsConcept {
    // ... other properties and methods
    
    async _getFriends(input: { user: string }): Promise<{ friends: string[] }> {
        // ... implementation
    }
}
```

**After:**

```ts
// src/concepts/friends.concept.ts
export class FriendsConcept {
    // ... other properties and methods
    
    // Rename by removing the underscore
    async getFriends(input: { user: string }): Promise<{ friends: string[] }> {
        // ... implementation
    }
}
```

**2. Update the Sync Definition**

Now, update your `friends.sync.ts` file to use the new, correctly-instrumented action name.

**Before:**

```ts
// src/syncs/friends.sync.ts
export const GetFriendsRequest = ($: Vars) => ({
    // ...
    when: actions(
        [Friends._getFriends, { user: $.user }, { friends: $.friends }],
    ),
    // ...
});
```

**After:**

```ts
// src/syncs/friends.sync.ts
export const GetFriendsRequest = ($: Vars) => ({
    // ...
    when: actions(
        // Use the renamed action
        [Friends.getFriends, { user: $.user }, { friends: $.friends }],
    ),
    // ...
});
```

This change will resolve the error because `Friends.getFriends` will now be processed by the second `if` block in `instrumentConcept`, receiving the `.concept` property that the `actions()` helper requires.

***

### Solution 2 (Alternative): Wrap the Query in a Public Action

If you have a strong reason to keep `_getFriends` as a "private" query (e.g., it's called by many other internal methods), you can create a new public "command" action whose sole purpose is to be the trigger for this synchronization.

**1. Modify the Concept Definition**

Add a new public method that can be instrumented, and keep your private one.

```ts
// src/concepts/friends.concept.ts
export class FriendsConcept {
    // ...

    // 1. Create a new public action to serve as the sync trigger.
    // It doesn't have to do much. Its existence is what matters.
    async requestFriends(input: { user: string }) {
        console.log(`Friend request for ${input.user} is being processed.`);
        return { status: "pending" };
    }

    // 2. Keep your original private/query method as-is.
    async _getFriends(input: { user: string }): Promise<{ friends: string[] }> {
        // ... implementation
    }
}
```

**2. Update the Sync Definition**

Change your sync rule to listen for the new public action (`requestFriends`) and then have the `then` clause call the appropriate response action (which might internally use `_getFriends`).

```ts
// src/syncs/friends.sync.ts
export const GetFriendsRequest = ($: Vars) => ({
    sync: "GetFriendsRequest",
    // 1. The 'when' now listens for the new, instrumentable public action.
    when: actions(
        [Friends.requestFriends, { user: $.user }, {}],
    ),
    // 2. The 'then' block can define what happens next,
    //    for example, calling a response action.
    then: actions(
        // Assuming you have a `getFriendsResponse` action or similar.
        [Friends.getFriendsResponse, { user: $.user, friends: $.friends }],
    ),
    // The where clause would now contain the logic that calls the private _getFriends
    async where(frames) {
        // ...
        const result = await Friends._getFriends({ user: frames[0][$.user] });
        return frames.bind({ [$.friends]: result.friends });
    }
});
```

This pattern is more complex but is very powerful for separating "commands" (public actions that change state or trigger processes) from "queries" (private methods that just fetch data).

For your situation, **Solution 1 is the most straightforward and recommended fix.**
