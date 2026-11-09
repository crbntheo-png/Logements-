#!/bin/sh
# Construit et publie l'appli sur Cloudflare Pages (jeton et compte lus dans .env)
set -e
cd "$(dirname "$0")"
python3 build.py
set -a; . ./.env; set +a
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_TOKEN" npx --yes wrangler@3.114.0 pages deploy dist --project-name=gestion-locative-sci --branch=main --commit-dirty=true
