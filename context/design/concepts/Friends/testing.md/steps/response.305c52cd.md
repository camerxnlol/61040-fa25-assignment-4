---
timestamp: 'Tue Oct 28 2025 01:44:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014422.893d3270.md]]'
content_id: 305c52cdb4a084d790302b7a97040de34e87eff277d6a6ca6dec02930c9adc9e
---

# response:

The error `Type 'true' is not assignable to type 'never'` occurs because the `Empty` type is defined as `Record<PropertyKey, never>`, meaning an object that strictly has *no* properties. When you return `{ success: true }`, you are attempting to assign an object with a `success` property to a type that explicitly forbids any properties.

The problem stems from a slight misinterpretation of how to handle non-empty successful results when an error return is also possible. The documentation states:
"An empty dictionary can be used to represent successful completion, but if there is also an overloaded version of the action that returns an error, the successful case *must* return a dictionary that is non-empty."

Your action specifications include `(success: Boolean) or (error: String)`, which means the successful case should return a dictionary with a `success: true` field, not an `Empty` dictionary.

To fix this, you need to adjust the return types of your action methods to correctly reflect that a successful execution returns `{ success: boolean }` (or specifically `{ success: true }` in your case), while an error returns `{ error: string }`.

Here's the corrected `FriendsConcept.ts` file:
