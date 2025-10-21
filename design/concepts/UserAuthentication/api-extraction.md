
[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

```ts
import { Collection, Db } from "npm:mongodb";

import { Empty, ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Declare collection prefix, use concept name

const PREFIX = "UserAuthentication" + ".";

  

// Generic types of this concept

type User = ID;

  

/**

* a set of Users with

* a username String (must be unique across all Users)

* a hashedPassword String (the salted and hashed password)

* a salt String (a unique salt generated for each password)

*/

interface UserDoc {

_id: User;

username: string;

hashedPassword: string;

salt: string;

}

  

// PBKDF2 configuration

const ITERATIONS = 100000; // Number of PBKDF2 iterations

const SALT_LENGTH = 16; // 16 bytes for salt (128 bits)

const HASH_LENGTH = 32; // 32 bytes for hash (256 bits)

  

// Helper function to convert ArrayBuffer to hex string

function ab2hex(buffer: ArrayBuffer): string {

return Array.prototype.map.call(

new Uint8Array(buffer),

(x) => ("00" + x.toString(16)).slice(-2),

).join("");

}

  

// Helper function to convert hex string to Uint8Array

function hex2ab(hex: string): Uint8Array {

// Ensure the hex string has an even length

if (hex.length % 2 !== 0) {

throw new Error("Invalid hex string length");

}

const buffer = new Uint8Array(hex.length / 2);

for (let i = 0; i < hex.length; i += 2) {

buffer[i / 2] = parseInt(hex.substring(i, i + 2), 16);

}

return buffer;

}

  

/**

* Generates a cryptographically secure random salt.

* @returns A promise that resolves to the salt as a hex string.

*/

// Removed 'async' as there's no 'await' expression inside,

// but still returns a Promise for consistency with other async operations.

function generateSalt(): Promise<string> {

const saltUint8 = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

// ab2hex expects ArrayBuffer, so pass the underlying buffer

return Promise.resolve(ab2hex(saltUint8.buffer));

}

  

/**

* Hashes a password using PBKDF2 with SHA-256.

* @param password The password string to hash.

* @param salt The salt string (hex encoded) to use.

* @returns A promise that resolves to the hashed password as a hex string.

*/

async function hashPassword(password: string, salt: string): Promise<string> {

const passwordBuffer = new TextEncoder().encode(password); // Uint8Array

const saltUint8 = hex2ab(salt); // Uint8Array

  

const keyMaterial = await crypto.subtle.importKey(

"raw",

passwordBuffer, // Uint8Array is a valid BufferSource for importKey

{ name: "PBKDF2" },

false,

["deriveBits"],

);

  

const derivedBits = await crypto.subtle.deriveBits(

{

name: "PBKDF2",

// Use the .buffer property of Uint8Array to ensure ArrayBuffer type for salt

salt: saltUint8.buffer as ArrayBuffer,

iterations: ITERATIONS,

hash: "SHA-256",

},

keyMaterial,

HASH_LENGTH * 8, // Desired length in bits

);

  

return ab2hex(derivedBits); // derivedBits is ArrayBuffer, ab2hex expects ArrayBuffer

}

  

/**

* Verifies if a given password matches a stored hashed password using its salt.

* @param password The password to verify.

* @param salt The stored salt (hex encoded).

* @param storedHashedPassword The stored hashed password (hex encoded).

* @returns A promise that resolves to true if the password matches, false otherwise.

*/

async function verifyPassword(

password: string,

salt: string,

storedHashedPassword: string,

): Promise<boolean> {

const candidateHashedPassword = await hashPassword(password, salt);

return candidateHashedPassword === storedHashedPassword;

}

  

/**

* UserAuthentication Concept

* purpose: To securely manage user identities and credentials, allowing users to prove who they are.

*/

export default class UserAuthenticationConcept {

users: Collection<UserDoc>;

  

constructor(private readonly db: Db) {

this.users = this.db.collection(PREFIX + "users");

}

  

/**

* register (username: String, password: String): (user: User)

*

* **requires** no User exists with the given `username`.

*

* **effects**

* 1. A new `salt` is generated (e.g., a cryptographically secure random string).

* 2. The `password` is combined with the `salt` and hashed using a strong, one-way

* cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.

* 3. A new `User` is created.

* 4. The `username`, `hashedPassword`, and `salt` are associated with the new `User`.

* 5. Returns the new `User` identifier.

*/

async register(

{ username, password }: { username: string; password: string },

): Promise<{ user: User } | { error: string }> {

// Check precondition: no User exists with the given `username`.

const existingUser = await this.users.findOne({ username });

if (existingUser) {

return { error: `Username '${username}' already exists.` };

}

  

// Effects:

const salt = await generateSalt();

const hashedPassword = await hashPassword(password, salt);

const newUser: UserDoc = {

_id: freshID() as User,

username,

hashedPassword,

salt,

};

  

await this.users.insertOne(newUser);

return { user: newUser._id };

}

  

/**

* authenticate (username: String, password: String): (user: User)

*

* **requires** a User exists with the given `username`.

*

* **effects**

* 6. The `salt` associated with the User identified by `username` is retrieved from the state.

* 7. The provided `password` is combined with the retrieved `salt` and hashed using the same

* cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.

* 8. If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns

* the `User` identifier.

*/

async authenticate(

{ username, password }: { username: string; password: string },

): Promise<{ user: User } | { error: string }> {

// Check precondition: a User exists with the given `username`.

const user = await this.users.findOne({ username });

if (!user) {

return { error: "Invalid credentials." };

}

  

// Effects:

const isValid = await verifyPassword(

password,

user.salt,

user.hashedPassword,

);

  

if (isValid) {

return { user: user._id };

} else {

return { error: "Invalid credentials." };

}

}

  

/**

* delete (user: User): ()

*

* **requires** the given `user` exists in the state.

*

* **effects** The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

*/

async delete(

{ user }: { user: User },

): Promise<Empty | { error: string }> {

// Check precondition: the given `user` exists in the state.

const existingUser = await this.users.findOne({ _id: user });

if (!existingUser) {

return { error: `User with ID '${user}' not found.` };

}

  

// Effects:

await this.users.deleteOne({ _id: user });

return {};

}

  

/**

* changePassword (user: User, oldPassword: String, newPassword: String): ()

*

* **requires**

* 9. The given `user` exists in the state.

* 10. The `oldPassword`, when combined with the `user`'s stored `salt` and hashed,

* matches the `user`'s stored `hashedPassword`.

*

* **effects**

* 11. A *new* `salt` is generated for the `user`.

* 12. The `newPassword` is combined with the new `salt` and hashed,

* resulting in an updated `hashedPassword`.

* 13. The `user`'s `hashedPassword` and `salt` are updated in the state.

*/

async changePassword(

{ user, oldPassword, newPassword }: {

user: User;

oldPassword: string;

newPassword: string;

},

): Promise<Empty | { error: string }> {

// Check precondition 9: The given `user` exists in the state.

const existingUser = await this.users.findOne({ _id: user });

if (!existingUser) {

return { error: `User with ID '${user}' not found.` };

}

  

// Check precondition 10: The `oldPassword` matches the stored `hashedPassword`.

const isValidOldPassword = await verifyPassword(

oldPassword,

existingUser.salt,

existingUser.hashedPassword,

);

if (!isValidOldPassword) {

return { error: "Incorrect old password." };

}

  

// Effects:

const newSalt = await generateSalt();

const newHashedPassword = await hashPassword(newPassword, newSalt);

  

await this.users.updateOne(

{ _id: user },

{ $set: { hashedPassword: newHashedPassword, salt: newSalt } },

);

return {};

}

  

/**

* changeUsername (user: User, newUsername: String, password: String): ()

*

* **requires**

* 14. The given `user` exists in the state.

* 15. The `password`, when combined with the `user`'s stored `salt` and hashed,

* matches the `user`'s stored `hashedPassword`.

* 16. No other `User` exists with the `newUsername`.

*

* **effects** The `user`'s `username` in the state is updated to `newUsername`.

*/

async changeUsername(

{ user, newUsername, password }: {

user: User;

newUsername: string;

password: string;

},

): Promise<Empty | { error: string }> {

// Check precondition 14: The given `user` exists in the state.

const existingUser = await this.users.findOne({ _id: user });

if (!existingUser) {

return { error: `User with ID '${user}' not found.` };

}

  

// Check precondition 15: The `password` matches the stored `hashedPassword`.

const isValidPassword = await verifyPassword(

password,

existingUser.salt,

existingUser.hashedPassword,

);

if (!isValidPassword) {

return { error: "Incorrect password." };

}

  

// Check precondition 16: No other `User` exists with the `newUsername`.

const userWithNewUsername = await this.users.findOne({

username: newUsername,

_id: { $ne: user }, // Ensure it's not the same user

});

if (userWithNewUsername) {

return { error: `Username '${newUsername}' is already taken.` };

}

  

// Effects:

await this.users.updateOne(

{ _id: user },

{ $set: { username: newUsername } },

);

return {};

}

  

// --- Queries ---

  

/**

* _getUserByUsername (username: String): (user: User)

*

* **requires** a User exists with the given `username`.

*

* **effects** returns the `User` identifier associated with the `username`.

*/

async _getUserByUsername(

{ username }: { username: string },

): Promise<Array<{ user: User }> | { error: string }> {

const userDoc = await this.users.findOne({ username });

if (userDoc) {

return [{ user: userDoc._id }];

}

return { error: `User with username '${username}' not found.` };

}

  

/**

* _getUsername (user: User): (username: String)

*

* **requires** the given `user` exists.

*

* **effects** returns the `username` of the `user`.

*/

async _getUsername(

{ user }: { user: User },

): Promise<Array<{ username: string }> | { error: string }> {

const userDoc = await this.users.findOne({ _id: user });

if (userDoc) {

return [{ username: userDoc.username }];

}

return { error: `User with ID '${user}' not found.` };

}

}
```


# prompt: 

Now, analyze the following Concept Implementation for UserAuthentication and generate the API documentation based on these instructions.
# response:

# API Specification: UserAuthentication Concept

**Purpose:** To securely manage user identities and credentials, allowing users to prove who they are.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account with a unique username and a securely hashed password.

**Requirements:**
- No User exists with the given `username`.

**Effects:**
- A new `salt` is generated (e.g., a cryptographically secure random string).
- The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
- A new `User` is created.
- The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
- Returns the new `User` identifier.

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
---
### POST /api/UserAuthentication/authenticate

**Description:** Verifies user credentials and returns the user identifier upon successful authentication.

**Requirements:**
- A User exists with the given `username`.

**Effects:**
- The `salt` associated with the User identified by `username` is retrieved from the state.
- The provided `password` is combined with the retrieved `salt` and hashed using the same cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
- If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns the `User` identifier.

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
---
### POST /api/UserAuthentication/delete

**Description:** Removes a user and all their associated credentials from the system.

**Requirements:**
- The given `user` exists in the state.

**Effects:**
- The `user` and all its associated `username`, `hashedPassword`, and `salt` are removed from the state.

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
---
### POST /api/UserAuthentication/changePassword

**Description:** Updates a user's password after verifying the old password.

**Requirements:**
- The given `user` exists in the state.
- The `oldPassword`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.

**Effects:**
- A *new* `salt` is generated for the `user`.
- The `newPassword` is combined with the new `salt` and hashed, resulting in an updated `hashedPassword`.
- The `user`'s `hashedPassword` and `salt` are updated in the state.

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
---
### POST /api/UserAuthentication/changeUsername

**Description:** Updates a user's username after verifying their password and ensuring the new username is unique.

**Requirements:**
- The given `user` exists in the state.
- The `password`, when combined with the `user`'s stored `salt` and hashed, matches the `user`'s stored `hashedPassword`.
- No other `User` exists with the `newUsername`.

**Effects:**
- The `user`'s `username` in the state is updated to `newUsername`.

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
---
### POST /api/UserAuthentication/_getUserByUsername

**Description:** Retrieves the user identifier for a given username.

**Requirements:**
- A User exists with the given `username`.

**Effects:**
- Returns the `User` identifier associated with the `username`.

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
---
### POST /api/UserAuthentication/_getUsername

**Description:** Retrieves the username for a given user identifier.

**Requirements:**
- The given `user` exists.

**Effects:**
- Returns the `username` of the `user`.

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
---