// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// ... (Action syncs for AddComparison and Remove remain the same)
export const AddComparisonRequest: Sync = ({ request, session, user, songA, songB, preferred }) => ({
  when: actions([Requesting.request, { path: "/Ranking/addComparison", session, songA, songB, preferred }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});
export const AddComparisonResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    [Ranking.addComparison, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
export const RemoveRankedSongRequest: Sync = ({ request, session, user, song }) => ({
  when: actions([Requesting.request, { path: "/Ranking/remove", session, song }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.remove, { user, song }]),
});
export const RemoveRankedSongResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/remove" }, { request }],
    [Ranking.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- QUERIES (Read - Refactored for Flat Response) ---

export const GetRankings: Sync = ({ request, session, user, rankedSongs }) => ({
  when: actions([Requesting.request, { path: "/Ranking/_getRankings", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await Ranking._getRankings({ user: userValue });
    // Unwrapping the 'rankedSongs' array from the result object
    if ("rankedSongs" in result) {
      frame[rankedSongs] = result.rankedSongs;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, rankedSongs }]),
});