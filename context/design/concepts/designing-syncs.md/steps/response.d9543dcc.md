---
timestamp: 'Wed Nov 05 2025 16:24:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_162421.5b1063a5.md]]'
content_id: d9543dcc7d248947d5a67549d2590082ac8c238a12d6231caa47e42c72bdb1ef
---

# response:

Of course. Here is the synchronization logic to create a new session upon successful user authentication.

This is a critical piece of application logic that demonstrates how concepts can be composed. When a user successfully authenticates (`UserAuthentication` concept), we want to create a new session for them (`Sessioning` concept) and return that session ID to the client.

**Important Prerequisite:** For this flow to work correctly, the authentication endpoint cannot be a simple passthrough route, because we need to orchestrate multiple actions before responding. You must modify `passthrough.ts` and move the authentication route from the `inclusions` record to the `exclusions` array:

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

With that change made, you can add the following syncs to your `userAuthentication.sync.ts` file. This set of syncs defines the complete, orchestrated login flow.

### User Authentication Syncs (Updated)

This file now includes the logic for handling an authentication request, creating a session on success, and responding to the original request with the new session ID.

```typescript
// file: src/syncs/userAuthentication.sync.ts

import { UserAuthentication, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- Authenticate User and Create Session ---
// This multi-stage sync orchestrates the login flow.

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

export const DeleteUserResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/delete" }, { request }],
    [UserAuthentication.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});


// --- Change Password ---
export const ChangePasswordRequest: Sync = ({ request, session, user, oldPassword, newPassword }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changePassword", session, oldPassword, newPassword }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changePassword, { user, oldPassword, newPassword }]),
});

export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Change Username ---
export const ChangeUsernameRequest: Sync = ({ request, session, user, newUsername, password }) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/changeUsername", session, newUsername, password }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserAuthentication.changeUsername, { user, newUsername, password }]),
});

export const ChangeUsernameResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changeUsername" }, { request }],
    [UserAuthentication.changeUsername, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// --- Generic Error Response for UserAuthentication ---
export const UserAuthenticationErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }],
    [UserAuthentication.delete, {}, { error }],
    [UserAuthentication.changePassword, {}, { error }],
    [UserAuthentication.changeUsername, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
