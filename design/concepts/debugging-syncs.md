[@engine](engine.md)
# prompt: Attached above is the engine/sync.ts file. Fix this error that I get please

# response:

Of course. Let's break down the error and fix the code.

### Root Cause of the Error

The error message `Error: Action bound _getFriends is not instrumented` points to a specific problem in your `engine/sync.ts` file.

1.  The `actions()` helper function (line 29) is called to define a synchronization pattern.
2.  Inside this function, it iterates through the actions you provide and expects each one to have a `.concept` property (`const concept = action.concept;`).
3.  If `action.concept` is `undefined`, it throws the error you're seeing (line 32).
4.  Looking at the `instrumentConcept` method (line 330), we can see the cause. There is special logic that handles functions whose names start with an underscore (`_`) differently:

    ```ts
    // Bind queries (starts with "_") without instrumenting
    if (
        typeof value === "function" && value.name.startsWith("_")
    ) {
        // ... this block just binds the function but does NOT add the .concept property
        return bound;
    }
    
    if (
        typeof value === "function" && !value.name.startsWith("_")
    ) {
        // ... this block performs the full instrumentation, including adding .concept
        instrumented.concept = concept;
        // ...
    }
    ```

The action `_getFriends` from your syncs file falls into the first `if` block. It gets bound but is never fully "instrumented", meaning it never receives the crucial `.concept` property. When you then use `_getFriends` inside a sync definition, the `actions()` helper fails because it can't find that property.

### The Fix

The solution is to remove this special-casing and ensure that **all** functions on a concept are fully instrumented, regardless of their name. This allows you to use any method from your concept within a sync definition.

To do this, we will merge the two `if` blocks in the `instrumentConcept` method into a single one that handles all functions.

### Corrected `engine/sync.ts`

Here is the corrected `instrumentConcept` method. You can replace the entire existing method in `engine/sync.ts` with this corrected version.

```ts
// engine/sync.ts

// ... (keep all the code before this method)

instrumentConcept<T extends object>(concept: T) {
    const Action = this.Action;
    const synchronize = this.synchronize.bind(this);
    const boundActions = this.boundActions;
    return new Proxy(concept, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);

            // We now instrument ALL functions, regardless of their name.
            if (typeof value === "function") {
                // Check if we've already created and cached the instrumented action.
                let instrumented = boundActions.get(value);

                if (instrumented === undefined) {
                    // If not cached, create the instrumented version.
                    const action = value.bind(concept);
                    // To allow this.action to be reactive, we can bind receiver instead
                    // However, this might break access to private fields or methods
                    // const action = value.bind(receiver);
                    instrumented = async function instrumented(
                        args: ActionArguments,
                    ) {
                        let {
                            [flow]: flowToken,
                            [synced]: syncedMap,
                            [actionId]: id,
                            ...input
                        } = args;

                        if (flowToken === undefined) {
                            flowToken = uuid();
                        }
                        if (typeof flowToken !== "string") {
                            throw new Error("Flow token not string.");
                        }
                        if (syncedMap === undefined) {
                            syncedMap = new Map();
                        }
                        if (!(syncedMap instanceof Map)) {
                            throw new Error("synced must be a Map.");
                        }
                        if (id === undefined) id = uuid();
                        if (typeof id !== "string") {
                            throw new Error("actionId not string.");
                        }

                        const actionRecord = {
                            id,
                            action: instrumented,
                            concept,
                            input,
                            synced: syncedMap,
                            flow: flowToken,
                        };

                        Action.invoke(actionRecord);
                        const output = await action(input);
                        Action.invoked({ id, output });
                        await synchronize({ ...actionRecord, output });
                        return output;
                    };
                    
                    // This is the crucial part: attach the concept and other metadata.
                    instrumented.concept = concept;
                    instrumented.action = action;
                    const instrumentedRepr = () => `${inspect(action)}`;
                    instrumented.toString = instrumentedRepr;
                    Object.defineProperty(instrumented, inspect.custom, {
                        value: instrumentedRepr,
                        writable: false,
                        configurable: true,
                    });
                    
                    // Cache the new instrumented action.
                    boundActions.set(value, instrumented);
                }
                
                return instrumented as InstrumentedAction;
            }

            return value;
        },
    });
}

// ... (keep all the code after this method)
```

By making this change, `_getFriends` will be treated like any other action. It will be fully instrumented with the `.concept` property, and the `actions()` helper function will be able to process it without throwing an error.

# prompt: Let's not change the engine file, but rather see how we can change the concepts or the syncs to resolve this error
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
*   **Public methods (no underscore):** These are considered "Actions" that can be observed and used in synchronization rules (`when`/`then` clauses).
*   **Private/Query methods (with underscore):** These are treated as internal helpers or simple data queries that are not meant to trigger synchronizations directly.

### The Fix: Aligning with the Engine's Design

There are two excellent ways to fix this in your application code.

---

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

---

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

# prompt: Write a short piazza post questioning the role of queries and if all queries should be public since the engine/sync.ts handles them differently. My intended behavior is to make a sync for the queries like we would for any of the other actions (one for request, one for response, one for error). Give the \_getFriends example from the code.
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

1.  Should we make all such "queries" public actions by renaming them (e.g., `_getFriends` -> `getFriends`) so they can be fully instrumented and used in `when` clauses?
2.  Or, is there a different, intended pattern for handling data fetch flows that I'm missing, where the query itself isn't meant to be a trigger?

Just looking for some clarity on the best practice here. Thanks