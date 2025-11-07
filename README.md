<!-- High-level docs -->

# Meli
Docs for Assignment 4c:

[Final Design Document](final_design_doc.md) · [Project Reflection](reflection.md) · [Updates Since Assignment 4 (for assignment 4b)](4b-updates.md)

## Testing the app (IMPORTANT)
To test the app please login with username: `testuer` and pasword: `testuser`. This account has recommendations, friends, posts, and reactions setup for it. To test logging in and registering, feel free to make a new account. To use/test the deployed app, visit [https://meli-0pbd.onrender.com/](https://meli-0pbd.onrender.com/)

## Overview

Meli is a music recommendation and ranking platform that helps people grow their taste and form clear opinions about the songs they listen to. The system is built with concept design: independent, reusable modules called concepts, composed by simple synchronizations that define how they interact.

- Concepts: defined by clear purposes like authenticating a user or generating song recommendations. See the overview in `design/background/concept-design-overview.md`.
- Synchronizations: declarative rules that connect concepts. See `design/background/implementing-synchronizations.md`.
- Architecture details: `design/background/architecture.md`

The repository is divided between:
- `src/`: TypeScript source and configuration
- `design/`: design documents used as documentation and prompts
- `context/`: immutable history mirroring the repository for reproducibility

### API overview
Endpoints are created by synchronizations against the Requesting concept. All endpoints are organized by concept and exposed under a concept-specific prefix:

- `/SongRecommender/*`
- `/UserAuthentication/*`
- `/Post/*`
- `/Ranking/*`
- `/Reaction/*`
- `/Friends/*`

See `src/concepts/Requesting/README.md` to understand how requests and responses flow through the system.

### Concepts
Below are quick links to each concept’s spec, implementation, and tests.

| Concept | Spec | Implementation | Tests | Test Output | Design Changes (from assignment 4) |
| --- | --- | --- | --- | --- | --- |
| SongRecommender | [Spec](src/concepts/SongRecommender/spec.md) | [Implementation](src/concepts/SongRecommender/SongRecommenderConcept.ts) | [Tests](src/concepts/SongRecommender/SongRecommenderConcept.test.ts) | [Output](src/concepts/SongRecommender/test_output.md) | [Changes](src/concepts/SongRecommender/design_changes.md) |
| UserAuthentication | [Spec](src/concepts/UserAuthentication/spec.md) | [Implementation](src/concepts/UserAuthentication/UserAuthenticationConcept.ts) | [Tests](src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts) | [Output](src/concepts/UserAuthentication/test_output.md) | [Changes](src/concepts/UserAuthentication/design_changes.md) |
| Post | [Spec](src/concepts/Post/spec.md) | [Implementation](src/concepts/Post/PostConcept.ts) | [Tests](src/concepts/Post/PostConcept.test.ts) | [Output](src/concepts/Post/test_output.md) | [Changes](src/concepts/Post/design_changes.md) |
| Ranking | [Spec](src/concepts/Ranking/spec.md) | [Implementation](src/concepts/Ranking/RankingConcept.ts) | [Tests](src/concepts/Ranking/RankingConcept.test.ts) | [Output](src/concepts/Ranking/test_output.md) | [Changes](src/concepts/Ranking/design_changes.md) |
| Reaction | [Spec](src/concepts/Reaction/spec.md) | [Implementation](src/concepts/Reaction/ReactionConcept.ts) | [Tests](src/concepts/Reaction/ReactionConcept.test.ts) | [Output](src/concepts/Reaction/test_output.md) | [Changes](src/concepts/Reaction/design_changes.md) |
| Friends | [Spec](src/concepts/Friends/spec.md) | [Implementation](src/concepts/Friends/FriendsConcept.ts) | [Tests](src/concepts/Friends/FreindsConcept.test.ts) | N/A | N/A |

### Exploring the code
- Understanding concepts: `design/background/concept-design-overview.md`
- Understanding synchronizations: `design/background/implementing-synchronizations.md`
- Entrypoint for requests: `src/concepts/Requesting/README.md`
- Overall architecture: `design/background/architecture.md`

## Interesting moments and overall design changes (from assignment 4)
[summary](summary.md)