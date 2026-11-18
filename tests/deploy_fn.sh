#!/bin/sh
# Publie une fonction serveur Supabase : sh tests/deploy_fn.sh envoyer-gmail
# notifier et sauvegarde sont appelées par les tâches planifiées sans jeton de connexion : verify_jwt=false (elles vérifient elles-mêmes la clé x-cle-cron ou la connexion)
set -e; N="$1"; case "$N" in notifier|sauvegarde|locataire|agenda|boite) V=false;; *) V=true;; esac; [ -f .env ] && { set -a; . ./.env; set +a; }
curl -sS -X POST "https://api.supabase.com/v1/projects/bcfcrqmpeyaoovluvhhn/functions/deploy?slug=$N" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -F "metadata={\"entrypoint_path\":\"index.ts\",\"name\":\"$N\",\"verify_jwt\":$V};type=application/json" \
  -F "file=@supabase/functions/$N/index.ts;filename=index.ts"
echo
