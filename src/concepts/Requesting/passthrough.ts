/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  // "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  // "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  // "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  // "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  // "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  "/api/UserAuthentication/register": "allow anyone to register",
  "/api/UserAuthentication/_getUserByUsername": "allow anyone to get user by username",
  "/api/UserAuthentication/_getUsername": "allow anyone to get username",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  // "/api/LikertSurvey/createSurvey",
  // "/api/LikertSurvey/addQuestion",
  "/api/Reaction/add",
  "/api/Reaction/remove",
  "/api/Reaction/_getReactionsForPost",
  "/api/Reaction/_getReactionsByPostAndUser",
  "/api/Ranking/addComparison",
  "/api/Ranking/remove",
  "/api/Ranking/_getRankingsByAuthor",
  "/api/Post/create",
  "/api/Post/delete",
  "/api/Post/_getPostsByAuthor",
  "/api/Post/_getPostById",
  "/api/SongRecommender/getUserCatalog",
  "/api/SongRecommender/addSongToCatalog",
  "/api/SongRecommender/generateRecommendation",
  "/api/SongRecommender/removeSongsFromCatalog",
  "/api/SongRecommender/removeSongsFromPastRecommendations",
  "/api/SongRecommender/getPastRecommendations",
  "/api/SongRecommender/getNotYetRecommended",
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  "/api/Sessioning/_getUser",
  "/api/Friends/_getCanonicalUsers",
  "/api/Friends/sendFriendRequest",
  "/api/Friends/acceptFriendRequest",
  "/api/Friends/rejectFriendRequest",
  "/api/Friends/removeFriend",
  "/api/Friends/_verifyFriendship",
  "/api/Friends/_getFriends",
  "/api/Friends/_getSentRequests",
  "/api/Friends/_getReceivedRequests",
  "/api/UserAuthentication/delete",
  "/api/UserAuthentication/changePassword",
  "/api/UserAuthentication/changeUsername",
  "/api/UserAuthentication/authenticate",
];
