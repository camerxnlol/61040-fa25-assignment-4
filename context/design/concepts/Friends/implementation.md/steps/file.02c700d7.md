---
timestamp: 'Tue Oct 28 2025 01:43:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014321.2b8d43f2.md]]'
content_id: 02c700d72c556c3632f305c8296cb5f25361ac73d2ade3ea0424022e10229cbb
---

# file: src/concepts/FriendsConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// assert and isNot are not used in the provided code, can be removed if not needed elsewhere.
// import { assert, isNot } from "@std/assert"; 

// Declare collection prefix, use concept name
const PREFIX = "Friends" + ".";

// Generic types of this concept
type User = ID; // Represents a generic user identifier

/**
 * a set of Friendships with
 *    userA: User  // User with the lexicographically smaller identifier
 *    userB: User  // User with the lexicographically larger identifier
 */
interface FriendshipDoc {
  _id: ID; // Unique ID for the friendship document
  userA: User; // User with the lexicographically smaller identifier
  userB: User; // User with the lexicographically larger identifier
}

/**
 * a set of FriendRequests with
 *    sender: User
 *    recipient: User
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
 *            then both users will be mutually connected as friends.
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
   *   `sender` is not equal to `recipient`
   *   There is no existing `Friendship` between `sender` and `recipient`
   *   There is no existing `FriendRequest` from `sender` to `recipient`
   *   There is no existing `FriendRequest` from `recipient` to `sender` (i.e., no pending request in either direction)
   *
   * **effects**
   *   A new `FriendRequest` is created from `sender` to `recipient`.
   *   Returns `success: true` if successful, or `error: String` if any precondition is not met.
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
   *   There is an existing `FriendRequest` from `sender` to `recipient`
   *
   * **effects**
   *   The `FriendRequest` from `sender` to `recipient` is removed.
   *   A new `Friendship` is created between `sender` and `recipient`. (The concept ensures `userA` and `userB` are stored in canonical order).
   *   Returns `success: true` if successful, or `error: String` if the precondition is not met.
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
   *   There is an existing `FriendRequest` from `sender` to `recipient`
   *
   * **effects**
   *   The `FriendRequest` from `sender` to `recipient` is removed.
   *   Returns `success: true` if successful, or `error: String` if the precondition is not met.
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
   *   There is an existing `Friendship` between `user1` and `user2`
   *
   * **effects**
   *   The `Friendship` between `user1` and `user2` is removed.
   *   Returns `success: true` if successful, or `error: String` if the precondition is not met.
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
   *             otherwise, returns `false`.
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
