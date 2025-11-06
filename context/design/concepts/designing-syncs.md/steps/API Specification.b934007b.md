---
timestamp: 'Wed Nov 05 2025 16:02:52 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_160252.1d463333.md]]'
content_id: b934007b386bd634c34ab72cbeb0909da048e45426a85744f90f60794169b462
---

# API Specification: UserAuthentication Concept

**Purpose:** To securely manage user identities and credentials, allowing users to prove who they are.

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user with a username and password.

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
  "user": "ID"
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

**Description:** Verifies a user's credentials and returns their identifier upon success.

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
  "user": "ID"
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

**Description:** Deletes a user and all their associated data.

**Requirements:**

* The given `user` exists in the state.

**Effects:**

* The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

**Request Body:**

```json
{
  "user": "ID"
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

**Description:** Updates a user's password after verifying their old password.

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
  "user": "ID",
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

**Description:** Updates a user's username after verifying their password.

**Requirements:**

* The given `user` exists in the state.
* The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
* No other `User` exists with the `newUsername`.

**Effects:**

* The `user`'s `username` in the state is updated to `newUsername`.

**Request Body:**

```json
{
  "user": "ID",
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

**Description:** Retrieves a user's identifier by their username.

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
    "user": "ID"
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

**Description:** Retrieves a username by their user identifier.

**Requirements:**

* The given `user` exists.

**Effects:**

* Returns the `username` of the `user`.

**Request Body:**

```json
{
  "user": "ID"
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
