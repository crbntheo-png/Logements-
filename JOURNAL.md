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
- [ ] **Connexion Google Drive** : codée, en ligne, clés Google posées le 13/11. Reste l'essai réel avec le compte Google de Théo, et vérifier si l'appli Google est publiée (sinon reconnexion tous les 7 jours). Ancienne note : le « cerveau » `analyserDrive()` (index.html) range les fichiers et propose ce qu'il faut compléter ; il marche déjà quand la liste du Drive est connue (`DOCS.fichiers`, version Claude). Reste à brancher la connexion Google (OAuth, lecture du Drive) dans la version installée : attend 3 infos du propriétaire (ID client OAuth, clé API, numéro du projet Google Cloud).
- [ ] **E-mail de Sofiane Hesry** : introuvable (ni Gmail, ni bail lisible). Sera gardé automatiquement à la 1re saisie dans un envoi.
- [ ] **Anciens locataires Lilou Douillard et Julie Sergent** (Tom Dogon fait le 14/11) : à créer dans l'historique du bon logement (fiche logement › + Ancien locataire, ou Docs › proposition "Ranger dans l'historique"). Ancienne note : **Anciens baux Lilou Douillard et Julie Sergent** (Drive, dossier « Loyers Bails Agon ») : savoir quel lot d'Agon, puis les ranger dans les documents du bon bien.
- [ ] **Avenants n° 1 Steve et Margottet** (ordures dans les charges dès janvier 2027) : enregistrés dans l'appli, à envoyer et faire signer.
- [ ] **Margottet – Fravelle** : loyer de novembre pas reçu (dû le 10/11).
- [ ] Le propriétaire n'a pas encore branché son Gmail (Réglages › Envoyer depuis ton adresse Gmail).

## Historique

### 14/11/2026 (suite 5) — tous les téléphones + Pennylane en libre-service (demande de Théo)
- **Tous les téléphones** : contrôle automatique de 11 pages et 7 fenêtres sur 5 tailles (320×568 vieil iPhone SE, 360×740 Android, 375×667 iPhone SE, 430×932 iPhone Pro Max, 844×390 paysage), rubriques ouvertes. Corrigé : menu "Plus" qui pouvait sortir à droite (aligné à droite), boutons d'aide des Réglages trop serrés, gros montants qui sortaient des cartes (taille qui s'adapte), barre des documents (quittance) coupée en 320, textes de boutons longs qui débordaient (passent à la ligne sous 420 px), bulles "?" avec une zone de toucher plus grande. Plus aucun débordement.
- **Pennylane pour n'importe qui** (vérifié dans la doc Pennylane : offre Essentiel ou plus, onglet Développeurs visible pour dirigeant ou comptable, droits `bank_accounts:readonly` et `transactions:readonly`, expiration au choix) : assistant "Brancher ta banque" avec 2 chemins. "J'ai accès à Pennylane" = 5 étapes + coller le jeton. "C'est mon comptable" = message prêt (modifiable) à copier, envoyer par e-mail (ouvre ta messagerie, rien ne part tout seul) ou SMS/WhatsApp, puis coller le jeton reçu. Nouvelle rubrique Réglages › Banque.
- **Serveur** (`supabase/banque2.sql`, appliqué) : brancher/débrancher la banque réservé au propriétaire de l'espace (avant : n'importe quel membre, même en lecture seule) ; le jeton est vérifié (format, accepté par Pennylane, droit de lire comptes ET opérations) avec des messages clairs ; synchro horaire : messages clairs si le jeton expire (401) ou manque de droits (403). Synchro GTP relancée après : OK, 200 opérations.
- Nouveau `tests/test35.js` (comptes de test, faux jetons, rien envoyé) 12/12. test5, 29, 30 (49/49), 33, 34 OK. En ligne, version 07fd120.
- Pas vérifié : avec un vrai jeton Pennylane d'une autre société ; sur un vrai téléphone.

### 14/11/2026 (suite 4) — "Mettre à jour l'appli" (demande de Théo)
- **Version** : `build.py` calcule un numéro stable (7 caractères, d'après index.html + build.py) et une date gardée tant que rien ne change ; posés dans `window.APP_VERSION` et dans `dist/version.json` (jamais en cache : en-tête `no-store`, ignoré par le service worker). Le service worker prend ce numéro (avant : un nombre au hasard à chaque fabrication).
- **Réglages › Outils › Mettre à jour l'appli** : version actuelle, "Chercher une mise à jour" (compare avec `version.json` en ligne, puis demande au téléphone de télécharger), "Mettre à jour maintenant" (recharge ; si le téléchargement n'est pas fini, attend jusqu'à 10 s).
- **Bandeau "🆕 Nouvelle version prête · Mettre à jour"** : dès que la nouvelle version est installée (événement `maj-prete` envoyé par le petit script de build.py), collé en haut de toutes les pages. La mise à jour automatique quand on quitte l'appli reste en place.
- Nouveau `tests/test34.js` (vraie appli avec service worker sur un serveur local, compte de test, "fausse" version 2 publiée) : 11/11 OK. test5, test32 (9/9), test33 OK. En ligne, version 1448642.
- Pas vérifié sur ton téléphone. Comme l'appli installée a encore l'ancienne version (sans cette rubrique), elle doit d'abord se mettre à jour une fois toute seule (quitter puis rouvrir l'appli).

### 14/11/2026 (suite 3) — grand ménage de l'affichage (demande de Théo : "encore trop brouillon")
Constat sur téléphone avec les vraies données : tout s'affichait en grosses fiches avec étiquettes (À PAYER LE, LOYER HC…). Compta faisait 20 100 px de haut, Loyers 2 060, Biens 2 560.
- **Listes compactes** (`.lr-list`, `ligneLoyer`, `sousTitreLoyer`, `actionsCourtes`) : une ligne par élément, montant et statut à droite, boutons seulement quand il y a quelque chose à faire. Loyers (en retard d'abord, total en bas), Biens (logement, locataire, loyer, statut ; touche = fiche), Compta (par logement : résultat + loyers/dépenses ; dépenses avec icône, libellé de banque nettoyé `libelleLisible`, 12 dernières + "Voir les autres"), mois par mois de la fiche locataire (6 derniers + "Voir les mois d'avant").
- **Menus "Plus"** (`menuPlus`) : fiche locataire = Documents, Modifier, Plus (bail, révision, avenant, départ) ; Compta = + Dépense (et Importer si pas de banque), Plus (Excel, FEC, Bilan, Régulariser).
- **Fiche locataire** : en haut seulement Loyer et Doit ; "Infos du bail" et "Historique" repliés ; parcours d'arrivée replié en une ligne après le 1er mois.
- **Accueil** : locataires qui ont besoin d'une action en premier ; ceux à jour tiennent sur une ligne (plus de bouton "Rien à faire").
- Compta sans banque : le tuto du relevé est replié en une ligne.
- Résultat : Compta 3 600 px, Loyers 970, Biens 850, fiche locataire 2 600 (au lieu de 3 770).
- Tests : test5, test22, test25, test26, test29 (adapté au menu Plus), test30 49/49, test33 OK ; test15 identique à avant ; perf < 0,04 s par page. Clair et sombre vérifiés. En ligne. Pas vérifié sur ton téléphone.

### 14/11/2026 (suite 2) — Tom Dogon rangé dans l'historique (accord de Théo)
- Vraies données GTP INVEST : ancien locataire "Tom Dogon" ajouté au logement Agon · RDC droite (`anciens`, id `anc-tom-dogon`, dates inconnues), et le document "Ancien bail – Tom Dogon" rattaché à lui (`ancienId`). Il n'apparaît plus dans les documents du logement ni d'Antoine.
- Vérifié sur une copie locale des vraies données (390 × 844) : Tom dans "Historique du logement" avec 1 document. Pas vérifié depuis l'appli connectée (rouvrir l'appli si elle était ouverte).
- Reste : Julie Sergent et Lilou Douillard (logement à choisir par Théo), dates de Tom si connues (bouton Modifier).

### 14/11/2026 (suite) — historique des logements et Drive réservé au propriétaire (demande de Théo)
- Théo a connecté son Drive (crbntheo@gmail.com) et rangé 72 documents (79 → 151).
- **Historique du logement** (fiche logement, à la place de "Locataires") : locataire en place, locataires partis, et **anciens locataires d'avant l'appli** (`bien.anciens` : nom, arrivé, parti, notes). Aucun loyer calculé pour eux. Leurs documents ont `ancienId` : ils sont à part (page `#docs-<bien>~-1~~<ancienId>`), plus mélangés aux documents du logement ni du locataire actuel. "+ Ancien locataire" : en tapant le nom, l'appli coche les documents du logement qui le mentionnent (bail, EDL, pièces). "Concerne" d'un nouveau document propose aussi les anciens.
- **Drive** : un bail trouvé au nom d'un inconnu (y compris "Ancien bail – X") propose "Ranger dans l'historique" (choix du logement).
- **Drive réservé au propriétaire de l'espace** : seul le propriétaire (rôle `proprietaire`, ici Théo) connecte le Drive, choisit le dossier et range les propositions. Gabriel et Pierre (membres) voient "Le Drive est géré par …" dans Docs et Réglages, sans bouton. Contrôle fait dans l'appli (pas de blocage côté base : un membre peut toujours ajouter un document à la main depuis une fiche).
- Pas fait : Tom Dogon, Julie Sergent, Lilou Douillard ne sont pas encore créés dans les vraies données (Théo le fait dans l'appli ; Tom = Agon RDC droite, doc "Ancien bail – Tom Dogon" déjà là).
- Tests : test33 16/16 (dont droits d'un associé), test5 OK, test30 49/49. Essai sur une copie locale des vraies données (Tom dans Agon RDC droite) OK. En ligne.

### 14/11/2026 — Google Drive branché dans l'appli installée (demande de Théo, pour lui et ses potes)
- **Serveur** : `supabase/drive.sql` appliqué (table `drive_comptes`, clé de renouvellement Google dans le coffre `drive_<user>`, fonctions réservées au serveur) ; fonction `drive` déployée (actions config, brancher, jeton, debrancher ; vérifie la connexion). Secrets attendus : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (pas encore posés : il faut le projet Google Cloud de Théo).
- **Appli** : "Connecter mon Google Drive" (onglet Docs et Réglages › Google Drive) avec l'explication de ce que la connexion permet et ne permet pas (lecture seule, rien modifier, rien partager, pas de copie, associés). Connexion Google en fenêtre (GIS, code envoyé au serveur) : elle reste branchée, l'appli redemande un jeton d'1 h au serveur quand il faut. Choix du dossier (Mon Drive + Partagé avec moi), lecture du dossier et sous-dossiers, puis le "cerveau" `analyserDrive()` propose les rangements et ce qu'il faut compléter (validation avant rangement). Débrancher = révoque l'accès chez Google. Confidentialité mise à jour.
- Nouveau `tests/test33.js` (vraie base, compte de test, Google simulé) : 11/11 OK. test5 OK. En ligne.
- Projet Google Cloud créé par Théo le 13/11 : `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` posés dans les secrets Supabase et dans `.env` ; Google les reconnaît, la fonction `drive` répond (config prête).
- Pas vérifié : connexion avec un vrai compte Google (à faire par Théo dans l'appli, Docs › Connecter mon Google Drive).

### 13/11/2026 (nuit) — Réglages simplifiés (demande de Théo)
- Page Réglages refaite en rubriques repliées, une ligne chacune avec un petit résumé (on touche pour ouvrir) : "Ton compte" (La SCI, Membres, Envoi des e-mails, Notifications, Appli sur le téléphone), "Outils" (Agenda, Indice des loyers, Sauvegarde et import, Rappels), puis "Zone sensible". Rien n'a été retiré : le contenu de chaque rubrique est le même qu'avant.
- En haut : 3 petits boutons sur une ligne : Aide, Un problème, Une idée.
- Les boutons qui menaient aux réglages (guide, "Brancher Gmail", "Inviter", "Voir le tuto", "Remplir", Drive, Notifications) ouvrent directement la bonne rubrique (`reglage(id)`).
- Tests : test5, test26, test30 (49/49), test31 (10/10, comptes de test) OK. Vérifié en 390 × 844 clair et sombre. En ligne (vérifié sur gestion-locative-sci.pages.dev). Pas vérifié sur ton téléphone connecté.

### 13/11/2026 (soir, suite) — roue crantée et "Proposer une idée" (demande de Théo)
- Bouton des réglages en haut à droite : roue crantée à la place des curseurs.
- Réglages : à côté de "🐞 Signaler un problème", nouveau bouton "💡 Proposer une idée" qui ouvre la même fenêtre avec "Une idée" déjà choisi et un exemple d'idée. Le bouton "?" flottant ouvre toujours sur "Ça ne marche pas".
- Les fenêtres ne mettent plus le curseur sur un choix à cocher (il va dans la première case à remplir).
- Tests : test5 OK, test28 OK (envoi simulé, rien n'est parti). En ligne (vérifié sur gestion-locative-sci.pages.dev). Pas vérifié sur ton téléphone.
- Théo trouve qu'il y a beaucoup de choses dans les réglages ("pourquoi pas") : rien changé, piste si besoin de simplifier plus tard.

### 13/11/2026 (soir) — plus clair : états des lieux, quittances "Pas besoin", page À faire (demande de Théo)
- **États des lieux** (fiche locataire) : un état des lieux déjà rangé en PDF dans les documents, ou une date d'entrée notée, compte comme fait. L'appli ne redemande plus l'entrée (cas de Steve et Margottet) : elle affiche "Entrée du …" avec "Ouvrir". La sortie n'est proposée que si un départ est noté ; sinon "se fera le jour du départ". Pareil sur la fiche logement et dans le bouton +.
- **Quittances** : bouton "Pas besoin" partout où une quittance est demandée (accueil, À faire, carte du locataire, Faire le point). Le loyer reste payé, la quittance ne revient plus (clé `qno-<bail>|<mois>` dans `S.faits`, avec Annuler). Nouvelle case dans la fiche locataire : "Il n'a pas besoin de quittance chaque mois" (`sansQuittance`).
- **Page À faire** : "À surveiller" replié par défaut (rien d'urgent) ; texte de l'assurance habitation raccourci (le détail reste dans "Pourquoi ?"). Accueil : sur téléphone, les boutons passent sous le texte quand ils sont longs.
- **Drive** : documents rangés vérifiés (79, tous avec un lien ; les doublons sont voulus : même PDF pour bail + état des lieux, actes partagés entre logements). Rien à nettoyer. La connexion Google Drive dans l'appli installée n'existe pas encore dans le code (aucune connexion Google trouvée, ni ici ni dans les autres projets) : toujours bloquée sur les 3 infos Google (voir "À faire").
- Aucune donnée réelle modifiée (contrôles faits sur une copie locale des vraies données, en 390 × 844 clair et sombre). Tests : test5 OK. En ligne (vérifié sur gestion-locative-sci.pages.dev).
- Pas vérifié : sur ton vrai téléphone connecté.

### 13/11/2026 — optimisation de la vitesse (demande de Théo : "optimiser de ouf")
- **Calculs** : les loyers étaient recalculés des milliers de fois par écran (chaque mois relisait tous les paiements, et le suivi d'étalement relançait tout le calcul). Ajouté une mémoire de calcul pendant chaque affichage (`MEMO`, `indexBail`, `echeancesBail`/`planEtat` mémorisés, vidée à chaque `save()`), et des formats de dates préparés une fois (`F_D`, `F_M`, `cache1` pour `addM`, `dim`, `fm`). Avec 28 locataires sur 10 ans (3 640 paiements, 905 dépenses) : avant, l'appli restait bloquée plusieurs minutes ; maintenant chaque page s'affiche en moins de 0,04 s (`tests/perf.js`).
- **À faire** : au-delà de 60 tâches dans un groupe, on en montre 40 et un bouton "Voir les N autres".
- **Associés** : plusieurs changements reçus d'un coup ne redessinent l'écran qu'une fois (`remoteChanged` regroupé sur 60 ms).
- **Ouverture instantanée** : les données de la dernière visite sont gardées sur l'appareil (`gestion-sci-cache`) et affichées tout de suite, puis remises à jour en ligne sans bloquer (`ouvrirDepuisCache`, `ouvrirEspace(id, true)`) ; ce que tu modifies pendant cette mise à jour n'est pas écrasé. Sans connexion, tu vois tes données de la dernière ouverture. Copie effacée à la déconnexion (et l'ancienne `gestion-sci-v1` aussi).
- **Appli installée** (`build.py`, sw.js) : la copie de l'appli sur le téléphone s'ouvre d'abord, la nouvelle version se télécharge en fond et s'installe quand l'appli passe en arrière-plan (jamais pendant une saisie ou une fenêtre ouverte) ; vérification des mises à jour à chaque retour dans l'appli.
- Tests : test5 OK ; test15, 17, 20, 22, 23, 25, 26, 28, 29, 30 OK ; test31 10/10 ; nouveau test32 9/9 (vraie base) ; test9 OK (corrigé : B ouvre bien l'espace de A, le direct est vérifié : 1 paiement vu). Tests 17, 20, 23, 26 et 28 rendus utilisables sans proxy (comme test9). test17 et test23 ont besoin des clés chargées (`set -a; . ./.env; set +a`). Un espace "Copie GTP compta" laissé par test23 (planté faute de clés) a été supprimé (compte de test).
- En ligne (vérifié sur gestion-locative-sci.pages.dev).
- Pas vérifié : sur un vrai téléphone, l'ouverture sans connexion et l'installation automatique d'une nouvelle version (la 1re fois, l'ancienne version de l'appli doit d'abord se mettre à jour une fois).

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
