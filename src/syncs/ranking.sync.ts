// file: src/syncs/ranking.sync.ts

import { Ranking, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// --- ACTIONS (Create, Update, Delete) ---

// This sync handles the case where TWO songs are being compared.
export const AddComparisonRequestWithTwoSongs: Sync = ({ request, session, user, songA, songB, preferred }) => ({
  when: actions([
    Requesting.request,
    { path: "/Ranking/addComparison", session, songA, songB, preferred },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, songB, preferred }]),
});

// This sync handles the case where only ONE song is being added.
export const AddComparisonRequestWithOneSong: Sync = ({ request, session, user, songA, preferred }) => ({
  when: actions([
    Requesting.request,
    { path: "/Ranking/addComparison", session, songA, preferred },
    { request },
  ]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.addComparison, { user, songA, preferred }]),
});


// --- RESPONSE SYNCS (Corrected) ---

// NEW: This sync handles the SUCCESS case for addComparison.
export const AddComparisonSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    // This pattern matches the empty object `{}` returned on success.
    [Ranking.addComparison, {}, {}],
  ),
  // Respond with an empty object to the client, indicating success.
  then: actions([Requesting.respond, { request }]),
});

// This sync now ONLY handles the ERROR case for addComparison.
export const AddComparisonErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/addComparison" }, { request }],
    // This pattern matches an object with an 'error' key.
    [Ranking.addComparison, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Remove Action (Unchanged) ---
export const RemoveRankedSongRequest: Sync = ({ request, session, user, song }) => ({
  when: actions([Requesting.request, { path: "/Ranking/remove", session, song }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Ranking.remove, { user, song }]),
});

// Note: You should apply the same success/error split to this response sync as well for robustness.
export const RemoveRankedSongResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Ranking/remove" }, { request }],
    [Ranking.remove, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- QUERIES (Read - Public Access) ---
export const GetRankingsByAuthor: Sync = ({ request, authorId, rankedSongs }) => ({
  when: actions([Requesting.request, { path: "/Ranking/_getRankingsByAuthor", authorId }, { request }]),
  where: async (frames) => {
    const frame = frames[0];
    const authorIdValue = frame[authorId] as ID;
    const result = await Ranking._getRankingsByAuthor({ authorId: authorIdValue });
    
    if ("rankedSongs" in result) {
      frame[rankedSongs] = result.rankedSongs;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, rankedSongs }]),
});