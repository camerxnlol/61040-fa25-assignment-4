---
timestamp: 'Tue Oct 28 2025 01:49:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014924.b22c09f9.md]]'
content_id: c5561a4f1b8b4dc20e94e35b9f02ff4a044486bc141318ad0595873d86a46e92
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/",
        "@std/assert": "jsr:@std/assert@^1.0.0",
        "@hono/hono": "jsr:@hono/hono@^4.0.0",
        "@std/fs": "jsr:@std/fs@^1.0.0",
        "@std/cli": "jsr:@std/cli@^1.0.0",
        "@std/path": "jsr:@std/path@^1.0.0"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```
