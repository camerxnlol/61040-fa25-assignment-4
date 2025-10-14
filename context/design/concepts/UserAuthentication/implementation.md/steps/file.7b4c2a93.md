---
timestamp: 'Mon Oct 13 2025 22:10:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_221035.99326613.md]]'
content_id: 7b4c2a931ea8ff0b5e62e458b027c932c2aeeceb959c9051977225bc8f6b2d30
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/",
        "@std/assert": "jsr:@std/assert@^1.0.0"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```
