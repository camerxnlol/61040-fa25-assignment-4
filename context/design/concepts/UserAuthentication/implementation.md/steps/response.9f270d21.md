---
timestamp: 'Mon Oct 13 2025 22:10:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_221035.99326613.md]]'
content_id: 9f270d21ad1eeb61ab3b041788f0bf0157dcf9fae48fc24add26b56c7aa7f6b4
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

  **authenticate** (username: String, password: String): (user: User)
    **requires** a User exists with the given `username`.
    **effects**
      6. The `salt` associated with the User identified by `username` is retrieved from the state.
      7. The provided `password` is combined with the retrieved `salt` and hashed using the same cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
      8. If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns the `User` identifier.

  **delete** (user: User): ()
    **requires** the given `user` exists in the state.
    **effects** The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

  **changePassword** (user: User, oldPassword: String, newPassword: String): ()
    **requires**
      9. The given `user` exists in the state.
      10. The `oldPassword`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
    **effects**
      11. A *new* `salt` is generated for the `user`.
      12. The `newPassword` is combined with the new `salt` and hashed, resulting in an updated `hashedPassword`.
      13. The `user`'s `hashedPassword` and `salt` are updated in the state.

  **changeUsername** (user: User, newUsername: String, password: String): ()
    **requires**
      14. The given `user` exists in the state.
      15. The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
      16. No other `User` exists with the `newUsername`.
    **effects** The `user`'s `username` in the state is updated to `newUsername`.

***
