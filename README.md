# 6.104 Assignment 4: Implementing Concepts

## Updates Since Assignment 4
1. Friends concept added. When finishing my app for the check in, I doubled back on my decision of not having a friends concept. When I think about how this app will be used, I want some sort of friends concepts where friends in real life can become friends on the app and discuss their rankings with each other. This is just not possible through just a feed, where it would often be polluted with random rankings from other people. With a friends concept, the users gain the power to limit who sees their posts and gain easy access to what their friends post.
2. Endpoints for adding and deleting from the SongRecommender concept have been turned into lists. I found that I wanted to add a bunch of songs to a user's catalog at once, and with the old spec I had to make a POST request for each individual song. By making the endpoint accept a list of songs, this makes it easier for the maintainer to keep up requests. Additionally, when I tried to generate more than one recommendation, I would have needed to parse and split the output. Now that it's a list, I can simply iterate over it to see what songs have been recommended.

## Concept 1: SongRecommender
[Concept Spec](src/concepts/SongRecommender/spec.md)
[Implementation](src/concepts/SongRecommender/SongRecommenderConcept.ts)
[Testing](src/concepts/SongRecommender/SongRecommenderConcept.test.ts)
[Test Output](src/concepts/SongRecommender/test_output.md)
[Design Changes](src/concepts/SongRecommender/design_changes.md)
## Concept 2: UserAuthentication
[Concept Spec](src/concepts/UserAuthentication/spec.md)
[Implementation](src/concepts/UserAuthentication/UserAuthenticationConcept.ts)
[Testing](src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts)
[Test Output](src/concepts/UserAuthentication/test_output.md)
[Design Changes](src/concepts/UserAuthentication/design_changes.md)
## Concept 3: Post
[Concept Spec](src/concepts/Post/spec.md)
[Implementation](src/concepts/Post/PostConcept.ts)
[Testing](src/concepts/Post/PostConcept.test.ts)
[Test Output](src/concepts/Post/test_output.md)
[Design Changes](src/concepts/Post/design_changes.md)
## Concept 4: Ranking
[Concept Spec](src/concepts/Ranking/spec.md)
[Implementation](src/concepts/Ranking/RankingConcept.ts)
[Testing](src/concepts/Ranking/RankingConcept.test.ts)
[Test Output](src/concepts/Ranking/test_output.md)
[Design Changes](src/concepts/Ranking/design_changes.md)
## Concept 5: Reaction
[Concept Spec](src/concepts/Reaction/spec.md)
[Implementation](src/concepts/Reaction/ReactionConcept.ts)
[Testing](src/concepts/Reaction/ReactionConcept.test.ts)
[Test Output](src/concepts/Reaction/test_output.md)
[Design Changes](src/concepts/Reaction/design_changes.md)
## Concept 6: Friends
[Concept Spec](src/concepts/Friends/spec.md)
[Implementation](src/concepts/Friends/FriendsConcept.ts)
[Testing](src/concepts/Friends/FreindsConcept.test.ts)


## Interesting Moments + Overall Design Changes
[summary](summary.md)