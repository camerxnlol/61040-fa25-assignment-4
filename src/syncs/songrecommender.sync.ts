// file: src/syncs/songRecommender.sync.ts (FIXED)

import { SongRecommender, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// --- ACTION REQUESTS (These are correct and remain unchanged) ---
export const AddSongToCatalogRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/addSongToCatalog", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.addSongToCatalog, { userId: user, songs }]),
});

export const GenerateRecommendationRequest: Sync = ({ request, session, user, count }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/generateRecommendation", session, count }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.generateRecommendation, { userId: user, count }]),
});

export const RemoveSongsFromCatalogRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/removeSongsFromCatalog", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.removeSongsFromCatalog, { userId: user, songs }]),
});

export const RemoveSongsFromPastRecommendationsRequest: Sync = ({ request, session, user, songs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/removeSongsFromPastRecommendations", session, songs }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.removeSongsFromPastRecommendations, { userId: user, songs }]),
});

// --- ACTION RESPONSES (REPLACED AND FIXED) ---

// -- Add Song To Catalog
export const AddSongToCatalogSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/addSongToCatalog" }, { request }],
    [SongRecommender.addSongToCatalog, {}, {}], // Match success (empty object)
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
export const AddSongToCatalogErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/addSongToCatalog" }, { request }],
    [SongRecommender.addSongToCatalog, {}, { error }], // Match error
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// -- Generate Recommendation
export const GenerateRecommendationSuccessResponse: Sync = ({ request, recommendations }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/generateRecommendation" }, { request }],
    [SongRecommender.generateRecommendation, {}, { recommendations }], // Match success { recommendations: [...] }
  ),
  then: actions([Requesting.respond, { request, recommendations }]),
});
export const GenerateRecommendationErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/generateRecommendation" }, { request }],
    [SongRecommender.generateRecommendation, {}, { error }], // Match error
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// -- Remove Songs From Catalog
export const RemoveSongsFromCatalogSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromCatalog" }, { request }],
    [SongRecommender.removeSongsFromCatalog, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
export const RemoveSongsFromCatalogErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromCatalog" }, { request }],
    [SongRecommender.removeSongsFromCatalog, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// -- Remove Songs From Past Recommendations
export const RemoveSongsFromPastRecommendationsSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromPastRecommendations" }, { request }],
    [SongRecommender.removeSongsFromPastRecommendations, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
export const RemoveSongsFromPastRecommendationsErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/removeSongsFromPastRecommendations" }, { request }],
    [SongRecommender.removeSongsFromPastRecommendations, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- GETTER REQUESTS & RESPONSES ---

// -- Get Past Recommendations
export const GetPastRecommendationsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getPastRecommendations", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.getPastRecommendations, { userId: user }]),
});
export const GetPastRecommendationsSuccessResponse: Sync = ({ request, pastRecommendations }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getPastRecommendations" }, { request }],
    [SongRecommender.getPastRecommendations, {}, { pastRecommendations }],
  ),
  then: actions([Requesting.respond, { request, pastRecommendations }]),
});
export const GetPastRecommendationsErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getPastRecommendations" }, { request }],
    [SongRecommender.getPastRecommendations, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// -- Get Not Yet Recommended
export const GetNotYetRecommendedRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getNotYetRecommended", session }, { request }]),
  where: async (frames) => await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SongRecommender.getNotYetRecommended, { userId: user }]),
});
export const GetNotYetRecommendedSuccessResponse: Sync = ({ request, notYetRecommendedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getNotYetRecommended" }, { request }],
    [SongRecommender.getNotYetRecommended, {}, { notYetRecommendedSongs }],
  ),
  then: actions([Requesting.respond, { request, notYetRecommendedSongs }]),
});
export const GetNotYetRecommendedErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongRecommender/getNotYetRecommended" }, { request }],
    [SongRecommender.getNotYetRecommended, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});