# Règles du projet (lu automatiquement par Claude à chaque session)

## Le propriétaire
- Pas développeur : français uniquement, mots simples, réponses courtes, guillemets droits ".
- Toujours donner les liens directs pour voir ou tester. Ne dire "fait" ou "testé" que si c'est vérifié, et dire ce qui ne l'est pas.

## Avant de travailler
- Lire `REPRISE.md` (comment marche l'appli) puis le haut de `JOURNAL.md` ("À faire").
- Branche unique : `ccr-6df8be48-11wmro` (c'est l'appli en ligne). Pas de pull request.
- `index.html` est gros (près de 7 000 lignes) : chercher avec grep, lire seulement le morceau utile.

## Règles qui ne bougent pas
- Pennylane : lecture seule, jamais aucune écriture (seulement des GET sur /me, /bank_accounts, /transactions).
- Aucun e-mail envoyé sans aperçu et confirmation du propriétaire.
- Jamais de suppression automatique de paiements ou d'opérations : proposer un choix à l'utilisateur.
- Ce que l'appli fait toute seule passe par `saveAuto()` (marqué "🤖 L'appli" dans l'historique), jamais par `save()`.
- Le connecteur Claude des utilisateurs ne doit rien révéler du code de l'appli.
- Les clés vont dans `.env` (ignoré par Git), jamais dans le code.

## Commandes
- Tester : `node tests/test5.js` au minimum, plus le test du sujet touché (tests/testNN.js).
- Publier l'appli : `./deploy.sh`.
- Fonction serveur : `set -a; . ./.env; set +a; sh tests/deploy_fn.sh <nom>`.
- SQL sur Supabase : `python3 tests/sql.py fichier.sql` ou `python3 tests/sql.py "requête"`.
- Comptes de test : test-a@gestion-test.fr et test-b@gestion-test.fr.

## Canal "Quoi de neuf" (obligatoire)
- Après chaque mise en ligne d'une nouveauté visible : `python3 tests/nouveaute.py ID "émoji" "Titre court" "Une phrase simple, en tutoyant : ce que ça change." "#page" --annoncer`.
- Mots simples, pas de jargon, une seule phrase. Pas pour une simple correction invisible.
- `--annoncer` (notification sur le téléphone de TOUS les utilisateurs) : seulement pour une grosse nouveauté, au plus une fois par semaine (Théo : "ça va les saouler"). Sinon, sans `--annoncer` : la nouveauté est juste listée dans Réglages › Plus de réglages et dans la page "Ce que l'appli fait pour toi". Aucun bandeau de nouveautés sur l'accueil.

## En fin de session
- Ajouter une entrée en haut de l'Historique de `JOURNAL.md`, mettre à jour "À faire", commit et push.
