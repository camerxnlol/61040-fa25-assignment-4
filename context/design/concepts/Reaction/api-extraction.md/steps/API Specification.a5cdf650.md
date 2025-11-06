---
timestamp: 'Wed Nov 05 2025 15:51:04 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_155104.3c31c2ad.md]]'
content_id: a5cdf6504b5f7c618eb20aa640e94b0ad94956ab217bbd0efcb2974145631937
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
