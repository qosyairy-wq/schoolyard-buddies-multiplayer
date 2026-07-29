#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Node.js belum dipasang."; exit 1; }
npm install
npx wrangler login
npm run check
npm run deploy
