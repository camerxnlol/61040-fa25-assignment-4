---
timestamp: 'Thu Nov 06 2025 09:48:46 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_094846.7eac982d.md]]'
content_id: 4a90f707f46fb5159c3f70533c793c749d7bbbfefe67524c2dbf123eb6ebcace
---

# prompt: Fix the errors below

No overload matches this call.\
Overload 1 of 2, '(f: (...args: never\[]) => unknown\[], input: { user: symbol; }, output: { rankedSongs: symbol; }): Frames<Frame>', gave the following error.\
Argument of type '({ user }: { user: ID; }) => Promise<{ rankedSongs: RankedSong\[]; } | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => unknown\[]'.\
Type 'Promise<{ rankedSongs: RankedSong\[]; } | { error: string; }>' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.\
Overload 2 of 2, '(f: (...args: never\[]) => Promise\<unknown\[]>, input: { user: symbol; }, output: { rankedSongs: symbol; }): Promise\<Frames<Frame>>', gave the following error.\
Argument of type '({ user }: { user: ID; }) => Promise<{ rankedSongs: RankedSong\[]; } | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => Promise\<unknown\[]>'.\
Type 'Promise<{ rankedSongs: RankedSong\[]; } | { error: string; }>' is not assignable to type 'Promise\<unknown\[]>'.\
Type '{ rankedSongs: RankedSong\[]; } | { error: string; }' is not assignable to type 'unknown\[]'.\
Type '{ rankedSongs: RankedSong\[]; }' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.deno-ts(2769)

from Ranking.\_getRankings in return await frames.query(Ranking.\_getRankings, { user }, { rankedSongs: rankings });

and similar overload errors for these lines

frames = await frames.query(Reaction.\_getReactionsForPost, { post }, { reactions: reaction });

frames = await frames.query(Reaction.\_getReactionsByPostAndUser, { post, reactingUser }, { reactions: reaction });
