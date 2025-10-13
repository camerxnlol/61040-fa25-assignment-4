# Design Changes for SongRecommender

With the help of ctx, I was able to improve upon SongRecommender. Changes include:

1) Adding the User and Song generic parameters as input to the concept. I realized that Without a Users parameter, all users on the platform would be sharing the same pool of recommendations, which is not what we want. We also want to pass in a Song parameter because we reference it in the spec
2) I renames some actions for a better name to functionality relationship.

Everything went pretty smoothly when implementing this concepts and its tests. The only significant iteration I had to do was telling ctx to include more descriptive test logs and use emojis to communicate expected/unexpected behavior