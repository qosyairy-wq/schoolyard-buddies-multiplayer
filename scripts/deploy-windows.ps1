$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js belum dipasang. Pasang Node.js LTS dahulu."
}

Write-Host "[1/4] Memasang Wrangler..." -ForegroundColor Cyan
npm install

Write-Host "[2/4] Log masuk Cloudflare..." -ForegroundColor Cyan
npx wrangler login

Write-Host "[3/4] Memeriksa JavaScript..." -ForegroundColor Cyan
npm run check

Write-Host "[4/4] Deploy game + multiplayer server..." -ForegroundColor Cyan
npm run deploy

Write-Host "Selesai. Salin URL *.workers.dev yang dipaparkan oleh Wrangler." -ForegroundColor Green
