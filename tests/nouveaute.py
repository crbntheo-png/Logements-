#!/usr/bin/env python3
"""Ajoute une nouveauté au canal "Quoi de neuf" de l'appli, et (avec --annoncer) l'envoie en notification à tous les
utilisateurs qui ne l'ont pas coupée. Usage :
  python3 tests/nouveaute.py ID "🖊️" "Titre court" "Une phrase simple : ce que ça change pour toi." "#lien" [--annoncer]
Exemple : python3 tests/nouveaute.py signature-distance "✍️" "Signature à distance" "Ton locataire signe depuis son téléphone." "#locataires" --annoncer
"""
import sys, json, subprocess, os
a = [x for x in sys.argv[1:] if x != "--annoncer"]
if len(a) < 4: print(__doc__); sys.exit(1)
id_, ico, titre, texte = a[:4]; lien = a[4] if len(a) > 4 else None
q = lambda s: "'" + str(s).replace("'", "''") + "'"
sql = f"insert into public.nouveautes (id, icone, titre, texte, lien) values ({q(id_)}, {q(ico)}, {q(titre)}, {q(texte)}, {q(lien) if lien else 'null'}) on conflict (id) do update set icone = excluded.icone, titre = excluded.titre, texte = excluded.texte, lien = excluded.lien;"
if "--annoncer" in sys.argv:
    sql += f""" select net.http_post(url := 'https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/notifier',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cle-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cle_cron_notifier')),
      body := jsonb_build_object('nouveaute', {q(id_)}), timeout_milliseconds := 60000);"""
print(subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "sql.py"), sql], capture_output=True, text=True).stdout[:500])
