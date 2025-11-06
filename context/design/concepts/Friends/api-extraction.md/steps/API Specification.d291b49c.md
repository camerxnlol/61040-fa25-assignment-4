---
timestamp: 'Wed Nov 05 2025 15:45:45 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_154545.5c5f917f.md]]'
content_id: d291b49c3441cb9dae12b7e2b05fc110206d8ab39899b9ef0be0f19206e1e71c
---

# API Specification: Labeling Concept

**Purpose:** organize items by associating descriptive keywords, allowing for flexible categorization and retrieval.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with the given name and returns its identifier.

**Requirements:**

* No Label with the given `name` already exists.

**Effects:**

* Creates a new Label `l`.
* Sets the name of `l` to `name`.
* Returns `l` as `label`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/addLabel

**Description:** Associates an existing label with a specific item.

**Requirements:**

* The item must exist.
* The label must exist.
* The item is not already associated with this label.

**Effects:**

* Associates the given label with the specified item.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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

### POST /api/Labeling/deleteLabel

**Description:** Removes the association of a label from a specific item.

**Requirements:**

* The item must exist.
* The label must exist.
* The item is currently associated with this label.

**Effects:**

* Removes the association of the given label from the specified item.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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

```ts
import { Collection, Db } from "mongodb";

import { ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

// assert and isNot are not used in the provided code, can be removed if not needed elsewhere.

// import { assert, isNot } from "@std/assert";

  

// Declare collection prefix, use concept name

const PREFIX = "Friends" + ".";

  

// Generic types of this concept

type User = ID; // Represents a generic user identifier

  

/**

* a set of Friendships with

* userA: User // User with the lexicographically smaller identifier

* userB: User // User with the lexicographically larger identifier

*/

interface FriendshipDoc {

_id: ID; // Unique ID for the friendship document

userA: User; // User with the lexicographically smaller identifier

userB: User; // User with the lexicographically larger identifier

}

  

/**

* a set of FriendRequests with

* sender: User

* recipient: User

*/

interface FriendRequestDoc {

_id: ID; // Unique ID for the friend request document

sender: User;

recipient: User;

}

  

/**

* Concept: Friends

*

* purpose: support users in establishing and managing mutual connections with other users

*

* principle: if a user sends a friend request to another user, and the recipient accepts,

* then both users will be mutually connected as friends.

*/

export default class FriendsConcept {

friendships: Collection<FriendshipDoc>;

friendRequests: Collection<FriendRequestDoc>;

  

constructor(private readonly db: Db) {

this.friendships = this.db.collection(PREFIX + "friendships");

this.friendRequests = this.db.collection(PREFIX + "friendRequests");

}

  

/**

* Helper function to get users in a canonical, sorted order.

* This ensures that a friendship between userX and userY is always stored as (min(userX, userY), max(userX, userY)).

*

* @param user1 The first user ID.

* @param user2 The second user ID.

* @returns A tuple [userA, userB] where userA <= userB lexicographically.

*/

private _getCanonicalUsers(user1: User, user2: User): [User, User] {

return user1 < user2 ? [user1, user2] : [user2, user1];

}

  

/**

* sendFriendRequest (sender: User, recipient: User): (success: Boolean) or (error: String)

*

* **requires**

* `sender` is not equal to `recipient`

* There is no existing `Friendship` between `sender` and `recipient`

* There is no existing `FriendRequest` from `sender` to `recipient`

* There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)

*

* **effects**

* A new `FriendRequest` is created from `sender` to `recipient`.

* Returns `success: true` if successful, or `error: String` if any precondition is not met.

*/

async sendFriendRequest(

{ sender, recipient }: { sender: User; recipient: User },

): Promise<{ success: boolean } | { error: string }> { // Changed return type here

if (sender === recipient) {

return { error: "Cannot send friend request to self." };

}

  

// Check for existing friendship

const [userA, userB] = this._getCanonicalUsers(sender, recipient);

const existingFriendship = await this.friendships.findOne({

userA,

userB,

});

if (existingFriendship) {

return { error: "Friendship already exists." };

}

  

// Check for existing request from sender to recipient

const existingSentRequest = await this.friendRequests.findOne({

sender: sender,

recipient: recipient,

});

if (existingSentRequest) {

return { error: "Friend request already sent." };

}

  

// Check for existing request from recipient to sender

const existingReceivedRequest = await this.friendRequests.findOne({

sender: recipient,

recipient: sender,

});

if (existingReceivedRequest) {

return { error: "Friend request already received from recipient." };

}

  

await this.friendRequests.insertOne({

_id: freshID(),

sender,

recipient,

});

  

return { success: true };

}

  

/**

* acceptFriendRequest (recipient: User, sender: User): (success: Boolean) or (error: String)

*

* **requires**

* There is an existing `FriendRequest` from `sender` to `recipient`

*

* **effects**

* The `FriendRequest` from `sender` to `recipient` is removed.

* A new `Friendship` is created between `sender` and `recipient`. (The concept ensures `userA` and `userB` are stored in canonical order).

* Returns `success: true` if successful, or `error: String` if the precondition is not met.

*/

async acceptFriendRequest(

{ recipient, sender }: { recipient: User; sender: User },

): Promise<{ success: boolean } | { error: string }> { // Changed return type here

const existingRequest = await this.friendRequests.findOne({

sender: sender,

recipient: recipient,

});

  

if (!existingRequest) {

return { error: "No pending friend request from sender to recipient." };

}

  

// Remove the friend request

await this.friendRequests.deleteOne({ _id: existingRequest._id });

  

// Create a new friendship (ensuring canonical order)

const [userA, userB] = this._getCanonicalUsers(sender, recipient);

await this.friendships.insertOne({

_id: freshID(),

userA,

userB,

});

  

return { success: true };

}

  

/**

* rejectFriendRequest (recipient: User, sender: User): (success: Boolean) or (error: String)

*

* **requires**

* There is an existing `FriendRequest` from `sender` to `recipient`

*

* **effects**

* The `FriendRequest` from `sender` to `recipient` is removed.

* Returns `success: true` if successful, or `error: String` if the precondition is not met.

*/

async rejectFriendRequest(

{ recipient, sender }: { recipient: User; sender: User },

): Promise<{ success: boolean } | { error: string }> { // Changed return type here

const existingRequest = await this.friendRequests.findOne({

sender: sender,

recipient: recipient,

});

  

if (!existingRequest) {

return { error: "No pending friend request from sender to recipient." };

}

  

// Remove the friend request

await this.friendRequests.deleteOne({ _id: existingRequest._id });

  

return { success: true };

}

  

/**

* removeFriend (user1: User, user2: User): (success: Boolean) or (error: String)

*

* **requires**

* There is an existing `Friendship` between `user1` and `user2`

*

* **effects**

* The `Friendship` between `user1` and `user2` is removed.

* Returns `success: true` if successful, or `error: String` if the precondition is not met.

*/

async removeFriend(

{ user1, user2 }: { user1: User; user2: User },

): Promise<{ success: boolean } | { error: string }> { // Changed return type here

const [userA, userB] = this._getCanonicalUsers(user1, user2);

const result = await this.friendships.deleteOne({ userA, userB });

  

if (result.deletedCount === 0) {

return { error: "No existing friendship between the users." };

}

  

return { success: true };

}

  

/**

* _verifyFriendship (user1: User, user2: User): (isFriend: Boolean)

*

* **requires** true

*

* **effects** returns `true` if there is an existing `Friendship` between `user1` and `user2`;

* otherwise, returns `false`.

* Queries always return an array.

*/

async _verifyFriendship(

{ user1, user2 }: { user1: User; user2: User },

): Promise<[{ isFriend: boolean }]> {

const [userA, userB] = this._getCanonicalUsers(user1, user2);

const existingFriendship = await this.friendships.findOne({

userA,

userB,

});

return [{ isFriend: !!existingFriendship }];

}

  

/**

* _getFriends (user: User): (friends: set of User)

*

* **requires** true

*

* **effects** returns the set of all users with whom `user` has an active `Friendship`.

* Queries always return an array.

*/

async _getFriends(

{ user }: { user: User },

): Promise<[{ friends: User[] }]> {

const friendships = await this.friendships.find({

$or: [{ userA: user }, { userB: user }],

}).toArray();

  

const friends = friendships.map((f) => f.userA === user ? f.userB : f.userA);

  

return [{ friends }];

}

  

/**

* _getSentRequests (user: User): (recipients: set of User)

*

* **requires** true

*

* **effects** returns the set of all users to whom `user` has sent a `FriendRequest`.

* Queries always return an array.

*/

async _getSentRequests(

{ user }: { user: User },

): Promise<[{ recipients: User[] }]> {

const requests = await this.friendRequests.find({ sender: user }).toArray();

const recipients = requests.map((r) => r.recipient);

return [{ recipients }];

}

  

/**

* _getReceivedRequests (user: User): (senders: set of User)

*

* **requires** true

*

* **effects** returns the set of all users who have sent a `FriendRequest` to `user`.

* Queries always return an array.

*/

async _getReceivedRequests(

{ user }: { user: User },

): Promise<[{ senders: User[] }]> {

const requests = await this.friendRequests.find({ recipient: user })

.toArray();

const senders = requests.map((r) => r.sender);

return [{ senders }];

}

}
```
