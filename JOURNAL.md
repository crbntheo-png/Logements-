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
- [ ] **Ordures ménagères Beauchamps 2026** : 133 € (41, Margottet – Fravelle) et 140 € (43, Steve) lus sur le décompte du notaire (scan peu lisible) : à faire confirmer par le propriétaire avant de les demander.
- [ ] **Bouton « Importer depuis Google Drive »** (Google Picker, accès `drive.file`) : attend 3 infos du propriétaire (ID client OAuth, clé API, numéro du projet Google Cloud). Copier les fichiers choisis dans le bucket `documents`.
- [ ] **E-mail de Sofiane Hesry** : introuvable (ni Gmail, ni bail lisible). Sera gardé automatiquement à la 1re saisie dans un envoi.
- [ ] **Anciens baux Lilou Douillard et Julie Sergent** (Drive, dossier « Loyers Bails Agon ») : savoir quel lot d'Agon, puis les ranger dans les documents du bon bien.
- [ ] **Steve Godefroy** : le propriétaire doit créer son plan de rattrapage (dette réelle, 50 €/mois) dans sa fiche.
- [ ] Le propriétaire n'a pas encore branché son Gmail (Réglages › Envoyer depuis ton adresse Gmail).

## Historique

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
