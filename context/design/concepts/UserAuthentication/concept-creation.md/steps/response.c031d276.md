---
timestamp: 'Mon Oct 13 2025 22:00:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_220022.3e79f5af.md]]'
content_id: c031d2769a2f0845363fc8b04b3206ea478b1e6d44d78efc2ba8b1eec206d68d
---

# response:

Here is the specification for a `UserAuthentication` concept, incorporating salted passwords as requested.

***

**concept** UserAuthentication \[User]

**purpose** To securely manage user identities and credentials, allowing users to prove who they are.

**principle** If a user registers with a username and password, then they can later log in with those same credentials to prove their identity and access authenticated functionality. If they change their password, their old password will no longer work, but their new one will.

**state**
  a set of Users (a unique identifier for each user account) with
    a username String (must be unique across all Users)
    a hashedPassword String (the salted and hashed password)
    a salt String (a unique salt generated for each password)

**actions**

  **register** (username: String, password: String): (user: User)
    **requires** no User exists with the given `username`.
    **effects**
      1. A new `salt` is generated (e.g., a cryptographically secure random string).
      2. The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function, resulting in a `hashedPassword`.
      3. A new `User` is created.
      4. The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
      5. Returns the new `User` identifier.

  **register** (username: String, password: String): (error: String)
    **requires** a User already exists with the given `username`.
    **effects** Returns an error message indicating the username is taken.

  **authenticate** (username: String, password: String): (user: User)
    **requires** a User exists with the given `username`.
    **effects**
      1. The `salt` associated with the User identified by `username` is retrieved from the state.
      2. The provided `password` is combined with the retrieved `salt` and hashed using the same cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
      3. If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns the `User` identifier.

  **authenticate** (username: String, password: String): (error: String)
    **requires**
      1. No User exists with the given `username`, OR
      2. A User exists, but the provided `password` does not match the stored `hashedPassword` when salted and hashed.
    **effects** Returns an error message (e.g., "Invalid credentials").

  **delete** (user: User): ()
    **requires** the given `user` exists in the state.
    **effects** The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

  **delete** (user: User): (error: String)
    **requires** the given `user` does not exist in the state.
    **effects** Returns an error message (e.g., "User not found").

  **changePassword** (user: User, oldPassword: String, newPassword: String): ()
    **requires**
      1. The given `user` exists in the state.
      2. The `oldPassword`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
    **effects**
      1. A *new* `salt` is generated for the `user`.
      2. The `newPassword` is combined with the new `salt` and hashed, resulting in an updated `hashedPassword`.
      3. The `user`'s `hashedPassword` and `salt` are updated in the state.

  **changePassword** (user: User, oldPassword: String, newPassword: String): (error: String)
    **requires**
      1. The given `user` does not exist in the state, OR
      2. The `oldPassword` does not match the `user`'s current password.
    **effects** Returns an error message (e.g., "User not found" or "Incorrect old password").

  **changeUsername** (user: User, newUsername: String, password: String): ()
    **requires**
      1. The given `user` exists in the state.
      2. The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
      3. No other `User` exists with the `newUsername`.
    **effects** The `user`'s `username` in the state is updated to `newUsername`.

  **changeUsername** (user: User, newUsername: String, password: String): (error: String)
    **requires**
      1. The given `user` does not exist in the state, OR
      2. The `password` does not match the `user`'s current password, OR
      3. Another `User` already exists with the `newUsername`.
    **effects** Returns an error message (e.g., "User not found", "Incorrect password", or "Username already taken").

***
