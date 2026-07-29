# Schoolyard Buddies — Cloudflare Multiplayer Test

Stage 7.0.0 adds real-time multiplayer using Cloudflare Workers, Durable Objects and WebSockets.

## Included

- `public/index.html` — patched Schoolyard Buddies game.
- `src/index.js` — Worker + Durable Object multiplayer room server.
- `wrangler.jsonc` — Cloudflare configuration.
- `scripts/` — Windows and Linux/Zorin helper scripts.
- `docs/SETUP_CLOUDFLARE_MS.md` — full Malay deployment guide.

## Quick start

```bash
npm install
npx wrangler login
npm run deploy
```

After deployment, open the printed `https://...workers.dev` URL on two browsers or devices, choose the same room, and press Connect.
