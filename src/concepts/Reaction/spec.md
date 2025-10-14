# concept Reaction \[Post, User]
purpose allow users to respond to posts with lightweight emoji feedback
principle when a user adds a specific type of emoji reaction to a post, that reaction is recorded and associated with the post and user; subsequently, the user can remove their specific emoji reaction.
state
  a set of Reaction with // Using singular 'Reaction' for the entity type
    id: UUID            // Add an explicit identifier for each reaction entity
    post: Post          // Use the generic Post type parameter
    reactionType: EmojiString // New type or constraint implying emoji
    reactingUser: User  // Use the generic User type parameter

actions
  add(post: Post, reactionType: EmojiString, reactingUser: User) : (reactionId: UUID)
    **requires**
      // 1. reactionType must be a valid emoji
      reactionType IS_VALID_EMOJI
      // 2. User cannot add the exact same emoji reaction to the same post twice
      AND NOT (EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType)
    **effects** create new_reaction with id = UUID(), post = post, reactionType = reactionType, reactingUser = reactingUser
              add new_reaction to Reaction
              returns new_reaction.id

  remove(post: Post, reactionType: EmojiString, reactingUser: User)
    **requires** EXISTS r IN Reaction SUCH THAT r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType
    **effects** delete r from Reaction WHERE r.post == post AND r.reactingUser == reactingUser AND r.reactionType == reactionType

queries
  getReactionsForPost(post: Post) : (reactions: Reaction\[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post

  getReactionsByPostAndUser(post: Post, reactingUser: User) : (reactions: Reaction\[])
    **requires** true
    **effects** returns the set of all Reaction entities where reaction.post == post AND reaction.reactingUser == reactingUser