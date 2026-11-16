#!/bin/sh
# Publie une fonction serveur Supabase : sh tests/deploy_fn.sh envoyer-gmail
set -e; N="$1"; [ -f .env ] && { set -a; . ./.env; set +a; }
curl -sS -X POST "https://api.supabase.com/v1/projects/bcfcrqmpeyaoovluvhhn/functions/deploy?slug=$N" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -F "metadata={\"entrypoint_path\":\"index.ts\",\"name\":\"$N\",\"verify_jwt\":true};type=application/json" \
  -F "file=@supabase/functions/$N/index.ts;filename=index.ts"
echo
