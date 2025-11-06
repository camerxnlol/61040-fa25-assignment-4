// file: src/syncs/songRecommender.sync.ts

import { SongRecommender, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// ... (Action syncs remain the same)
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
export const SongRecommenderActionResponse: Sync = ({ request, recommendations, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }],
    [SongRecommender.addSongToCatalog, {}, { error }],
    [SongRecommender.generateRecommendation, {}, { recommendations, error }],
    [SongRecommender.removeSongsFromCatalog, {}, { error }],
    [SongRecommender.removeSongsFromPastRecommendations, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, recommendations, error }]),
});


// --- QUERIES (Read - Refactored for Flat Response) ---

export const GetPastRecommendations: Sync = ({ request, session, user, pastRecommendations }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getPastRecommendations", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await SongRecommender.getPastRecommendations({ userId: userValue });
    if ("pastRecommendations" in result) {
      frame[pastRecommendations] = result.pastRecommendations;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, pastRecommendations }]),
});

export const GetNotYetRecommended: Sync = ({ request, session, user, notYetRecommendedSongs }) => ({
  when: actions([Requesting.request, { path: "/SongRecommender/getNotYetRecommended", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;
    const frame = frames[0];
    const userValue = frame[user] as ID;
    const result = await SongRecommender.getNotYetRecommended({ userId: userValue });
    if ("notYetRecommendedSongs" in result) {
      frame[notYetRecommendedSongs] = result.notYetRecommendedSongs;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, notYetRecommendedSongs }]),
});