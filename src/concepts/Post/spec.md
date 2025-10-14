concept Post \[User]
purpose create a visible and retrievable record, attributed to a user.
principle Whenever a user wishes to record information about a song or ranking, a post can be created. This post can then be viewed by others, and subsequently deleted by the user.

state
  a set of Posts with
    a postId String
    a userId
    a content String        // Generalized from actionDescription: The textual content of the post
    a timestamp DateTime

actions
  create (userId, content: String, timestamp: DateTime): (post: Post)
    // Note: The timestamp could also be system-generated if preferred, or provided by the caller.
    effects: Adds a new post with a unique postId, associating the provided authorId, content, and timestamp, returning the created post's identifier.

  delete (post: Post)
    requires post exists
    effects Removes the specified post from the system.

queries
  getPostsByAuthor (authorId: Author) : (posts: Posts\[])
    requires authorId exists
    effects Returns a set of all posts authored by the given authorId.

  getPostById (postId: String) : (post: Post)
    requires postId exists
    effects Returns the post with the matching postId.