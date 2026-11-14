# Reprendre le travail sur l'appli « Gestion locative »

> **Avant toute chose : lire aussi `JOURNAL.md`** (ce qui a été fait par les autres sessions et ce qui reste à faire), et le mettre à jour en fin de session.

Ce fichier sert à une nouvelle session Claude Code (ou à un humain) pour comprendre l'appli en 5 minutes et continuer à la faire évoluer.

## En bref

- Appli en ligne : https://gestion-locative-sci.pages.dev (hébergée sur Cloudflare Pages)
- L'ancienne adresse https://gestion-locative-sci.netlify.app redirige vers la nouvelle.
- Tout le code de l'appli est dans **`index.html`** (HTML + CSS + JavaScript, sans framework).
- **`build.py`** fabrique la version installable dans `dist/` (icônes, manifeste, service worker, configuration Supabase).
- **`deploy.sh`** = `build.py` + publication sur Cloudflare Pages.

## Les briques

| Brique | Rôle | Où |
|---|---|---|
| Supabase (projet `bcfcrqmpeyaoovluvhhn`) | Comptes (connexion par code e-mail), données, photos, documents, fonctions serveur | `supabase/*.sql`, `supabase/functions/` |
| Brevo | Envoi des e-mails : codes de connexion, signalements, envois sans Gmail | clé dans le coffre (vault) Supabase |
| Gmail (mot de passe d'application) | Envoi depuis l'adresse de chaque utilisateur | fonction `supabase/functions/envoyer-gmail` |
| Pennylane | Lecture du compte bancaire de l'espace GTP INVEST, toutes les heures | `supabase/banque.sql` (tâche planifiée `banque-synchro`) |
| Cloudflare Pages | Hébergement | `deploy.sh` |

### Données

Une table générique `docs` (espace_id, coll, doc_id, data jsonb), protégée par RLS : chaque **espace** ne voit que ses données.
Collections : `biens`, `baux`, `paiements`, `depenses`, `relances`, `rappels`, `taxes`, `edl`, `fichiers`, `meta`.
Autres tables : `espaces`, `membres`, `invitations`, `banque`, `banque_comptes`, `banque_liens`, `gmail_comptes`, `signalements`, `envois`.
Stockage : buckets privés `photos` (états des lieux) et `documents` (fichiers des biens), rangés par `<espace_id>/…`.

L'espace réel de la SCI : **GTP INVEST**, id `1be09613-be2e-49f7-85ca-583ebecc723c`.

### Règles importantes (voulues par le propriétaire)

- **Aucun e-mail ne part sans validation** : aperçu, destinataire modifiable, puis bandeau « Oui, envoyer ».
- Les dépenses lues dans la banque sont **proposées**, jamais enregistrées sans validation.
- Textes en français simple, tutoiement, guillemets droits.
- Mobile d'abord : tester en 390 × 844.

## Les clés (fichier `.env`, jamais dans Git)

Le fichier `.env` n'est **pas** dans le dépôt. L'appli en ligne n'en a pas besoin pour fonctionner : les clés utilisées par le serveur (Brevo, Pennylane, Gmail) sont dans le coffre (vault) de Supabase. Le `.env` ne sert qu'à **modifier et publier** l'appli. Le recréer à la racine du projet avec ces noms :

Où retrouver chaque clé :
- Supabase (URL, clés publishable et secret) : https://supabase.com/dashboard/project/bcfcrqmpeyaoovluvhhn/settings/api-keys
- Jeton d'administration Supabase (`SUPABASE_ACCESS_TOKEN`) : https://supabase.com/dashboard/account/tokens (en créer un nouveau)
- Cloudflare (`CLOUDFLARE_TOKEN`, droit « Cloudflare Pages : Edit ») : https://dash.cloudflare.com/profile/api-tokens — `CLOUDFLARE_ACCOUNT_ID` = `ad8f78937df88f2398700f8584351cfc`
- Brevo (`BREVO_API_KEY`) : https://app.brevo.com/settings/keys/api — `BREVO_SENDER` = l'adresse d'expéditeur validée
- Pennylane (`PENNYLANE_TOKEN`) : Pennylane › Paramètres › Connectivité › Développeurs

Le strict minimum pour modifier et publier : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Liste complète :

```
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL,
SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER,
SUPABASE_ACCESS_TOKEN (jeton d'administration Supabase « sbp_… »),
BREVO_API_KEY, BREVO_SENDER,
CLOUDFLARE_TOKEN, CLOUDFLARE_ACCOUNT_ID,
PENNYLANE_TOKEN,
NETLIFY_TOKEN, NETLIFY_SITE_ID (ancienne adresse seulement), APP_URL
```

Dans une session Claude Code en ligne, l'environnement doit autoriser ces adresses :
`bcfcrqmpeyaoovluvhhn.supabase.co`, `api.supabase.com`, `api.brevo.com`, `api.cloudflare.com`, `gestion-locative-sci.pages.dev`, `app.pennylane.com` (et `api.netlify.com` pour l'ancienne adresse).

## Commandes utiles

```sh
python3 build.py                 # fabrique dist/
./deploy.sh                      # fabrique et publie sur Cloudflare
sh tests/prepare.sh              # une fois : bibliothèques et photos pour les tests
set -a; . ./.env; set +a         # charge les clés pour les tests serveur
python3 tests/sql.py "select 1"  # requête SQL sur Supabase (via le jeton d'administration)
```

Appliquer un fichier SQL : `python3 tests/sql.py supabase/banque.sql`.
Déployer la fonction Gmail : voir la commande `functions/deploy` de l'API Supabase (multipart, `verify_jwt: true`).

## Les tests (Playwright, déjà installé dans les sessions Claude Code en ligne)

| Test | Vérifie |
|---|---|
| `tests/test5.js` | Toutes les pages, téléphone clair/sombre et ordinateur, sans débordement ni erreur (mode local) |
| `tests/test9.js` | Vraie base : isolement entre espaces, invitations, temps réel entre associés |
| `tests/test15.js`, `tests/test25.js` | Versements partiels, plan de rattrapage, message au locataire |
| `tests/test17.js`, `tests/test23.js` | Copie de l'espace GTP : rapprochement bancaire, compta automatique |
| `tests/test20.js` | États des lieux avec photos, droits d'accès aux photos |
| `tests/test22.js` | Aucun envoi sans validation |
| `tests/test26.js` | Parcours d'un nouvel utilisateur (guide) |
| `tests/test28.js` | Bouton « ? » de signalement avec capture d'écran |
| `tests/test29.js` | Paiement partiel étalé, ordures ménagères (tous les choix), avenant au bail |
| `tests/test31.js` | Vraie base : lecture seule (voir sans modifier ni envoyer), changement de rôle, préférences de notification |
| `tests/test32.js` | Vraie base : ouverture instantanée depuis la copie de l'appareil, mise à jour en arrière-plan, hors connexion, file des modifs en attente (rien perdu ni écrasé), copie effacée à la déconnexion |
| `tests/perf.js` | Temps d'affichage de chaque page (démo, puis `K=6 AN=2016` = 28 locataires sur 10 ans) ; `node tests/perf.js profil` liste les fonctions lentes |
| `tests/test33.js` | Vraie base + Google simulé : connexion Drive expliquée, choix du dossier, lecture, droits d'un associé |
| `tests/test34.js` | Mise à jour de l'appli : version, chercher, bandeau "Nouvelle version prête", rechargement (service worker) |
| `tests/test35.js` | Vraie base : assistant Pennylane (2 chemins), faux jetons, banque réservée au propriétaire |
| `tests/test36.js` | Vraie base + Google simulé : plusieurs dossiers, sous-dossiers, dossier = logement, rangement automatique, Annuler, pas de doublon |
| `tests/test37.js` | Services publics (vrais appels, adresse neutre) : adresse qui se complète, DPE ADEME, Géorisques |
| `tests/test38.js` | Quittances du mois en un geste (adresses modifiables, Pas besoin, sans e-mail = PDF) |
| `tests/test39.js` | Vraie base : copie de sauvegarde du lundi par e-mail (aperçu seulement, aucun envoi) |
| `tests/test40.js` | DPE électrique : tâche de mise à jour gratuite, révision proposée quand F/G passe à E |
| `tests/test41.js` | Déclaration d'occupation (GMBI), dates simulées |
| `tests/test42.js` | Prêts, ventilation des échéances, intérêts compta/2072, rentabilité nette, avances des associés |
| `tests/test30.js` | Accueil, Annuler, lexique, tons des relances, 12 mois, régularisation, FEC, départ et retenues, annonce, candidats, travaux, lecture d'un bail, photo de facture (internet), import Excel, agenda, mentions légales, lecture seule |

Les tests « vraie base » utilisent deux comptes de test (`test-a@gestion-test.fr`, `test-b@gestion-test.fr`) et suppriment leurs espaces à la fin.
Après chaque changement : `node tests/test5.js` au minimum, puis `./deploy.sh`.

## Travailler depuis un autre compte Claude sans connecteur GitHub

Le propriétaire crée un jeton GitHub limité à ce dépôt (https://github.com/settings/personal-access-tokens/new : « Only select repositories » › `crbntheo-png/Logements-`, permission **Contents : Read and write**), puis la session fait :

```sh
git clone https://x-access-token:<JETON>@github.com/crbntheo-png/Logements-.git GestionSCI
cd GestionSCI && git checkout ccr-6df8be48-11wmro
# … travail …
git push origin ccr-6df8be48-11wmro
```

Le jeton va aussi dans `.env` (`GITHUB_TOKEN=`), jamais dans un fichier suivi par Git. Si le réseau bloque `github.com`, l'autoriser dans l'environnement.
