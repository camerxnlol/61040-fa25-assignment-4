[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md) 
 
 **concept** Post  
    **purpose** create a visible record of each ranking action  
    **principle** whenever a user ranks a song, a post is generated summarizing the action (e.g. rank, rerank, deletion).  
    **state**  
      a set of `Posts` with  
        a `postId` String  
        a `songId` String  
        a `actionDescription` String  
        a `timestamp` DateTime  
    **actions**  
      `create(songId: String, actionDescription: String, timestamp: DateTime)`  
        **effect** adds a post recording the ranking action  
      `delete(post: Post)`  
        **requires** post to exist  
        **effect** removes the post  
      `view(userId: String) : (posts: Posts[])`  
        **effect** returns posts for the given user

# prompt: You are a skeptical senior software engineer and concept master. Review the current implementation of the concept and provide recommendations for improvement. Focus only on the state and actions and how they can be improved.