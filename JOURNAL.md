# Journal de bord — appli « Gestion locative »

Plusieurs sessions Claude (comptes différents) travaillent sur ce projet, **une à la fois**.
Règle pour chaque session :

1. **Au début** : `git pull origin ccr-6df8be48-11wmro`, lire `REPRISE.md` puis ce journal (surtout « À faire »).
2. **À la fin** : ajouter une entrée en haut de « Historique » (date, ce qui a été fait, ce qui reste, ce qui n'est pas vérifié), mettre à jour « À faire », puis `git add -A && git commit && git push origin ccr-6df8be48-11wmro`.
3. Toujours travailler sur la branche **`ccr-6df8be48-11wmro`** (c'est la branche de l'appli en ligne).
4. Si l'appli a été modifiée : `node tests/test5.js` (au minimum) puis `./deploy.sh`, et noter dans l'entrée si c'est en ligne.
5. Ne jamais mettre de clé dans Git : elles vont dans `.env` (ignoré par Git).

## À faire (priorités)

- [ ] **Notifications** : activer les alertes sur ton téléphone (Réglages › Notifications, appli installée) et faire l'essai.
- [ ] Mentions légales : remplir `EDITEUR` (nom, contact) avant toute mise en vente.
- [ ] **Taxe foncière Agon 2026** : récupérer la page « détail par local » de l'avis n° 2650400237412 (impots.gouv › Espace professionnel › Consulter › Avis d'imposition), puis remplacer la répartition à parts égales (516,67 € par lot, ordures ménagères à 0) par les vrais montants. Antoine et Sofiane doivent leur part d'ordures ménagères.
- [ ] **Ordures ménagères Beauchamps 2026** : 133 € (41, Margottet – Fravelle) et 140 € (43, Steve) lus sur le décompte du notaire (scan peu lisible) : montants à confirmer (ils servent aussi au calcul mensuel 2027).
- [ ] **Connexion Google Drive dans l'appli installée** : le « cerveau » `analyserDrive()` (index.html) range les fichiers et propose ce qu'il faut compléter ; il marche déjà quand la liste du Drive est connue (`DOCS.fichiers`, version Claude). Reste à brancher la connexion Google (OAuth, lecture du Drive) dans la version installée : attend 3 infos du propriétaire (ID client OAuth, clé API, numéro du projet Google Cloud).
- [ ] **E-mail de Sofiane Hesry** : introuvable (ni Gmail, ni bail lisible). Sera gardé automatiquement à la 1re saisie dans un envoi.
- [ ] **Anciens baux Lilou Douillard et Julie Sergent** (Drive, dossier « Loyers Bails Agon ») : savoir quel lot d'Agon, puis les ranger dans les documents du bon bien.
- [ ] **Avenants n° 1 Steve et Margottet** (ordures dans les charges dès janvier 2027) : enregistrés dans l'appli, à envoyer et faire signer.
- [ ] **Margottet – Fravelle** : loyer de novembre pas reçu (dû le 10/11).
- [ ] Le propriétaire n'a pas encore branché son Gmail (Réglages › Envoyer depuis ton adresse Gmail).

## Historique

### 12/11/2026 (suite) — session du compte principal
- Retiré la rubrique « Mes autres applis » (Boussole Fiscale, Contre-Visite) de l'accueil et des réglages, et vidé les liens de l'espace GTP.
- Réglage Google Drive réécrit (à quoi il sert, comment copier le lien).
- Ajouté `analyserDrive()` + bloc « Ce que l'appli a trouvé dans ton Drive » (onglet Docs) : testé sur 198 fichiers réels du Drive GTP → 46 rangements proposés (bon logement / type / locataire) et 5 infos à compléter. Ne s'affiche que si la liste du Drive est disponible (pas encore dans l'appli installée, voir « À faire »).
- Fusionné avec le travail de la session Pro (7 enregistrements) puis remis en ligne.

### 12/11/2026 (soir, suite) — réglages serveur appliqués (accord de Théo)
- Appliqués sur la base : `supabase/lecteurs.sql` (rôle lecture seule, règles d'accès docs et fichiers, envoi d'e-mails réservé à ceux qui peuvent modifier), `supabase/compte.sql` (suppression du compte), `supabase/notifications.sql` (tables + tâche `notifier` tous les jours à 7 h 05 UTC, soit 8 h 05 à Paris en hiver et 9 h 05 en été).
- Déployés : fonction `notifier` (sans JWT, protégée par l'en-tête x-cle-cron ; secrets VAPID_PUBLIC, VAPID_PRIVATE, CLE_CRON_NOTIFIER, BREVO_API_KEY, BREVO_SENDER, APP_URL ; clé aussi dans le coffre sous `cle_cron_notifier`) et `envoyer-gmail` v5 (vérifie maintenant `est_editeur`).
- Vérifié : appel sans clé refusé (401) ; appel de la tâche planifiée OK (200, rien envoyé : aucun abonné, ni 1er ni 5) ; `tests/test31.js` (vraie base, comptes de test) 10/10 : le lecteur voit mais ne peut ni ajouter, ni modifier, ni envoyer, ni changer son rôle ; après "Peut modifier" il peut ; préférences de notification privées. `tests/test9.js` OK (rendu utilisable sans proxy).
- ⚠️ Incident : la première version de test31 a appelé `envoyer_mail` avec l'adresse fictive personne@exemple.fr pendant que la fonction n'était pas encore corrigée : un e-mail de test (objet "x") est réellement parti via Brevo à cette adresse. Aucun locataire concerné. Le test utilise maintenant une liste vide (aucun envoi possible). Une fonction inutile `envoyer_mail_garde` créée par erreur a été supprimée.
- Pas vérifié : une vraie notification reçue sur un téléphone (il faut activer les alertes dans Réglages › Notifications sur l'appli installée, puis "M'envoyer un essai").

### 12/11/2026 (soir) — grande passe "facilité d'utilisation" (demande de Théo : tout sauf GoCardless et Yousign)
En ligne (https://gestion-locative-sci.pages.dev), testé en 390 × 844 clair et sombre : `test5` OK, `test29` OK, `test30` 49/49 OK (dont lecture OCR d'une vraie photo de facture).
- Accueil : "À faire" en premier, guide de démarrage sur une ligne, 30 prochains jours repliés, cartes plus compactes, plus de raccourcis (le + les remplace).
- Bouton "Annuler" dans le message après chaque action (A payé, C'est fait, chaque formulaire validé).
- Bouton + adapté à la page (fiche locataire, fiche logement, compta) ; recherche élargie (dépenses, documents, travaux, candidats, nouvelles actions).
- Lexique "C'est quoi ?" (bulles ? sur les mots du métier + "Petit lexique" dans l'aide) ; "Pourquoi ?" sur chaque tâche (règle, risque, gain) ; couleurs : vert payé, orange attendu/étalé, rouge retard ; relances avec 3 tons (gentil, ferme, officiel).
- Fiche locataire : 12 prochains mois (montant et pourquoi), parcours d'arrivée (dossier, diagnostics, bail, dépôt, assurance, EDL, compteurs) et de départ (préavis, annonce, EDL sortie, comparaison et retenues, dernier loyer, dépôt) ; comparaison entrée/sortie + courrier de restitution du dépôt ; champ Visale.
- Compta : régularisation des charges guidée (provisions vs charges réelles, report sur un prochain loyer via "extras", courrier, ajustement de provision par avenant) ; aide à la 2072 ; fichier FEC pour le comptable.
- Fiche logement : "Relouer" (annonce avec mentions obligatoires, encadrement des loyers, candidats notés avec taux d'effort, "Choisir" crée le locataire), "Travaux" (devis, artisan, facture → dépense, garantie).
- Rappels légaux : PNO, détecteur de fumée, entretien chauffage, encadrement des loyers.
- Imports : Excel/Numbers/CSV (modèle téléchargeable), bail PDF ou photo (remplit le formulaire), photo de facture (remplit la dépense).
- Branchements : indice IRL lu tout seul sur le site de l'INSEE (1 fois par jour), agenda (.ics pour iPhone/Android/Google), SMS et WhatsApp depuis son propre téléphone (texte prêt), lien Visale.
- Prêt à vendre : mentions légales et confidentialité (#legal), suppression du compte, sauvegarde ; Android/iOS : raccourcis d'appli, écrans de démarrage iPhone/iPad, manifeste complété.

En attente d'une autorisation (bloqué par le garde-fou de Claude Code, action sur la base en production) — fichiers prêts dans `supabase/` :
- `lecteurs.sql` : rôle "lecture seule" (associé, comptable). L'appli est déjà prête (invitation avec rôle, bascule par le propriétaire, bandeau, boutons masqués).
- `compte.sql` : fonction de suppression du compte.
- `notifications.sql` + fonction `supabase/functions/notifier` : alertes sur le téléphone (virement reçu, loyer pas arrivé à J+3, point du 1er et du 5) et résumé par e-mail (à activer par chacun). Clés VAPID dans `.env`. À déployer : la fonction, ses secrets (VAPID_PUBLIC, VAPID_PRIVATE, CLE_CRON_NOTIFIER, BREVO_API_KEY, BREVO_SENDER, APP_URL) et le secret `cle_cron_notifier` dans le coffre.

Pas faits (il faut un compte ou une info du propriétaire) : banque sans Pennylane (Bridge ou Powens), Google Drive (3 infos Google), offre payante (Stripe), publication dans les stores (comptes Apple et Google), nom de l'éditeur dans les mentions légales (constante `EDITEUR`).

### 12/11/2026 (fin de journée) — vraies données GTP INVEST mises à jour (accord de Théo)
- Steve : les 20 € saisis à la main le 9/11 supprimés (aucun virement en face, la banque n'a que 200 € le 5/11). Manque de novembre 310 € étalé : 50 €/mois à partir de décembre, donc 560 € en décembre, 571,67 € de janvier à mai (avec les ordures), 531,67 € en juin 2027 (10 € étalés). Contrôlé : novembre en "Étalé", "il suit l'accord", plus de relance proposée.
- Ordures ménagères 2026 marquées reçues le 12/11 : Steve 140 €, Margottet 133 € (date réelle de réception inconnue).
- Avenant n° 1 enregistré pour les deux, à partir du loyer de janvier 2027 : charges 0 → 11,67 €/mois (Steve, 140 ÷ 12) et 0 → 11,09 €/mois (Margottet, 133 ÷ 12). Rien n'a été envoyé : les avenants sont à ouvrir depuis la fiche (Révisions et avenants › Avenant), à imprimer ou envoyer, puis à faire signer.
- Vérifié en chargeant les vraies données dans une copie locale de l'appli (téléphone 390 × 844) : calculs et avenant OK. Pas vérifié depuis l'appli connectée.
- Margottet n'a toujours pas payé novembre (dû le 10) : toujours en retard, rien changé.

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
