---
timestamp: 'Sun Oct 19 2025 22:39:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223948.042445af.md]]'
content_id: 7c2d392c7aea0dbeb3f19984cb732b9441004a5483bdf30659529d110e44c142
---

# API Specification: UserAuthentication Concept

**Purpose:** To securely manage user identities and credentials, allowing users to prove who they are.

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account with a unique username and a securely hashed password.

**Requirements:**

* No User exists with the given `username`.

**Effects:**

* A new `salt` is generated (e.g., a cryptographically secure random string).
* The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
* A new `User` is created.
* The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
* Returns the new `User` identifier.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/authenticate

**Description:** Verifies user credentials and returns the user identifier upon successful authentication.

**Requirements:**

* A User exists with the given `username`.

**Effects:**

* The `salt` associated with the User identified by `username` is retrieved from the state.
* The provided `password` is combined with the retrieved `salt` and hashed using the same cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
* If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns the `User` identifier.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/delete

**Description:** Removes a user and all their associated credentials from the system.

**Requirements:**

* The given `user` exists in the state.

**Effects:**

* The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/changePassword

**Description:** Updates a user's password after verifying the old password.

**Requirements:**

* The given `user` exists in the state.
* The `oldPassword`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.

**Effects:**

* A *new* `salt` is generated for the `user`.
* The `newPassword` is combined with the new `salt` and hashed, resulting in an updated `hashedPassword`.
* The `user`'s `hashedPassword` and `salt` are updated in the state.

**Request Body:**

```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/changeUsername

**Description:** Updates a user's username after verifying their password and ensuring the new username is unique.

**Requirements:**

* The given `user` exists in the state.
* The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
* No other `User` exists with the `newUsername`.

**Effects:**

* The `user`'s `username` in the state is updated to `newUsername`.

**Request Body:**

```json
{
  "user": "string",
  "newUsername": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getUserByUsername

**Description:** Retrieves the user identifier for a given username.

**Requirements:**

* A User exists with the given `username`.

**Effects:**

* Returns the `User` identifier associated with the `username`.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getUsername

**Description:** Retrieves the username for a given user identifier.

**Requirements:**

* The given `user` exists.

**Effects:**

* Returns the `username` of the `user`.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "username": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
