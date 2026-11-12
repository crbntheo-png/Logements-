# Journal de bord — appli « Gestion locative »

Plusieurs sessions Claude (comptes différents) travaillent sur ce projet, **une à la fois**.
Règle pour chaque session :

1. **Au début** : `git pull origin ccr-6df8be48-11wmro`, lire `REPRISE.md` puis ce journal (surtout « À faire »).
2. **À la fin** : ajouter une entrée en haut de « Historique » (date, ce qui a été fait, ce qui reste, ce qui n'est pas vérifié), mettre à jour « À faire », puis `git add -A && git commit && git push origin ccr-6df8be48-11wmro`.
3. Toujours travailler sur la branche **`ccr-6df8be48-11wmro`** (c'est la branche de l'appli en ligne).
4. Si l'appli a été modifiée : `node tests/test5.js` (au minimum) puis `./deploy.sh`, et noter dans l'entrée si c'est en ligne.
5. Ne jamais mettre de clé dans Git : elles vont dans `.env` (ignoré par Git).

## À faire (priorités)

- [ ] **Taxe foncière Agon 2026** : récupérer la page « détail par local » de l'avis n° 2650400237412 (impots.gouv › Espace professionnel › Consulter › Avis d'imposition), puis remplacer la répartition à parts égales (516,67 € par lot, ordures ménagères à 0) par les vrais montants. Antoine et Sofiane doivent leur part d'ordures ménagères.
- [ ] **Ordures ménagères Beauchamps 2026** : 133 € (41, Margottet – Fravelle) et 140 € (43, Steve) lus sur le décompte du notaire (scan peu lisible) : montants à confirmer (ils servent aussi au calcul mensuel 2027).
- [ ] **Bouton « Importer depuis Google Drive »** (Google Picker, accès `drive.file`) : attend 3 infos du propriétaire (ID client OAuth, clé API, numéro du projet Google Cloud). Copier les fichiers choisis dans le bucket `documents`.
- [ ] **E-mail de Sofiane Hesry** : introuvable (ni Gmail, ni bail lisible). Sera gardé automatiquement à la 1re saisie dans un envoi.
- [ ] **Anciens baux Lilou Douillard et Julie Sergent** (Drive, dossier « Loyers Bails Agon ») : savoir quel lot d'Agon, puis les ranger dans les documents du bon bien.
- [ ] **Steve Godefroy** : vérifier les 20 € saisis le 9/11, puis "Étaler le reste" sur sa carte (50 €/mois à partir de décembre).
- [ ] **Ordures ménagères Steve et Margottet** : 2026 reçues → "Que faire ?" › "Il l'a déjà payée" ; à partir de janvier 2027 mensualisées → cocher "chaque mois", faire signer les avenants.
- [ ] Le propriétaire n'a pas encore branché son Gmail (Réglages › Envoyer depuis ton adresse Gmail).

## Historique

### 12/11/2026 (après-midi) — paiement partiel étalé, ordures ménagères, avenants
Fait (en ligne sur https://gestion-locative-sci.pages.dev, `node tests/test5.js` et `node tests/test29.js` OK en 390 × 844 clair et sombre) :
- **Paiement partiel → étaler le reste** : dans "Il a versé…" et "Autre montant", si la somme ne couvre pas tout, un encart propose "On s'est mis d'accord pour étaler le reste" (X € en plus par mois, à partir de tel loyer), avec le calcul affiché (nombre de mois, dernier versement, mois de fin). Le mois concerné passe en statut "Étalé" (plus "En retard"), pas de relance proposée tant que l'accord est suivi ; s'il décroche, tâche urgente "Étalement pas suivi". Carte de l'accueil : "A payé 220 € sur 510 € · il manque" avec boutons "Il a versé…" / "Étaler le reste". Compteur "étalé" sur l'accueil. La banque (Pennylane) répartit déjà : loyer du mois d'abord, le surplus rattrape l'étalé.
- **Ordures ménagères** : bouton "Que faire ?" (accueil, À faire, Faire le point) avec tous les cas : la demander (courrier + e-mail après accord), déjà payée (avec date), ne pas la demander cette année ; et, en plus, "les années suivantes, la mettre dans ses charges chaque mois" → ouvre l'avenant pré-rempli (1er janvier suivant, taxe ÷ 12). Une fois mensualisée, plus de tâche annuelle pour ce locataire.
- **Avenant au bail** (bouton "✍️ Avenant" sur la fiche locataire, pour tout le monde) : ce qui change (ordures mensualisées, charges, loyer convenu, jour de paiement, autre), à partir de quel loyer, total avant/après ; document "Avenant n° X" à signer (lu et approuvé), envoi seulement après aperçu + "Oui, envoyer". Ne change jamais les loyers passés. Un avenant ne bloque pas la révision IRL annuelle.
- Robustesse : les fenêtres touchées relisent la fiche au moment de valider (la synchro en direct remplace les fiches pendant qu'une fenêtre est ouverte, ce qui faisait perdre l'enregistrement).

Pas fait / pas vérifié :
- Aucune donnée réelle de GTP INVEST modifiée. Steve : l'appli voit 220 € reçus en novembre (200 € par la banque le 5/11 + **20 € saisis à la main le 9/11**, à vérifier : erreur de saisie ?).
- Changer le jour de paiement par avenant modifie aussi la date des mois passés non payés (petit décalage du nombre de jours de retard).
- Pas testé avec un vrai compte connecté (seulement en mode local + tests).

### 12/11/2026 — reprise sur le Mac de Théo (Claude Code, application de bureau)
- Fait : dépôt récupéré dans `~/Desktop/GestionSCI` (branche `ccr-6df8be48-11wmro`, à jour), `.env` créé à la racine (ignoré par Git).
- Accès vérifiés : Supabase (requête SQL OK, 121 lignes dans `docs`), Cloudflare (jeton actif), Brevo (OK), Pennylane (OK), appli en ligne (répond).
- Tests : Playwright installé en local (`npm install --no-save playwright@1.48.2` + `npx playwright install chromium`), `node_modules/` ajouté au `.gitignore`. `sh tests/prepare.sh` puis `node tests/test5.js` : aucune erreur, aucun débordement (39 captures, téléphone 390 × 844 clair/sombre et ordinateur).
- Aucune modification de l'appli, donc pas de `./deploy.sh` lancé (la mise en ligne n'a pas été testée depuis ce Mac).
- Reste : la liste « À faire » ci-dessus, inchangée.

### 12/11/2026 — session du compte principal
État de l'appli à cette date (tout est en ligne sur https://gestion-locative-sci.pages.dev) :
- Comptes par e-mail (code à 6 chiffres via Brevo), espaces séparés, invitations, synchro en direct.
- Locataires, loyers, quittances, relances, révisions IRL, plan de rattrapage avec « point au locataire ».
- Aucun envoi sans aperçu + confirmation ; envoi depuis le Gmail de chaque utilisateur (mot de passe d'application).
- Banque : Pennylane (synchro serveur chaque heure) ou relevé CSV ; dépenses classées d'avance, validées par l'utilisateur.
- Biens : fiche détaillée, documents en tuiles par type (79 documents GTP rattachés depuis le Drive), états des lieux avec photos.
- Taxes foncières 2026 saisies (voir « À faire »).
- Guide de démarrage, page « Comment ça marche ? », bouton « ? » de signalement (reçu par e-mail avec capture).
- `REPRISE.md` et `tests/` ajoutés pour reprendre depuis une autre session.
