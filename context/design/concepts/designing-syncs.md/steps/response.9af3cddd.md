---
timestamp: 'Thu Nov 06 2025 10:10:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_101031.ac198dab.md]]'
content_id: 9af3cdddf59f40e0700dec855b4753c7b4aed93861bf5de939ff8fbafcf61097
---

# response:

Of course. Here is the complete synchronization logic to create a new session upon successful user authentication.

This is a critical piece of application logic that demonstrates how concepts can be composed. When a user successfully authenticates (`UserAuthentication` concept), we create a new session for them (`Sessioning` concept) and return that session ID to the client. This orchestrated flow is the standard pattern for handling logins.

### Prerequisite: Exclude the Authentication Route

For this flow to work correctly, the authentication endpoint cannot be a simple passthrough route, because we need to orchestrate multiple actions before responding. You must modify `passthrough.ts` and move the authentication route from the `inclusions` record to the `exclusions` array.

```typescript
// file: passthrough.ts (MODIFIED)

export const inclusions: Record<string, string> = {
  "/api/UserAuthentication/register": "allow anyone to register",
  // REMOVE THE LINE BELOW
  // "/api/UserAuthentication/authenticate": "allow anyone to authenticate",
  "/api/UserAuthentication/_getUserByUsername": "allow anyone to get user by username",
  "/api/UserAuthentication/_getUsername": "allow anyone to get username",
};

export const exclusions: Array<string> = [
  // ADD THE LINE BELOW
  "/api/UserAuthentication/authenticate",
  "/api/Reaction/add",
  // ... other existing exclusions
];
```

With that change made, you can use the following `userAuthentication.sync.ts` file. This set of syncs defines the complete, orchestrated login flow.

### User Authentication Syncs (with Session Creation)

This file contains the full logic for handling an authentication request, creating a session on success, and responding to the original request with the new session ID.

```typescript
// file: src/syncs/userAuthentication.sync.ts

import { UserAuthentication, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Authenticate User and Create Session Flow ---
// This multi-stage sync orchestrates the login process.

// 1. Catches the initial HTTP request and triggers the authentication action.
export const AuthenticateRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/authenticate", username, password },
    { request },
  ]),
  then: actions([UserAuthentication.authenticate, { username, password }]),
});

// 2. When authentication succeeds, this sync triggers the creation of a new session.
export const CreateSessionOnAuthSuccess: Sync = ({ request, user }) => ({
  when: actions(
    // Ensure we are in the flow of an authentication request
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    // Triggered by a successful authentication, capturing the user ID
    [UserAuthentication.authenticate, {}, { user }],
  ),
  then: actions([Sessioning.create, { user }]),
});

// 3. When the session is created, this sync responds to the original HTTP request
//    with the new session ID and the authenticated user's ID.
export const AuthenticateResponse: Sync = ({ request, session, user }) => ({
  when: actions(
    // Match the original request
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    // Get the user from the successful auth action
    [UserAuthentication.authenticate, {}, { user }],
    // Get the session from the successful session creation action
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session, user }]),
});

// 4. If authentication fails, this sync responds with an error.
export const AuthenticateErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Other Authenticated Actions (Delete User, Change Password, etc.) ---

// --- Delete User ---
export const DeleteUserRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/delete", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.delete, { user }]),
});

// --- Change Password ---
export const ChangePasswordRequest: Sync = ({ request, session, user, oldPassword, newPassword }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changePassword", session, oldPassword, newPassword }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changePassword, { user, oldPassword, newPassword }]),
});

// --- Change Username ---
export const ChangeUsernameRequest: Sync = ({ request, session, user, newUsername, password }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changeUsername", session, newUsername, password }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changeUsername, { user, newUsername, password }]),
});


// --- Generic Response/Error Sync for Other Actions ---
export const UserAuthenticationActionResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }],
    [UserAuthentication.delete, {}, { error }],
    [UserAuthentication.changePassword, {}, { error }],
    [UserAuthentication.changeUsername, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
