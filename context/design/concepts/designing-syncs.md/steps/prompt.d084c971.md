---
timestamp: 'Thu Nov 06 2025 22:43:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251106_224339.dd2a8e9a.md]]'
content_id: d084c9719acfc51f162de6d160e47f5f2b7a695864945bd0c9c170beee55df19
---

# prompt: I get this error: \[Requesting] Received request for path: /SongRecommender/getPastRecommendations

Requesting.request {
userId: '019a1ebc-7b74-78f4-b912-b8ae3248aafe',
session: '019a5b2e-8b1f-7a57-afc3-203809371374',
path: '/SongRecommender/getPastRecommendations'
} => { request: '019a5c68-0218-7920-91cc-d2762178c590' }

SongRecommender.getPastRecommendations { userId: '019a1ebc-7b74-78f4-b912-b8ae3248aafe' } => \[
'5abc721a-8214-4687-9ab8-0c3391cb1ecb',
'3faedd5b-5e62-402f-96c9-b85851805eb2',
'93036a0a-0513-4d27-b384-4a5d9b674a37',
'15103e23-89b3-42f2-9ee3-6c369c9b6980',
'bf618c42-e039-4d10-889f-49cd37f1c29e',
'a8cdd251-3139-4af5-ad05-aee04cf7a8c7',
'06a86ec3-636d-4f9f-9c5e-43a7448fdc41'
]

\[Requesting] Error processing request: Missing binding: Symbol(pastRecommendations) in frame: \[object Object]
