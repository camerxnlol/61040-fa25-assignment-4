---
timestamp: 'Thu Nov 06 2025 16:51:36 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_165136.eccdb432.md]]'
content_id: 6cf9ffddbd9f4ea86dc1bd4bac617ffb120499354214e8546a8e0f0cc5a8b005
---

# response:

Yes, this one-level deep nesting is the expected and direct result of how the `Requesting` concept and your synchronizations are written.

The extra layer comes from the name of the variable you use in your sync.

In your `GetRankings` sync, the `then` clause is:
`then: actions([Requesting.respond, { request, rankings }])`

This tells the `Requesting` concept to create a JSON response with a key named `rankings`. The value for that key is the *entire object* returned by the `Ranking._getRankings` query, which is `{"rankedSongs": [...]}`.

The result is the nested structure you see: `{ "rankings": { "rankedSongs": [...] } }`.

### How to Avoid the Extra Layer

You have full control over the response shape. To flatten it, you simply need to destructure the result in the `where` clause and respond with the inner value.

**Before (Nested Response):**

```typescript
export const GetRankings: Sync = ({ request, session, user, rankings }) => ({
  where: async (frames) => {
    // ...
    const result = await Ranking._getRankings({ user: userValue });
    // Binds the WHOLE object { rankedSongs: [...] } to the 'rankings' variable
    frame[rankings] = result; 
    return frames;
  },
  then: actions([Requesting.respond, { request, rankings }]),
});
```

**After (Flat Response):**

```typescript
export const GetRankings: Sync = ({ request, session, user, rankedSongs }) => ({ // Note variable name change
  where: async (frames) => {
    // ...
    const result = await Ranking._getRankings({ user: userValue });
    // Binds ONLY the inner array to the 'rankedSongs' variable
    if ("rankedSongs" in result) {
      frame[rankedSongs] = result.rankedSongs;
    }
    return frames;
  },
  // Respond directly with the desired key
  then: actions([Requesting.respond, { request, rankedSongs }]), 
});
```

This modified sync will produce the response `{"rankedSongs": [...]}` you originally expected.
