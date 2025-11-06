---
timestamp: 'Wed Nov 05 2025 16:35:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_163518.52c5a673.md]]'
content_id: a060249edc2bdd3f630b748fb66e87ee26ce95be88896c00dc92469c61532268
---

# response:

Of course. Let's break down the error and fix the code.

### Root Cause of the Error

The error message `Error: Action bound _getFriends is not instrumented` points to a specific problem in your `engine/sync.ts` file.

1. The `actions()` helper function (line 29) is called to define a synchronization pattern.
2. Inside this function, it iterates through the actions you provide and expects each one to have a `.concept` property (`const concept = action.concept;`).
3. If `action.concept` is `undefined`, it throws the error you're seeing (line 32).
4. Looking at the `instrumentConcept` method (line 330), we can see the cause. There is special logic that handles functions whose names start with an underscore (`_`) differently:

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
