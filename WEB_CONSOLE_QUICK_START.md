# Schoolyard Buddies Multiplayer — Web Console Setup

This package is prepared for GitHub/GitLab import through the Cloudflare Workers dashboard.

Important repository layout: package.json, wrangler.jsonc, src/ and public/ must be at the repository root.

Cloudflare settings:
- Worker name: schoolyard-buddies-multiplayer-test
- Production branch: main
- Root directory: /
- Build command: leave blank
- Deploy command: npx wrangler deploy

Tests after deployment:
- /health
- /multiplayer-test.html in two browser tabs
- / for the full game
