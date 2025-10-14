---
timestamp: 'Tue Oct 14 2025 01:05:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_010525.4a248132.md]]'
content_id: 8e2c4f1c80851d458c1cefbed49e35e7f2a377523c5661f43a3672ed48ff4084
---

# file: src/Post/PostConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
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
 *   a postId String (mapped to _id)
 *   a userId (generic type User)
 *   a content String
 *   a timestamp DateTime (mapped to Date)
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
   *             and timestamp, returning the created post's identifier.
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
   *             If no posts are found for the author, an empty array is returned.
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
   *             If no post is found with the given ID, an empty array is returned.
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
