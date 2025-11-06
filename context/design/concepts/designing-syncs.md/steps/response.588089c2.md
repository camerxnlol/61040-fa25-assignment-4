---
timestamp: 'Wed Nov 05 2025 16:26:19 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_162619.0dac4f1b.md]]'
content_id: 588089c23d64c8510a6f946cac1dfcdf6e3868003398e191ce7fe77a2d23bee2
---

# response:

Excellent question. This gets to the heart of how passthrough routes interact with the synchronization engine.

Yes, it is absolutely possible to have a sync that creates a new session upon a successful passthrough authentication. However, there is a critical limitation to this approach that makes it unsuitable for a typical login flow.

Let's break it down.

### Option 1: The Simple Sync (with a Major Drawback)

You can create a very simple sync that does exactly what you asked for: it watches for a successful `UserAuthentication.authenticate` action and then fires a `Sessioning.create` action.

You would add this to your `userAuthentication.sync.ts` file:

```typescript
// file: src/syncs/userAuthentication.sync.ts

import { UserAuthentication, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * This sync will create a session in the background whenever a passthrough
 * authentication is successful.
 *
 * WARNING: The client who made the original request will NOT receive the session ID.
 */
export const CreateSessionOnPassthroughAuth: Sync = ({ user }) => ({
  when: actions(
    // Trigger ONLY on a successful authentication that returns a `user`
    [UserAuthentication.authenticate, {}, { user }],
  ),
  then: actions(
    // Create a new session for that user
    [Sessioning.create, { user }]
  ),
});
```

**How this works:**

1. A client sends a `POST` request to `/api/UserAuthentication/authenticate`.
2. Because this is an `inclusion` in `passthrough.ts`, the engine directly calls `UserAuthentication.authenticate(...)`.
3. The action succeeds and returns `{"user": "some-id"}`.
4. The passthrough mechanism **immediately** sends this JSON object back to the client as the HTTP response.
5. *Separately*, the sync engine sees that `UserAuthentication.authenticate` succeeded. It triggers the `CreateSessionOnPassthroughAuth` sync, which then calls `Sessioning.create(...)`. A new session is created and stored in the database.

**The Critical Limitation:**

The client who authenticated **never receives the session ID**. The HTTP response was already sent in step 4. The session was created "in the background," but the client has no way of knowing what its ID is, making it useless for subsequent authenticated requests.

### Option 2: The Recommended Solution (Orchestrated Flow)

For a login endpoint to be useful, the client **must** get the session ID back in the response. To achieve this, you must orchestrate the sequence of actions and control the final response. This is precisely what the `Requesting` concept is for, and it requires **excluding the route from passthrough**.

This brings us back to the solution from the previous prompt, which is the standard and correct way to implement this flow. By excluding `/api/UserAuthentication/authenticate`, you enable the following orchestrated sequence:

1. **Request:** The HTTP request becomes a `Requesting.request` action.
2. **Authentication:** A sync triggers `UserAuthentication.authenticate`.
3. **Session Creation:** A *second* sync sees the successful authentication and triggers `Sessioning.create`.
4. **Response:** A *third* sync sees that the session was created and triggers `Requesting.respond`, sending the session ID back to the client who made the original request.

### Summary

| Feature | Option 1: Passthrough Sync | Option 2: Excluded Route Sync Flow |
| :--- | :--- | :--- |
| **Is it possible?** | **Yes** | **Yes** |
| **Route in `passthrough.ts`**| `inclusions` | `exclusions` |
| **Complexity** | Very simple (1 sync) | More complex (3-4 syncs) |
| **Client receives session ID?**| **No** | **Yes** |
| **Use Case** | Background tasks (e.g., logging an event after an action). **Not suitable for login.** | Any flow requiring a specific value to be returned to the client after multiple steps. **This is the correct pattern for login.**|

In conclusion, while you *can* create a session from a passthrough route, it doesn't fulfill the purpose of a login endpoint. To return the session ID to the user, you must use the orchestrated request/response pattern by excluding the route.
