---
timestamp: 'Wed Nov 05 2025 15:49:57 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251105_154957.8865892f.md]]'
content_id: 219dc98d564db0bcd62921e512de1adfe971640ef8589da875fd6a1e66f9dc84
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

  

// Declare collection prefix, use concept name

const PREFIX = "Post" + ".";

  

/**

* Generic type for the User, as specified in `concept Post [User]`.

* This allows the concept to refer to user identities polymorphically.

*/

type User = ID;

  

/**

* Type for the unique identifier of a Post, as specified by `postId String` in the state.

*/

type PostID = ID;

  

/**

* Interface representing the structure of a Post document stored in MongoDB.

* Corresponds to:

* a set of Posts with

* a postId String (mapped to _id)

* a userId (generic type User)

* a content String

* a timestamp DateTime (mapped to Date)

*/

interface PostDocument {

_id: PostID; // Maps to `postId String`

userId: User;

content: string;

timestamp: Date; // Maps to `timestamp DateTime`

}

  

/**

* Post Concept

*

* purpose: create a visible and retrievable record about a target, attributed to a user.

* principle: Whenever an author wishes to record information about a target, a post can be created. This post can then be viewed by others, and subsequently deleted by the user.

*/

export default class PostConcept {

posts: Collection<PostDocument>;

  

constructor(private readonly db: Db) {

this.posts = this.db.collection(PREFIX + "posts");

}

  

/**

* create (userId, content: String, timestamp: DateTime): (post: Post)

*

* **requires** Implicitly true; no specific preconditions are mentioned in the concept definition

*

* **effects** Adds a new post with a unique postId, associating the provided userId, content,

* and timestamp, returning the created post's identifier.

*/

async create(

{ userId, content, timestamp }: {

userId: User;

content: string;

timestamp: Date;

},

): Promise<{ post: PostID }> {

const newPostId: PostID = freshID();

const newPost: PostDocument = {

_id: newPostId,

userId,

content,

timestamp,

};

await this.posts.insertOne(newPost);

return { post: newPostId };

}

  

/**

* delete (post: Post)

*

* **requires** The post with the given `post` ID must exist.

*

* **effects** Removes the specified post from the system.

*/

async delete({ post: postId }: { post: PostID }): Promise<Empty | { error: string }> {

const existingPost = await this.posts.findOne({ _id: postId });

if (!existingPost) {

return { error: `Post with ID ${postId} not found.` };

}

await this.posts.deleteOne({ _id: postId });

return {};

}

  

/**

* _getPostsByAuthor (authorId: User) : (posts: PostDocument[])

*

* **requires** The `authorId` is a valid identifier.

*

* **effects** Returns an array of all posts authored by the given `authorId`.

* If no posts are found for the author, an empty array is returned.

*/

async _getPostsByAuthor(

{ authorId }: { authorId: User },

): Promise<{ post: PostDocument }[]> {

const posts = await this.posts.find({ userId: authorId }).toArray();

// Queries must return an array of dictionaries.

return posts.map((p) => ({ post: p }));

}

  

// NOTE: The concept specification included a query `getPostsByTarget (targetId: Target) : (posts: Posts[])`.

// However, the `Post` concept's defined state (`a set of Posts with a postId String, a userId, a content String, a timestamp DateTime`)

// does not include a `targetId` field. Furthermore, the `create` action does not accept a `targetId`.

// Therefore, this query cannot be implemented based on the provided concept definition without modifying its state.

  

/**

* _getPostById (postId: String) : (post: Post)

*

* **requires** The `postId` is a valid identifier.

*

* **effects** Returns the post with the matching `postId`.

* If no post is found with the given ID, an empty array is returned.

*/

async _getPostById(

{ postId }: { postId: PostID },

): Promise<{ post: PostDocument }[]> {

const post = await this.posts.findOne({ _id: postId });

// Queries must return an array of dictionaries.

return post ? [{ post: post }] : [];

}

}
```
