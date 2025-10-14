[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@concept-creation](concept-creation.md)

# implement: UserAuthentication

# response:

Here is the `UserAuthentication` concept specification, followed by its TypeScript implementation.

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
      2. The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
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

**queries**

  **_getUserByUsername** (username: String): (user: User)
    **requires** a User exists with the given `username`.
    **effects** returns the `User` identifier associated with the `username`.

  **_getUsername** (user: User): (username: String)
    **requires** the given `user` exists.
    **effects** returns the `username` of the `user`.

***

# file: src/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

// Generic types of this concept
type User = ID;

/**
 * a set of Users with
 *   a username String (must be unique across all Users)
 *   a hashedPassword String (the salted and hashed password)
 *   a salt String (a unique salt generated for each password)
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

// Helper function to convert hex string to ArrayBuffer
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
async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return ab2hex(salt.buffer);
}

/**
 * Hashes a password using PBKDF2 with SHA-256.
 * @param password The password string to hash.
 * @param salt The salt string (hex encoded) to use.
 * @returns A promise that resolves to the hashed password as a hex string.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const passwordBuffer = new TextEncoder().encode(password);
  const saltBuffer = hex2ab(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_LENGTH * 8, // Desired length in bits
  );

  return ab2hex(derivedBits);
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
   *   1. A new `salt` is generated (e.g., a cryptographically secure random string).
   *   2. The `password` is combined with the `salt` and hashed using a strong, one-way
   *      cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
   *   3. A new `User` is created.
   *   4. The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
   *   5. Returns the new `User` identifier.
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
   *   6. The `salt` associated with the User identified by `username` is retrieved from the state.
   *   7. The provided `password` is combined with the retrieved `salt` and hashed using the same
   *      cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
   *   8. If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns
   *      the `User` identifier.
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
   *   9. The given `user` exists in the state.
   *   10. The `oldPassword`, when combined with the `user`'s stored `salt` and hashed,
   *       matches the `user`'s stored `hashedPassword`.
   *
   * **effects**
   *   11. A *new* `salt` is generated for the `user`.
   *   12. The `newPassword` is combined with the new `salt` and hashed,
   *       resulting in an updated `hashedPassword`.
   *   13. The `user`'s `hashedPassword` and `salt` are updated in the state.
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
   *   14. The given `user` exists in the state.
   *   15. The `password`, when combined with the `user`'s stored `salt` and hashed,
   *       matches the `user`'s stored `hashedPassword`.
   *   16. No other `User` exists with the `newUsername`.
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

# prompt: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.  
Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.  
Types of property 'buffer' are incompatible.  
Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.  
Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength on salt: saltBuffer, Async function 'generateSalt' has no 'await' expression or 'await using' declaration.  
Remove 'async' keyword from the function or use 'await' expression or 'await using' declaration inside.

# response:

Here is the updated `UserAuthentication` concept specification and its TypeScript implementation, with the type errors and async function warning addressed.

The primary issue with `ArrayBufferLike` vs `ArrayBuffer` typically arises from subtle differences in environment type definitions (e.g., Deno's `lib.deno.d.ts` vs. a browser's `lib.dom.d.ts`). By being explicit about converting `Uint8Array` to its underlying `ArrayBuffer` when interacting with Web Crypto APIs like `deriveBits` (specifically for the `salt` parameter, which was highlighted in the error), we can ensure type compatibility. The `generateSalt` function has also been adjusted to remove the unnecessary `async` keyword while still returning a `Promise`.

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
      2. The `password` is combined with the `salt` and hashed using a strong, one-way cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
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

**queries**

  **\_getUserByUsername** (username: String): (user: User)
    **requires** a User exists with the given `username`.
    **effects** returns the `User` identifier associated with the `username`.

  **\_getUsername** (user: User): (username: String)
    **requires** the given `user` exists.
    **effects** returns the `username` of the `user`.

***

# file: src/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

// Generic types of this concept
type User = ID;

/**
 * a set of Users with
 *   a username String (must be unique across all Users)
 *   a hashedPassword String (the salted and hashed password)
 *   a salt String (a unique salt generated for each password)
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
      // Explicitly passing the underlying ArrayBuffer of the Uint8Array for salt
      // to resolve potential ArrayBufferLike type conflicts in some environments.
      salt: saltUint8.buffer,
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
   *   1. A new `salt` is generated (e.g., a cryptographically secure random string).
   *   2. The `password` is combined with the `salt` and hashed using a strong, one-way
   *      cryptographic hash function (PBKDF2 with SHA-256), resulting in a `hashedPassword`.
   *   3. A new `User` is created.
   *   4. The `username`, `hashedPassword`, and `salt` are associated with the new `User`.
   *   5. Returns the new `User` identifier.
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
   *   6. The `salt` associated with the User identified by `username` is retrieved from the state.
   *   7. The provided `password` is combined with the retrieved `salt` and hashed using the same
   *      cryptographic hash function used during registration, resulting in a `candidateHashedPassword`.
   *   8. If `candidateHashedPassword` matches the `hashedPassword` stored for the User, returns
   *      the `User` identifier.
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
   *   9. The given `user` exists in the state.
   *   10. The `oldPassword`, when combined with the `user`'s stored `salt` and hashed,
   *       matches the `user`'s stored `hashedPassword`.
   *
   * **effects**
   *   11. A *new* `salt` is generated for the `user`.
   *   12. The `newPassword` is combined with the new `salt` and hashed,
   *       resulting in an updated `hashedPassword`.
   *   13. The `user`'s `hashedPassword` and `salt` are updated in the state.
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
   *   14. The given `user` exists in the state.
   *   15. The `password`, when combined with the `user`'s stored `salt` and hashed,
   *       matches the `user`'s stored `hashedPassword`.
   *   16. No other `User` exists with the `newUsername`.
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