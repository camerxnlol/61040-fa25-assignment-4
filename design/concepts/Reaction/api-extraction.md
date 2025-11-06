
[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

```ts
import { Collection, Db } from "mongodb";

import { Empty, ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Declare collection prefix, using the concept name

const PREFIX = "Reaction" + ".";

  

// Generic types defined by the concept specification

type Post = ID;

type User = ID;

type EmojiString = string; // As per the prompt's "Using only what is above", EmojiString is treated as a plain string.

// No specific emoji validation function is provided in the document.

type UUID = ID; // The concept spec uses UUID for entity identifiers, which maps directly to our 'ID' type.

  

/**

* Interface representing a single Reaction entity as stored in MongoDB.

* Corresponds to:

* "a set of Reaction with

* id: UUID

* post: Post

* reactionType: EmojiString

* reactingUser: User"

*/

interface ReactionDocument {

_id: UUID; // MongoDB's primary key, corresponding to 'id' in the concept spec

post: Post;

reactionType: EmojiString;

reactingUser: User;

}

  

/**

* Concept: Reaction

* Purpose: allow users to respond to posts with lightweight emoji feedback

*

* Implements the Reaction concept for managing emoji-based user reactions to posts.

* It ensures that users can add and remove specific emoji reactions to posts,

* and allows querying these reactions by post or by post and user.

*/

export default class ReactionConcept {

// MongoDB collection for storing Reaction entities

reactions: Collection<ReactionDocument>;

  

constructor(private readonly db: Db) {

this.reactions = this.db.collection(PREFIX + "reactions");

}

  

/**

* add (post: Post, reactionType: EmojiString, reactingUser: User) : (reactionId: UUID)

*

* **requires**

* // 1. reactionType IS_VALID_EMOJI (As per the prompt, this is treated as string validity; no specific validation logic is applied here.)

* // 2. User cannot add the exact same emoji reaction to the same post twice

* AND NOT (EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType)

*

* **effects** create new_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser

* add new_reaction to Reaction

* returns new_reaction.id as 'reactionId'

*/

async add({

post,

reactionType,

reactingUser,

}: {

post: Post;

reactionType: EmojiString;

reactingUser: User;

}): Promise<{ reactionId: UUID } | { error: string }> {

// Requirement 1: reactionType IS_VALID_EMOJI.

// Without specific rules provided in the context, we treat any string as a valid EmojiString.

// In a production system, this would involve a specific validation mechanism (e.g., regex, lookup table).

  

// Requirement 2: Check for existing identical reaction to prevent double-voting/duplicate reactions.

const existingReaction = await this.reactions.findOne({

post,

reactingUser,

reactionType,

});

  

if (existingReaction) {

return {

error: "User has already added this exact emoji reaction to this post.",

};

}

  

// Generate a fresh unique ID for the new reaction entity

const newReactionId = freshID();

const newReaction: ReactionDocument = {

_id: newReactionId,

post,

reactionType,

reactingUser,

};

  

// Insert the new reaction document into the collection

await this.reactions.insertOne(newReaction);

  

// Return the ID of the newly created reaction

return { reactionId: newReactionId };

}

  

/**

* remove (post: Post, reactionType: EmojiString, reactingUser: User) : Empty

*

* **requires** EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

*

* **effects** delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

*/

async remove({

post,

reactionType,

reactingUser,

}: {

post: Post;

reactionType: EmojiString;

reactingUser: User;

}): Promise<Empty | { error: string }> {

// Requirement: Ensure the specific reaction exists before attempting to remove it.

const filter = {

post,

reactingUser,

reactionType,

};

const reactionToDelete = await this.reactions.findOne(filter);

  

if (!reactionToDelete) {

return { error: "No matching reaction found to remove." };

}

  

// Delete the identified reaction

await this.reactions.deleteOne(filter);

  

// Return an empty dictionary to signify successful completion

return {};

}

  

/**

* _getReactionsForPost (post: Post) : (reactions: Reaction[])

*

* **requires** true

*

* **effects** returns the set of all Reaction entities where reaction.post == post

*/

async _getReactionsForPost({

post,

}: {

post: Post;

}): Promise<Array<{ reactions: ReactionDocument }> | { error: string }> {

// Retrieve all reactions associated with the given post

const reactions = await this.reactions.find({ post }).toArray();

  

// Queries must return an array of dictionaries, where each dictionary

// contains an output parameter as specified. In this case, 'reactions'

// is the output parameter name, and its value is a ReactionDocument.

return reactions.map((r) => ({ reactions: r }));

}

  

/**

* _getReactionsByPostAndUser (post: Post, reactingUser: User) : (reactions: Reaction[])

*

* **requires** true

*

* **effects** returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser

*/

async _getReactionsByPostAndUser({

post,

reactingUser,

}: {

post: Post;

reactingUser: User;

}): Promise<Array<{ reactions: ReactionDocument }> | { error: string }> {

// Retrieve all reactions for a specific post by a specific user

const reactions = await this.reactions

.find({ post, reactingUser })

.toArray();

  

// Format the results as an array of dictionaries, each containing a 'reactions' key

// with a ReactionDocument as its value.

return reactions.map((r) => ({ reactions: r }));

}

}
```


# prompt: Now, analyze the following Concept Implementation for Reaction and generate the API documentation based on these instructions.
# response:

# API Specification: Reaction Concept

**Purpose:** allow users to respond to posts with lightweight emoji feedback

---

## API Endpoints

### POST /api/Reaction/add

**Description:** Adds an emoji reaction from a user to a post.

**Requirements:**
- The user has not already added the exact same emoji reaction to the same post.

**Effects:**
- A new reaction entity is created with a unique ID, associated with the given post, user, and emoji type.
- Returns the unique ID of the newly created reaction.

**Request Body:**
```json
{
  "post": "ID",
  "reactionType": "string",
  "reactingUser": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "reactionId": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/remove

**Description:** Removes a specific emoji reaction that a user previously added to a post.

**Requirements:**
- A reaction from the specified user with the specified emoji must exist on the post.

**Effects:**
- The matching reaction is deleted.

**Request Body:**
```json
{
  "post": "ID",
  "reactionType": "string",
  "reactingUser": "ID"
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
### POST /api/Reaction/_getReactionsForPost

**Description:** Retrieves all reactions for a specific post.

**Requirements:**
- None. This query can always be performed.

**Effects:**
- Returns the set of all reaction entities associated with the specified post.

**Request Body:**
```json
{
  "post": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "reactions": {
      "_id": "ID",
      "post": "ID",
      "reactionType": "string",
      "reactingUser": "ID"
    }
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
### POST /api/Reaction/_getReactionsByPostAndUser

**Description:** Retrieves all reactions made by a specific user on a specific post.

**Requirements:**
- None. This query can always be performed.

**Effects:**
- Returns the set of all reaction entities associated with the specified post and user.

**Request Body:**
```json
{
  "post": "ID",
  "reactingUser": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "reactions": {
      "_id": "ID",
      "post": "ID",
      "reactionType": "string",
      "reactingUser": "ID"
    }
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