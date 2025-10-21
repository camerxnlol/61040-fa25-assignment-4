---
timestamp: 'Sun Oct 19 2025 22:30:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_223047.d0a05b2f.md]]'
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
