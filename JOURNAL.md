# Journal de bord — appli « Gestion locative »

Plusieurs sessions Claude (comptes différents) travaillent sur ce projet, **une à la fois**.
Règle pour chaque session :

1. **Au début** : `git pull origin ccr-6df8be48-11wmro`, lire `REPRISE.md` puis ce journal (surtout « À faire »).
2. **À la fin** : ajouter une entrée en haut de « Historique » (date, ce qui a été fait, ce qui reste, ce qui n'est pas vérifié), mettre à jour « À faire », puis `git add -A && git commit && git push origin ccr-6df8be48-11wmro`.
3. Toujours travailler sur la branche **`ccr-6df8be48-11wmro`** (c'est la branche de l'appli en ligne).
4. Si l'appli a été modifiée : `node tests/test5.js` (au minimum) puis `./deploy.sh`, et noter dans l'entrée si c'est en ligne.
5. Ne jamais mettre de clé dans Git : elles vont dans `.env` (ignoré par Git).

## À faire (priorités)

- [ ] **Banque en direct (Théo)** : application créée le 18/11. Reste : Réglages › Banque › Relier ma banque (connexion sur le site de la banque). Ancienne note : : Enable Banking, mode "restricted production". 1) https://enablebanking.com/sign-in/ (e-mail, lien reçu) ; 2) https://enablebanking.com/cp/applications › "Add a new application" : environnement Production, clé privée générée par défaut, nom "Gestion locative", URL de retour https://sci-gestion-locative.com/ › Register (un fichier .pem se télécharge, son nom = l'identifiant de l'application) ; 3) sur la page de l'application : "Link accounts" et relier le compte de la SCI ; 4) envoyer à Claude le contenu du .pem et l'identifiant. Ensuite (Claude, 1 session) : fonction serveur, choix de la banque dans l'appli, relevés lus dans les mêmes tables que Pennylane (le rapprochement des loyers marche tel quel). Limite : gratuit seulement pour les comptes que Théo relie lui-même ; pour les autres utilisateurs, contrat payant Enable Banking.

- [ ] **Boîte à documents (Théo, 2 min)** : activer Email Routing sur sci-gestion-locative.com et envoyer l'adresse catch-all au Worker "boite-documents" (étapes dans l'Historique du 18/11, "boîte à documents").

- [ ] **Partage de dossiers (Théo)** : partager "02 - GTP Invest" avec `lecture-dossiers@gestion-locative-drive.iam.gserviceaccount.com` (Lecteur), puis Docs › + Ajouter un dossier › C'est fait. Ensuite Docs › "Retirer cet accès" (lecture de tout le Drive, essai du 17/11).
- [ ] **Domaine sci-gestion-locative.com (Théo, ce soir)** : 1) Search Console › propriété "Domaine" `sci-gestion-locative.com` ; 2) client OAuth : ajouter les origines https://sci-gestion-locative.com et https://www.sci-gestion-locative.com ; 3) tester la connexion Google sur https://sci-gestion-locative.com ; 4) Branding : page d'accueil https://sci-gestion-locative.com/presentation, confidentialité https://sci-gestion-locative.com/confidentialite, domaine autorisé `sci-gestion-locative.com`, puis "J'ai corrigé les problèmes". Ensuite (Claude) : renvoyer automatiquement pages.dev vers le nouveau domaine, puis retirer pages.dev chez Google.
- [ ] **Google (Théo), dans cet ordre** : 1) https://console.cloud.google.com/auth/branding (nom, e-mail, page d'accueil, https://gestion-locative-sci.pages.dev/confidentialite, domaine autorisé `gestion-locative-sci.pages.dev`) ; 2) https://console.cloud.google.com/auth/audience › Publier ; 3) activer https://console.cloud.google.com/apis/library/gmail.googleapis.com et https://console.cloud.google.com/apis/library/picker.googleapis.com ; 4) dans l'appli : se connecter avec Google, brancher Gmail, Débrancher puis Connecter le Drive, "Choisir mes documents". Ensuite : retirer le code de connexion par e-mail (dernier envoi Brevo) et le crochet `envoyer_code_auth`.
- [ ] **Gmail (Théo)** : 1) activer l'API Gmail dans le projet Google Cloud (https://console.cloud.google.com/apis/library/gmail.googleapis.com) ; 2) Réglages › Envoi des e-mails › Continuer avec Google ; 3) supprimer l'ancien mot de passe d'application "Gestion SCI" (https://myaccount.google.com/apppasswords). Pour ouvrir l'appli aux inconnus : publier l'appli Google (https://console.cloud.google.com/auth/audience › Publier), sinon seuls les "utilisateurs test" peuvent brancher Gmail ou Drive.
- [ ] **CAF Margottet – Fravelle** : prévenir la CAF du changement de propriétaire (l'allocation de 612 € part peut-être encore chez M. Loslier) et vérifier le loyer de novembre.
- [ ] **Prêts GTP** : saisir le ou les prêts (Compta › Emprunts › + Prêt, ou importer le tableau de la banque), puis "Voir et ventiler" les échéances proposées ; vérifier les 8 "ECH PRET INT" d'environ 1 540 €.
- [ ] **Copie de sauvegarde** : Réglages › Sauvegarde et import › "M'envoyer une copie chaque semaine" (case "maintenant" cochée pour vérifier la réception et rouvrir le .txt).
- [ ] **Espace locataire** (fait le 18/11) : essayer avec un vrai locataire (fiche › Plus › Son espace locataire).
- [ ] **Drive** : sur ton téléphone, choisir tes dossiers (plusieurs possibles), relier chaque dossier de logement (Docs › Dossiers et logements), vérifier le 1er rangement automatique (Annuler si besoin).
- [ ] **DPE et risques** : sur chaque logement, "Retrouver le DPE" puis "État des risques" ; faire l'ERP officiel sur errial.georisques.gouv.fr avant le prochain bail.
- [ ] **Services payants** (Youtrust, GoCardless, Bridge/Powens, Stripe) : fiches dans l'Historique du 14/11 ; rien codé tant que Théo n'a pas ouvert de compte.
- [ ] **Notifications** : activer les alertes sur ton téléphone (Réglages › Notifications, appli installée) et faire l'essai.
- [ ] **Taxe foncière Agon 2026** : récupérer la page « détail par local » de l'avis n° 2650400237412 (impots.gouv › Espace professionnel › Consulter › Avis d'imposition), puis remplacer la répartition à parts égales (516,67 € par lot, ordures ménagères à 0) par les vrais montants. Antoine et Sofiane doivent leur part d'ordures ménagères.
- [ ] **Ordures ménagères Beauchamps 2026** : 133 € (41, Margottet – Fravelle) et 140 € (43, Steve) lus sur le décompte du notaire (scan peu lisible) : montants à confirmer (ils servent aussi au calcul mensuel 2027).
- [ ] **Connexion Google Drive** : codée, en ligne, clés Google posées le 13/11. Reste l'essai réel avec le compte Google de Théo, et vérifier si l'appli Google est publiée (sinon reconnexion tous les 7 jours). Ancienne note : le « cerveau » `analyserDrive()` (index.html) range les fichiers et propose ce qu'il faut compléter ; il marche déjà quand la liste du Drive est connue (`DOCS.fichiers`, version Claude). Reste à brancher la connexion Google (OAuth, lecture du Drive) dans la version installée : attend 3 infos du propriétaire (ID client OAuth, clé API, numéro du projet Google Cloud).
- [ ] **E-mail de Sofiane Hesry** : introuvable (ni Gmail, ni bail lisible). Sera gardé automatiquement à la 1re saisie dans un envoi.
- [ ] **Anciens locataires Lilou Douillard et Julie Sergent** (Tom Dogon fait le 14/11) : à créer dans l'historique du bon logement (fiche logement › + Ancien locataire, ou Docs › proposition "Ranger dans l'historique"). Ancienne note : **Anciens baux Lilou Douillard et Julie Sergent** (Drive, dossier « Loyers Bails Agon ») : savoir quel lot d'Agon, puis les ranger dans les documents du bon bien.
- [ ] **Avenants n° 1 Steve et Margottet** (ordures dans les charges dès janvier 2027) : enregistrés dans l'appli, à envoyer et faire signer.
- [ ] **Margottet – Fravelle** : loyer de novembre pas reçu (dû le 10/11).

## Feuille de route du 17/11 (comparaison Qalimo, Rentila, ImmobilierLoyer)

Page visuelle : https://claude.ai/artifact/VDxQf3ztq7bFiADKC77K6o. Devant les autres : SCI (associés, AG, 2072), IA (Drive, baux), DPE/risques. Manques : banque toutes banques, signature, espace locataire, quittance automatique, trésorerie.

Gratuit, dans l'ordre (une étape par session, tester puis mettre en ligne) :
1. ✅ (18/11) **Signature au doigt** (EDL, bail, avenant) : zone de signature sur l'écran pour bailleur et locataire, ajoutée au PDF (jsPDF addImage) avec date, heure, nom ; PDF signé rangé dans le logement.
2. ✅ (18/11) **Quittance automatique à réception du loyer** (Pennylane) : envoi seul ou après accord (choix dans Réglages).
3. ✅ (18/11) **Espace locataire simple** : lien privé par locataire (sans compte) : quittances, bail, ce qu'il doit, signaler un problème avec photo. 2 sessions.
4. ✅ (18/11) **IA lit tous les papiers** (taxe foncière, assurance, DPE, factures) : remplit montant, échéance, logement. Crédits "lectures de documents".
5. ✅ (18/11) **Trésorerie 12 mois** + alerte de seuil.
6. ✅ (18/11) **Activité entre associés** ("X a marqué le loyer payé").
7. ✅ (18/11) **Surveillance quotidienne** (GitHub Action) : alerte e-mail + évite la pause de la base gratuite.

Vague 2 (branchements et accès, 18/11) : ✅ relances automatiques J+3/J+8, ✅ agenda abonné, ✅ boîte à documents par e-mail (reste l'activation Cloudflare par Théo), ✅ import depuis un tableur. À faire ensuite, dans l'ordre :
8. **Assistant IA "Pose ta question"** (comme Rentila) : question libre, réponse avec les données de l'espace (dettes, échéances, baux) et les règles de la loi de 1989 ; quota à part (nouvelle colonne dans `ia_usage`).
9. ✅ (18/11) **Brancher l'appli sur Claude / ChatGPT (MCP)** (comme Rentila) : serveur MCP en fonction Supabase, lecture seule d'abord (loyers, retards, locataires, documents), lien secret par espace.
10. ✅ (18/11) **Tous mes espaces sur un écran** (SCI + nom propre).

Vague 4 — PRIORITÉ depuis le 18/11 (Théo : "une interface fluide, intuitive, qui sert vraiment à la gestion locative, pas à remplacer le comptable pour le moment") :
18. ✅ (18/11) Compta en 4 onglets (Résumé, Banque, Dépenses, Comptable), écrans plus propres (bouton "?" en haut, Réglages en 4 groupes, plus de clignotement, menu Plus, banque par pages).
19. ✅ (18/11) **Congé donné par le bailleur** (vente, reprise, motif sérieux) : lettre + date limite + offre de vente (Rentila : 30 courriers types).
20. ✅ (18/11) **Suivi des interventions** : demande du locataire → artisan prévenu, date, réglé, facture ; dans À faire jusqu'à la fin.
21. ✅ (18/11) **Candidatures en ligne** : lien pour déposer le dossier, pièces vérifiées, loyer < 1/3 des revenus (Rentila, Qalimo). Les candidats existent déjà par logement : à ouvrir aux candidats eux-mêmes.
22. **Tableau de bord par logement** : occupation, rentabilité (prix d'achat repris de l'acte par l'IA), prochain événement.

Vague 3 — EN PAUSE (plus de comptable, tout depuis la banque ; GTP est une SCI à l'IS) — dans l'ordre :
11. ✅ (18/11) **Chaque opération de banque classée** (entrées comprises : loyers, dépôts, apports d'associés), compteur "il reste N opérations à classer".
12. **Une facture pour chaque dépense** (boîte à documents + IA relient facture et paiement ; liste "pièces manquantes").
13. **Amortissements** par composants (terrain non amorti, gros œuvre, toiture, installations, agencements, frais d'achat, travaux d'amélioration) : dotations annuelles automatiques.
14. **Clôture** : ✅ (18/11) mois clôturés verrouillés. Reste : bilan, compte de résultat, IS (15 % / 25 %) et acomptes.
15. **Liasse 2065 + 2033 préremplies** (case par case) ; télétransmission via un partenaire agréé EDI à étudier (payant).
16. **AG d'approbation** : rapport de gestion + PV, signés au doigt.
17. **2026 en parallèle du comptable** pour comparer ; arrêt du comptable en 2027 si identique.
Repères : Indy SCI IS 24 à 32 € HT/mois, SCI AI 229 €/an (349 € avec validation par un expert-comptable).

Payant, seulement si les demandes d'intégration le justifient : Bridge/Powens (devis), Youtrust (104 €/mois), GoCardless (~2 €/loyer), Stripe (vente de l'appli). Fiches détaillées : Historique du 14/11, Partie 2 B.

## Historique

### 19/11/2026 — fermer en touchant à côté ; nouveautés discrètes
- Toute fenêtre se ferme en touchant à côté (comme la croix). Si un formulaire a été commencé : 1er toucher à côté = message "touche encore à côté pour fermer sans enregistrer", 2e = ferme. Glisser depuis l'intérieur ne ferme pas. Une confirmation fermée à côté = rien n'est fait. L'aperçu d'un document se ferme aussi (la protection "signature pas encore rangée" reste).
- Plus de bandeau de nouveautés sur l'accueil. Elles restent dans Réglages › Plus de réglages (pastille "🆕 N nouveautés") et en haut de la page "Ce que l'appli fait pour toi" (#aide).
- CLAUDE.md : `--annoncer` (notification à tous) seulement pour une grosse nouveauté, au plus une fois par semaine. "fermer-a-cote" ajoutée sans notification.
- Tests : test86 (nouveau, iPhone + ordinateur, 19 vérifications) OK ; test5, test84 OK. En ligne.

### 19/11/2026 — appli épurée pour l'iPhone (objectif : prêt lundi)
- Tour complet sur iPhone simulé (SE, 13, 13 Pro Max), avec un espace réel de test. Avant : accueil 3,5 écrans (2 bandeaux + guide + nouveautés + 5 tâches avant les loyers), À faire 11 écrans, Réglages 20 rubriques, aide 8 000 px.
- Accueil : les loyers du mois en premier, puis 3 tâches, puis le guide, puis les locataires ; cartes locataires à 2 boutons au plus (Étaler, Pas besoin, Autre montant restent dans la fiche) ; "espaces locataires" sous les locataires ; "Tous mes espaces" et "Nouveautés" en lignes discrètes ; lien "Tout ce que l'appli peut faire pour toi" en bas.
- Un seul bandeau en haut à la fois (mise à jour > lecture seule > Drive > exemple > installation) ; celui d'installation seulement sur l'accueil.
- À faire : les tâches du même genre (3 ou plus : quittances, impayés, régularisations…) regroupées sous une ligne repliée ; descriptions coupées à 2 lignes sur téléphone ("Pourquoi ?" garde le détail). 4 300 → 2 400 px.
- Réglages : À régler / L'essentiel / Automatique (+ "Sur ton téléphone" si pas installée) ; 10 rubriques rares dans "Plus de réglages" replié (ouvert tout seul si une rubrique est demandée). 3 100 → 2 000 px.
- Aide (#aide) devient "✨ Ce que l'appli fait pour toi" : vitrine en 4 thèmes, une tuile par fonction qui mène au bon endroit ; guide court ; lexique replié. Lien aussi dans la fenêtre du bouton "?".
- Carte des loyers compacte sur petit iPhone (tient en 1/3 d'écran).
- Tests : test5, test84, test26/34/38/40/41/58/64/67/81 OK, test51 OK au 2e essai. Échouaient déjà avant (pas liés) : test2 (délai), test4 (fichier jspdf de test manquant), test30 et test37 (sites externes bloqués ici), test39 (copie hebdo : bouton introuvable, à regarder). Rien ne dépasse en largeur sur iPhone SE et Pro Max (pages + fenêtres).
- En ligne, annoncé dans Quoi de neuf (appli-epuree). Pas vérifié sur un vrai iPhone (Safari) : seulement en simulation.

### 18/11/2026 — vidéo Google retirée par YouTube ; Gmail : erreur de branchement expliquée
- YouTube a retiré 2 vidéos de démo (17/11 et 18/11) pour "informations personnelles" (e-mails, adresses). Plan : compte Gmail dédié à la démo, espace "SCI Démo" avec données inventées, e-mail flouté dans YouTube Studio, vidéo "Non répertoriée". Brouillon de réponse à Google prêt dans Gmail, À NE PAS ENVOYER avant d'y mettre le nouveau lien.
- Page de confidentialité : drive.file (sélecteur Google) et lecture IA des fichiers choisis précisées pour Google.
- Branchement Gmail du compte de démo : rien enregistré (connexion à l'appli OK). Cause probable : case "Envoyer des e-mails" non cochée sur l'écran Google. L'erreur s'affichait dans un message de 3 s ; maintenant une fenêtre explique quoi faire avec "Réessayer" (le droit reçu est aussi vérifié avant d'appeler le serveur). En ligne.

### 18/11/2026 — logements remplis tout seuls, parcours d'un nouveau venu expliqué
- Nouveau logement : l'essentiel d'abord (adresse, nom, type, meublé, surface, pièces), le reste replié dans "➕ Plus d'infos". Adresse touchée dans la liste → l'appli cherche les DPE à cette adresse (base ADEME) et propose "touche le tien" : surface, classe, numéro, validité remplis en jaune. Nom proposé tout seul ("Appart Agon-Coutainville", numéroté si déjà pris).
- "📄 Remplir avec un document" (propriétaire, appli en ligne) : l'IA lit un DPE, bail, taxe foncière ou acte et remplit adresse, surface, pièces, DPE ; le document est rangé dans le logement à l'enregistrement. Fonction `ia` : le schéma "doc" renvoie aussi `surface` et `pieces` (déployée, version 12).
- Après création : "Et maintenant ?" (mettre le locataire avec le bail lu par l'IA, donner ses papiers, autre logement).
- Fiche d'un logement : carte "✨ Fiche remplie à X %" (adresse, DPE/surface, taxe foncière, risques, PNO, prix d'achat) avec le bouton qui remplit (souvent tout seul). Liste des biens : "N infos à compléter".
- Accueil d'un nouveau venu et page Biens vide : "Crée tes logements" avec 3 façons expliquées (Drive recommandé, adresse, tableur). Formulaire locataire : "Le plus rapide : donne le bail" expliqué.
- "Retrouver le DPE" sur la fiche remplit aussi la surface si elle manque. Un papier lu par l'IA depuis un logement change sa catégorie "Autre" en la bonne.
- Tests : test84 (nouveau, 37 vérifications, services publics simulés) OK ; test5, test40 OK ; test57 (vraie IA) 12 OK après remise à zéro du quota du compte de test ; test85 (nouveau, vraie IA : un DPE remplit adresse, surface 38 m², 2 pièces, DPE E) OK. test37 ne passe pas ici : le service d'adresses de l'État n'est pas joignable depuis la machine de test (pas lié à la modif).
- En ligne (https://sci-gestion-locative.com), annoncé dans le canal Quoi de neuf (logements-auto). 3 espaces "Test IA papiers" laissés par les tests (compte test-a) supprimés.
- Pas vérifié : la recherche de DPE sur un vrai téléphone avec la vraie base ADEME (simulée dans les tests, l'ADEME n'est pas joignable depuis la machine de test).

### 18/11/2026 — validation Google : où on en est ; page de confidentialité complétée
- Google a répondu le 17/11 (20 h 08 UTC) "[Action Needed] Your Google APIs Verification Request" (projet gestion-locative-514614, n° 502656965437) : liste de contrôle, il faut RÉPONDRE au mail pour que l'examen reprenne. Réponse en anglais proposée à Théo (pas envoyée : attend son accord ; brouillon Gmail possible).
- /confidentialite : section anglaise "Google user data — summary for Google reviewers" (scopes, accès, usage, transfert, protection, conservation/suppression, phrase Limited Use) + banque en direct (Enable Banking, DSP2, lecture seule). En ligne, vérifié.
- À vérifier par Théo : la vidéo montre l'écran d'autorisation en entier et l'e-mail dans "Envoyés" ; statut "En production" (https://console.cloud.google.com/auth/audience).
- Vraie appli : conseil Google Play d'abord (paquet TWA, 25 $ une fois ; compte personnel = test fermé 12 personnes × 14 jours, compte société avec D-U-N-S = non) ; App Store plus tard (99 $/an, notifications natives à adapter, risque de refus 4.2).

### 18/11/2026 — Réglages classés par importance ; banque "pourquoi et est-ce sûr" ; iPhone (champs)
- Réglages : "⚡ À régler en premier (N)" (La SCI incomplète, Banque, Google Drive, Envoi des e-mails pas encore faits, bordure orange), puis L'essentiel, Automatique, Ton appli, En plus, Zone sensible.
- Banque : bloc "🔒 Pourquoi brancher ta banque, et est-ce sûr ?" (`explicationBanque`) dans la fenêtre de connexion, Réglages › Banque et Compta › Banque (carte ouverte d'office, "Relier ma banque" proposé avant le relevé). Texte honnête : lecture seule, aucun virement possible, codes chez la banque, DSP2 / prestataire agréé, données visibles des seuls membres, ni consultées ni revendues, 180 jours, débranchable.
- iPhone (Safari seulement, `@supports (-webkit-touch-callout: none)`) : plus d'ombre intérieure des champs, dates alignées à gauche et pleine largeur, recherche non arrondie. Les autres "petits bugs" vus par Théo : en attente de captures.
- Tests : test83 4/4, test69 adapté aux 12 types d'alerte (11/11), 5, 67, 78, 80, 82. En ligne, annoncé.

### 18/11/2026 — SCI NIMAR (Max) : analyse IA ratée à cause du défaut "sous-dossiers"
- Analyse lancée à 20 h 39 (avant la correction) : l'IA a écrit "Le sous-dossier 10_Lots est vide, donc aucun dossier ne peut être relié à un seul logement" → aucun lien dossier ↔ bien, fichiers restés "pas encore rangés", pas de locataires proposés. Il lui reste 1 analyse aujourd'hui (2 par jour). À faire (Max) : mettre l'appli à jour, Docs › relancer l'analyse, valider les liens, puis "Créer depuis son bail" et "Lire et ranger". (Rendre l'analyse ratée : pas fait, demande l'accord de Théo.)

### 18/11/2026 — Drive en profondeur pour l'IA ; Réglages › Google Drive cohérent ; bilan IA visible (cas de Greg)
- L'IA ne voyait que les fichiers posés directement dans chaque dossier, et la liste était coupée à 400 dossiers par ordre alphabétique : un "Lot 1" rangé dans "Lot 1 › Bail" paraissait vide → elle demandait de ranger. Maintenant `donneesIA()` envoie aussi `total` (fichiers sous-dossiers compris) et des exemples pris dans les sous-dossiers ; tri : dossiers avec fichiers d'abord, les plus hauts en premier, 500 max ; consigne IA mise à jour (un dossier rangé en profondeur n'est pas vide, relier le plus haut suffit) ; plus de proposition pour un sous-dossier dont un parent est déjà relié au même logement. Serveur `partage` : 2 000 dossiers, 10 en parallèle, 110 s ; Docs prévient si le Drive est trop grand ("lecture incomplète").
- Réglages › Google Drive disait "Pas connecté" alors que des dossiers étaient partagés (il ne regardait que l'ancienne connexion Google) : affiche "✅ N dossiers partagés · X documents · lecture seule", la liste, "Voir mes documents" ; les fichiers un par un deviennent facultatifs.
- Régression corrigée (de la page Docs épurée) : après une analyse, le bilan de l'IA restait replié ; il reste ouvert tant qu'il y a quelque chose à faire (`iaAFaire()`).
- iPhone, tirer pour actualiser : position de défilement plus fiable, geste annulé par le système géré. Rappel : l'iPhone ne prend la nouvelle version qu'après avoir fermé puis rouvert l'appli (ou Réglages › Mettre à jour l'appli).
- Testé : test82 8/8, vraies analyses IA test48 16/16, test49 16/16, test52 12/12 (compteur IA du compte de test remis à zéro pour ça), test45/46/47/51, test80/81. En ligne, annoncé.

### 18/11/2026 — iPhone comme Android ; rouvrir sur la même page ; supprimer un bien (Max, SCI NIMAR)
- iPhone : bande vide sous les icônes du bas réduite (`--sab` = zone d'accueil − 16 px) et fond opaque ; barre du bas cachée pendant la saisie (clavier) ; `100dvh`. Tirer vers le bas pour actualiser, même geste sur iPhone et Android (roue, relit les données sans recharger : `rafraichirTout`, `overscroll-behavior` contient le geste natif).
- L'appli rouvre sur la dernière page (moins de 6 h) et le même onglet de Compta (`memoriserPage` / `restaurerPage`, jamais pour les liens locataire/candidat/partage).
- Supprimer un bien : fiche du bien › Plus › "🗑 Supprimer ce bien" (avant : caché en bas de "Modifier"), retour à la liste ; s'il a des locataires, l'appli explique quoi faire. Cas de Max : SCI NIMAR, 4 biens sans locataire, il est propriétaire → il peut maintenant les supprimer (ou Réglages › Zone sensible › Tout effacer pour tout refaire).
- iPhone : le partage vers l'appli et les raccourcis de l'icône n'existent pas (limite d'Apple) ; équivalent : la boîte à documents par e-mail.
- Testé : test80 8/8 (iPhone simulé), test81 8/8, + 5, 53, 56, 71, 73, 79. En ligne, annoncé dans le canal (notification).
- Pas vérifié : sur un vrai iPhone (pas de moteur Safari ici).

### 18/11/2026 — espaces de tous les locataires en un geste ; Partager vers l'appli ; raccourcis de l'icône
- Accueil › Locataires : carte "Aucun locataire n'a encore son espace" → "Créer les N espaces" (un lien par locataire actif), puis liste avec "📲 Envoyer" (message prêt, WhatsApp/SMS/e-mail, sinon copié) et "Envoyé le …" (`b.portailEnvoye`). "Plus tard" la masque. GTP : 5 locataires, aucun espace créé pour l'instant (à faire par Théo).
- Partager › Gestion locative (appli installée, Android) : `share_target` dans le manifeste (build.py), sw.js garde les fichiers (cache "partages", conservé aux mises à jour), l'appli les dépose dans la boîte à documents "À ranger" (dossier `partages/` du stockage) ; l'IA peut les lire et les ranger. La boîte montre "À ranger" même sans adresse e-mail créée.
- Raccourcis de l'icône (appui long) : "Photo d'une facture ou d'un document" (#ajouter-doc : photo réduite ou PDF → boîte), Loyers, À faire.
- Canal : 2 nouveautés publiées, 1 notification envoyée ("Partager vers l'appli") : 2 téléphones, réponse 200 — première vraie notification du canal.
- Testé : test79 10/10 (espaces, partage reçu par sw.js, photo), test5, 53, 56, 77. En ligne (manifeste vérifié en ligne).
- Pas vérifié : le partage depuis un vrai Android (iPhone ne propose pas le partage vers une appli web), la réception de la notification sur les téléphones.

### 18/11/2026 — canal "🆕 Quoi de neuf"
- Table `nouveautes` (supabase/nouveautes.sql), lue par tous les utilisateurs connectés. Page `#nouveautes` (groupée par jour), bandeau sur l'accueil tant qu'il y a du neuf pas vu sur ce téléphone, rubrique "🆕 Quoi de neuf" dans Réglages › Ton appli, type de notification "Nouveautés de l'appli" (push oui, mail non).
- Publier : `python3 tests/nouveaute.py ID "émoji" "Titre" "Phrase simple" "#page" --annoncer` (notifier, action `nouveaute`, une seule fois par ID grâce à `annonce_le`). Règle ajoutée dans CLAUDE.md.
- Rempli avec les 10 nouveautés du 18/11, SANS notification (annonce_le posé). La prochaine nouveauté sera la première notifiée.
- Testé : test78 8/8, test5. En ligne. Pas vérifié : la réception réelle de la notification sur un téléphone (aucune envoyée pour l'instant).

### 18/11/2026 — le locataire dépose son attestation d'assurance ; listes "Choisir…"
- Espace locataire : carte "🛡️ Mon assurance habitation" (encadrée tant qu'elle manque) : photo ou PDF envoyé par la fonction `locataire` (action "deposer", table `depots_locataire`, supabase/depots_locataire.sql), notification "🛡️ X a envoyé son attestation" (type `depot`). Le portail publie la date de fin connue.
- Propriétaire : le dépôt arrive tout seul dans les documents du logement (catégorie Locataire), puis À faire urgent "🛡️ Jean a envoyé son attestation d'assurance" : "🤖 Lire la date" (IA), "Voir", "C'est bon" (date de fin, sans redemander de ranger). La tâche "Attestation d'assurance habitation" propose d'abord "📲 Lui demander (son espace)" (espace créé tout seul, message prêt) et s'efface pendant qu'une attestation attend.
- Listes de classement (Compta) : "— c'est quoi ? —" et "— choisis la catégorie —" remplacés par "Choisir…".
- Testé : test77 12/12 ; test5, 56, 72, 76 OK. En ligne.

### 18/11/2026 — signature à distance, gratuite (idée n°1 de la liste "branchements et praticité")
- Dans le panneau "✍️ Signer" de tout document à signer (bail, avenant, état des lieux) : "📲 Lui faire signer à distance". Le document (avec la signature du bailleur s'il a signé) part dans l'espace locataire (créé tout seul s'il n'existe pas), rubrique "✍️ À signer" ; message prêt à envoyer (WhatsApp, SMS, e-mail).
- Le locataire lit le document, signe avec le doigt, coche "lu et approuvé". Preuve gardée : empreinte SHA-256 du document, date, heure, IP, appareil (table `signatures_distance`, supabase/signature_distance.sql ; fonction `locataire` action "signer"). Un membre ne peut changer que le statut (droits par colonne) ; pas de double signature ; rien de lisible sans lien.
- Propriétaire : notification "✍️ X a signé", À faire urgent "✍️ Jean a signé « Avenant n° 1 »" → le PDF s'ouvre avec les deux signatures ("Signé à distance (espace locataire) par … · réf. empreinte") → "Ranger le PDF signé". En attente depuis 3 jours : rappel ; "Retirer" possible.
- Écrans locataire et candidat passés au vouvoiement (comme l'espace locataire).
- Testé : test76 16/16 (vrai serveur, deux navigateurs), test75 19/19, test56 22/22, test5, test53. En ligne.
- Idées suivantes (même liste) : 2) l'IA lit le décompte du syndic → régularisation des charges ; 3) DossierFacile accepté dans les candidatures ; 4) avis d'échéance automatique ; 5) l'IA prépare les réponses aux locataires.

### 18/11/2026 — candidatures en ligne ; Docs épurée ; Compta sans chevauchement
- Candidatures (Vague 4, étape 21) : fiche logement › Relouer › "🔗 Recevoir les dossiers en ligne" → lien public `#candidature=JETON` (tables `annonces_publiques`, `candidatures` : supabase/candidature.sql ; fonction `candidature`, verify_jwt=false). Le candidat voit l'annonce (sans l'adresse exacte), dépose nom, contact, situation, revenus, garantie, message et pièces (autorisées par la loi, 5 Mo chacune, photos réduites), accord obligatoire. Notification "🙋 Nouvelle candidature" (type `candidature` dans notifier). Propriétaire : À faire "🙋 Candidature de X · logement · taux d'effort", dossier (pièces en liens temporaires, ce qui manque), "➕ Garder" (ajouté aux candidats du logement, avec ses pièces) ou "Pas retenu" (pièces effacées). L'annonce se met à jour toute seule ; lien désactivable.
- Docs (captures de Théo) : vue d'ensemble = recherche + tuiles "Par logement" (+ "Pas encore rangés", "Tout le Drive") + 5 derniers ajoutés ; la liste complète n'apparaît que sur demande ou en cherchant. Drive avant la boîte à documents ; "un par un", ".zip" et "ailleurs" rangés dans "Plus" ; adresse de la boîte sur une ligne, explication repliée ; carte "Ton Drive est à jour" retirée ; bilan de l'IA replié sur une ligne. Page : plus de 10 écrans → 2.
- Compta : les cartes d'un onglet se chevauchaient (pas d'espace entre elles) : corrigé.
- Testé : test75 19/19 (candidatures, vrai serveur), test45, 46, 47, 51 (adaptés au menu Plus), 5, 43, 56, 73. Non vérifiables aujourd'hui : test48/49/52 (crédits IA du compte de test épuisés pour la journée), test57/62/65 (déjà en échec avant, services extérieurs). 11 espaces de test oubliés supprimés (GTP et NIMAR intacts). En ligne.

### 18/11/2026 — congé donné par le bailleur (Vague 4, étape 19)
- Fiche du locataire › Plus › "📤 Lui donner congé (vente, reprise)", et bouton "📤 Préparer un congé" sur la tâche "Fin de période du bail" tant qu'il est temps.
- Calcul : fin du bail (période de 3 ou 6 ans selon SCI familiale / non familiale / perso, 1 an meublé), date limite = 6 mois avant (vide) ou 3 mois (meublé) ; si c'est trop tard, l'appli le dit et prend la fin suivante. Bail mobilité / étudiant : pas de congé (message).
- Trois motifs : vente (prix obligatoire ; offre au locataire en vide, art. 15-II), reprise (bénéficiaire, lien, adresse, justification obligatoire ; refusée pour une SCI non familiale), motif légitime et sérieux (faits). Lettre art. 15 (vide) ou 25-8 (meublé), notice d'information mentionnée pour vente/reprise en vide (lien Legifrance JORFTEXT000036236664), conseils d'envoi (recommandé AR, commissaire de justice, main propre), avertissement locataire protégé (+65 ans). Congé noté sur le bail (`b.conge`).
- Testé : `tests/test74.js` 14/14 ; pas de régression : test5, 56, 73. En ligne.
- Pas fait : la notice officielle n'est pas générée dans le PDF (lien vers Legifrance à imprimer et joindre).

### 18/11/2026 — suivi des interventions (Vague 4, étape 20)
- Demande du locataire (À faire › Voir) : bouton "🛠 En faire une intervention" → fiche pré-remplie (texte, "Signalé par…"), artisan choisi dans le carnet d'adresses (Réglages › La SCI) avec son e-mail rempli tout seul, statut (À organiser / Artisan prévu / En cours / Fini), date de passage.
- À faire : une ligne "🛠 Fuite… · Studio" par intervention pas finie (la demande n'apparaît plus en double) ; passage dépassé → "c'est fini ?" avec "✓ C'est fini" ; "À organiser" depuis plus de 14 jours → "relancer l'artisan ?".
- Dans la fiche : "📲 Prévenir l'artisan" (adresse, locataire et son téléphone, problème) et "📲 Prévenir le locataire" (date de passage), par le partage du téléphone (WhatsApp, SMS, e-mail) : rien ne part sans toi.
- Fini (+ facture) : dépense en compta, demande réglée, le locataire voit "✓ Réglé". Avant ça, son espace montre "🛠 Pris en charge / Artisan prévu · passage prévu le …".
- Carte du logement renommée "🛠 Travaux et interventions".
- Testé : `tests/test73.js` 16/16 (parcours complet, vrai serveur, vrai espace locataire) ; pas de régression : test5, 56, 72. En ligne.
- Pas vérifié : le partage sur un vrai téléphone (WhatsApp/SMS).

### 18/11/2026 — appli plus fluide (demande de Théo : la compta n'est pas la priorité)
- Compta en 4 onglets (`view.comptaOnglet` : resume, banque, depenses, comptable). Hauteur sur téléphone : 7 249 px → 2 112 px. Les liens vers Compta ouvrent le bon onglet (banque-mini, trésorerie, "Voir les opérations", sorties à mettre en compta).
- Tâche "N opérations de la banque à classer" retirée de À faire (pas la priorité) ; le compteur reste dans l'onglet Comptable, sans pastille.
- Bouton "?" (souci / idée) déplacé dans la barre du haut : il cachait des montants sur tous les écrans. "Changer d'espace" → "Changer ▾" (tient sur une ligne).
- Réglages rangés en 4 groupes : Ta SCI / Ce que l'appli fait pour toi / Branchements / Ton appli.
- Bail : "Fin de période du bail" ne dit plus "il faut l'envoyer avant le 9 juillet 2026" quand la date est passée.
- Tests adaptés aux onglets (test23, 42, 58, 71, 72) et passés : 5, 17, 23, 26, 42, 53, 58, 67, 70, 71, 72. Hors service avant ce changement, pour une autre raison : test2, 4, 30 (anciens tests en fichier local / paquet jsPDF absent). En ligne.
- Feuille de route : nouvelle Vague 4 (gestion locative fluide), Vague 3 compta en pause.

### 18/11/2026 — chaque opération de la banque a sa place ; affichage Compta réparé
- Compta : carte compteur "🧮 Il reste N opérations à classer" (barre, %), boutons vers les entrées ou les dépenses ; tâche "🧮 N opérations de la banque à classer" dans À faire (propriétaire).
- Nouvelle carte "💶 Ranger tes entrées d'argent" (comme les dépenses) : l'appli devine loyer d'un locataire (même avant le suivi), Airbnb/Booking, apport d'un associé (nom dans le libellé, choix "Apport de X"), déblocage de prêt, dépôt de garantie, remboursement/avoir, CAF ; retient les corrections (`S.sci.reglesEntrees`). Classement gardé dans `S.banqueVus[tx] = { e, qui }` : ne crée ni loyer ni dépense. Sur les données GTP : 28 entrées devinées sur 31.
- Affichage : plus de clignotement au rechargement (banque et associés gardés sur le téléphone : `lireCache`/`ecrireCache`) ; menu "Plus" qui sortait de l'écran à gauche (s'aligne tout seul) ; opérations bancaires par pages de 8 avec filtre Tout / Entrées / Sorties.
- Testé : `tests/test72.js` 14/14 ; reproductions sur une copie privée des données GTP (supprimée ensuite, GTP intact : 302 lignes) ; pas de régression (test5, 53, 67, 70, 71). En ligne.
- Pas vérifié : l'affichage sur les téléphones de Théo et Gab.

### 18/11/2026 — mois clôturés (verrou)
- Compta › carte "🔒 Mois clôturés" (après "Ranger tes dépenses") : le propriétaire clôture mois par mois ("Clôturer aussi novembre 2026") ou rouvre le dernier ("Rouvrir octobre 2026"). Avant de clôturer, l'appli prévient s'il reste des dépenses de la banque pas rangées ou des entrées pas reliées à un loyer.
- Le mois compte d'après la DATE de l'opération (un loyer d'octobre payé le 3/11 compte en novembre : toujours possible à noter).
- Double verrou : appli (`garderClotures()` dans `save()`, remet l'affichage et prévient) + serveur (`supabase/cloture.sql` : colonne `espaces.cloture_jusqua`, RPC `cloturer` réservée au propriétaire et seulement pour un mois terminé, déclencheur `a_docs_cloture` qui ignore toute écriture paiements/dépenses d'un mois clôturé, journal `clotures_journal`). Le pointage automatique de la banque saute les mois clôturés ; le connecteur Claude refuse une dépense dans un mois clôturé (fonction mcp redéployée).
- Correction technique en SQL malgré la clôture : `set app.cloture_off = '1'` dans la même session.
- Testé : `tests/test71.js` 18/18 (appli, écriture directe sur le serveur, pointage auto, mois en cours refusé, non-propriétaire refusé, réouverture, suppression d'un espace clôturé). Pas de régression : test5, 53, 55, 56, 59, 67, 68, 70. En ligne.
- Pas fait : GTP n'a encore aucun mois clôturé (c'est à Théo de le faire, quand octobre est vérifié).

### 18/11/2026 — "qui a fait quoi" : la personne OU l'appli toute seule
- Théo : l'historique disait "Gab a supprimé…" alors que c'était l'appli, toute seule, sur le téléphone de Gab. Corrigé : l'appli signale ses écritures automatiques (en-tête `x-auto` : pointage des virements, quittance automatique, indice IRL ; `saveAuto()`), y compris celles parties plus tard de la file hors-ligne. Le serveur le note (`docs.auto`, `docs_historique.auto`, `docs_supprimes.auto`, `supabase/auto.sql`).
- Affichage : "🤖 L'appli (automatiquement, sur le téléphone de Gab)" dans l'historique et l'activité ; "🛠️ Correction technique" pour les corrections faites directement sur le serveur. L'incident de 13 h 50 est re-marqué "automatique".
- Tests : test70 (vrai navigateur, vraie base : le signal passe, main vs automatique, historique) 6/6 ; test5, test53, test55, test56, test59, test67 OK. En ligne.

### 18/11/2026 — incident GTP : loyers de novembre disparus (bug de l'appli), réparé ; plus de suppression automatique ; historique et corbeille
- **Ce qui s'est passé** (prouvé par l'historique des suppressions) : avec la banque directe ET Pennylane branchés, une ancienne version de l'appli encore ouverte a pris les virements vus par Pennylane pour de nouveaux loyers et les a imputés sur décembre (Emma 600, Antoine 500, Sofiane 750). À 13 h 50, la nouvelle version, ouverte sur le téléphone de Gab, a vu le doublon et a supprimé le MAUVAIS côté (les vrais paiements de novembre). Gab n'a rien fait de travers ; Théo non plus. Rien n'a été écrit dans Pennylane (l'appli n'y fait que lire).
- **Réparé** : les 3 paiements de novembre restaurés tels quels, les 3 doublons de décembre retirés (gardés dans l'historique). Novembre : Emma 600, Antoine 500, Sofiane 750, Godefroy 200.
- **Pour que ça ne revienne pas** :
  - l'appli ne supprime plus JAMAIS de paiement toute seule : un paiement peut-être compté deux fois devient une tâche urgente "⚠️ Paiement peut-être compté deux fois" avec "Garder novembre / Garder décembre / Ce sont 2 paiements" (l'autre va dans l'historique, restaurable) ;
  - quand la banque directe est branchée, les opérations Pennylane ne sont plus lisibles directement (règles du serveur) : une vieille version encore ouverte ne peut plus les recompter ; la comparaison les lit par la fonction protégée `banque_pennylane_comparaison` (`supabase/banque_protection.sql`).
- **Historique et corbeille** (Réglages › ♻️, page `#historique`, lien aussi depuis l'activité) : toutes les modifications et suppressions des paiements, dépenses, locataires, logements, documents, taxes, relances, rappels, états des lieux, prêts sont gardées 60 jours par le serveur (`docs_historique`, déclencheur `docs_historiser`) avec qui et quand, et ce qui a changé (ex. "novembre → décembre") ; "♻️ Restaurer" ou "↩️ Revenir à avant" en un geste (annulable).
- Tests : test67 réécrit (scénario de l'incident : rien supprimé tout seul, tâche, "Garder novembre", historique, Restaurer) 16/16 ; test5, test53, test55, test59, test66 OK. En ligne.

### 18/11/2026 — notifications complètes ; vrais logos et émojis dans les Réglages
- Pictos des Réglages : vrais logos Google Drive et Gmail (SVG), vrais émojis en couleur pour toutes les rubriques (plus de remplacement par des icônes grises dans `.rgl-ico`, `.rgl-i`, `.notif-*`), pastilles teintées gardées. Aide : 💬.
- **Notifications** (Réglages › Notifications) : bandeau "📱 Ce téléphone reçoit / ne reçoit pas les alertes" (Activer, Essai, Couper) ; raccourcis ✅ Tout / ⭐ L'essentiel / 🔕 Rien ; tableau de 8 types × 📱 téléphone / ✉️ e-mail (interrupteurs) : 💶 loyer reçu, ⏰ loyer en retard, 🔁 relance automatique envoyée, 🔧 problème signalé par un locataire, 📨 document reçu dans la boîte, 📊 point du mois, 🏦 banque à vérifier, 🛡️ rappels et échéances. Enregistré par personne (`notif_prefs.types`, `supabase/notif_types.sql`) ; résumé de la rubrique "N alertes sur 8 · téléphone activé ou non".
- Serveur `notifier` : chaque envoi respecte le type et le canal de chaque membre (`veutDe`, `alerter` ; e-mail depuis le Gmail de la personne, sinon celui du propriétaire). Nouveaux : banque à vérifier (accord qui finit dans 15, 7, 1 jour ; banque ou Pennylane en erreur) au propriétaire ; rappels du jour ; assurance d'un locataire qui finit dans 30 jours ou aujourd'hui. "Essai" envoie maintenant une vraie alerte d'essai. Mode "à blanc" (clé de la tâche + `aBlanc`) : toute la tournée calculée, rien envoyé ni noté — tournée à blanc OK.
- Tests : test69 11/11 (interrupteurs, enregistrement, rechargement, raccourcis) ; test5, test53, test56, test60, test62 OK. En ligne.
- Pas vérifié : la réception réelle des nouvelles alertes sur un téléphone (première tournée : demain 8 h).

### 18/11/2026 — ranger l'appli avec Claude (connecteur en écriture, sur autorisation)
- Demande de Théo : que chaque utilisateur branche SON Claude et range son espace avec lui (documents, logements…), sans que Claude voie comment l'appli est faite. Claude ne reçoit que des outils décrits en français et les données de l'espace, jamais le code ni la base (vérifié : rien sur la fabrication dans les consignes ni la liste des outils).
- Réglages › Brancher sur Claude : interrupteur "🧹 Autoriser Claude à ranger avec moi" (coupé par défaut, propriétaire seulement : RPC `connecteur_ecriture`, colonne `ecriture`, les éditeurs ne peuvent plus changer que les chiffres publiés ; `supabase/connecteur_ecriture.sql`). Une fois autorisé : message tout prêt à coller dans Claude ("Range mon appli… montre-moi d'abord ton plan… attends mon OK").
- Fonction `mcp` : 6 outils d'écriture en plus des 9 de lecture (seulement si autorisé) : creer_logement, creer_locataire (suivi des loyers à partir du prochain loyer à payer), ajouter_document (lien Drive ou https, catégorie, locataire), ranger_document (documents "à ranger"), ajouter_depense, ajouter_rappel. Logement et locataire trouvés par leur nom (ou une partie), refus clair si ambigu ou inconnu ; pas de doublon (logement, locataire, même lien, même dépense). Aucun outil pour supprimer, payer ou envoyer. Invite MCP "ranger_mon_appli". Consigne à Claude : montrer son plan et attendre l'accord.
- Ce que Claude crée arrive en direct dans l'appli (marqué `parClaude`) et s'affiche sur l'accueil ("🤖 Ce que Claude a rangé", ou dans l'activité des associés). Confidentialité complétée.
- Tests : test68 (vraie base, vraie fonction, appels comme Claude) 23/23 ; test5, test53, test59, test65 OK. En ligne.
- Pas vérifié : une vraie séance de rangement dans claude.ai avec le Drive de Théo.

### 18/11/2026 — Compta : "Ranger tes dépenses" expliqué et regroupé ; couleurs des Réglages
- Retour de Théo sur "37 sorties d'argent à mettre en compta" : incompréhensible (quoi cocher, que fait le bouton, trop de lignes). La carte devient "🧾 Ranger tes dépenses de 2026" avec une explication en 3 questions (C'est quoi ? À quoi ça sert ? Que fait le bouton ? — rien ne change à la banque ni à Pennylane, annulable). Les lignes sont **regroupées par catégorie** (repliées ; "À classer" ouvert et en orange en premier), avec "Ranger ces N" par groupe et "Tout ranger" ; "Ignorer" devient "Pas une dépense" ; avec Pennylane branché : "Masquer : mon comptable s'en occupe" (réaffichable).
- Correction de classement : "ECH PRET INT" (≈ 1 540 €) = échéance complète de prêt, plus "Intérêts d'emprunt" (ça gonflait les intérêts déductibles) → "Échéance de prêt (capital + intérêts, à ventiler)".
- Réglages : chaque rubrique a sa couleur (pastille teintée et pictogramme de la même couleur, version sombre adaptée), à la demande de Théo ("je veux de la vie").
- Tests : test5, test53, test58, test64, test67 OK ; captures clair et sombre vérifiées. En ligne.

### 18/11/2026 — Pennylane rebranché (jeton de Théo accepté), comparaison réelle
- Demande de Théo : accepter son jeton même s'il n'est pas en lecture seule, à condition que l'appli ne fasse rien chez Pennylane. Vérifié dans le code et sur le serveur : l'appli n'appelle Pennylane qu'en lecture (GET sur /me, /bank_accounts, /transactions, rien d'autre) et le jeton reste dans le coffre du serveur. `banque_brancher` n'exige plus la lecture seule (`supabase/pennylane_tout_jeton.sql`) ; l'assistant conseille toujours la lecture seule mais dit que l'appli ne fait que lire.
- Jeton de Théo (celui du `.env`, valide ; droits : lecture + quelques droits d'écriture que l'appli n'utilise jamais) branché sur GTP INVEST : 200 opérations Pennylane relues.
- **Comparaison réelle** : soldes identiques (18 897,02 € à la banque et dans Pennylane) ; du 28/07 au 13/11/2026, 67 opérations identiques, **aucun décalage**.
- test5, test67 OK. En ligne.

### 18/11/2026 — banque directe ET Pennylane ensemble, comparaison, doublons réparés
- Théo a relié sa banque (Crédit Mutuel, compte GTP INVEST …0250, accord jusqu'au 17/05/2027, 73 opérations lues). Deux erreurs de ma part : (1) relier la banque effaçait le jeton Pennylane (choix "remplace Pennylane") ; (2) le pointage a recompté 4 virements de novembre déjà pointés via Pennylane (Emma 600, Antoine 500, Sofiane 750 imputés sur décembre, Godefroy 200 en double). Aucune quittance ni relance n'est partie à cause d'eux.
- Réparé sur le serveur : les 4 doublons supprimés, les 4 paiements d'origine reliés au virement vu par la banque (`tx`), l'ancien gardé (`txAutre`).
- **Les deux sources ensemble** (`supabase/banque_deux.sql`) : colonne `source` sur `banque` et `banque_comptes` ; `banque_liens` = Pennylane seulement ; `banque_directe` garde sa dernière lecture et son erreur. Débrancher l'une n'efface plus l'autre. La banque directe est la référence pour pointer les loyers et la trésorerie ; Pennylane sert à comparer. Notifications de virement : une seule source (pas de doublon).
- **Jamais deux fois le même virement** : `dedoublonnerPaiements` (un paiement créé depuis la source de référence qui double un paiement relié à l'autre source, même locataire, même montant, à 12 jours près, est retiré et l'ancien est relié) ; le pointage relie aussi un virement à un paiement déjà relié à l'autre source au lieu d'en créer un.
- **Comparaison** (Réglages › Banque, et tâche "🔎 N décalages entre ta banque et Pennylane") : rapprochement à 7 jours près sur tout l'historique, décalages comptés seulement sur la période commune (sans les 3 derniers jours, Pennylane étant en retard) : "Seulement à la banque", "Seulement dans Pennylane", soldes des deux côtés.
- Réglages › Banque : deux blocs (🏦 Ta banque en direct · référence ; 📒 Pennylane · pour comparer) et le bloc de comparaison ; résumé "Banque en direct + Pennylane · ⚠️ N décalages".
- Tests : test67 (vraie base, deux sources insérées, doublon de ce matin reproduit) 13/13 ; test5, test53, test55, test58, test66 OK. En ligne.
- **Reste pour Théo** : rebrancher Pennylane (Réglages › Banque › Brancher Pennylane, jeton en lecture seule). Pas vérifié : la comparaison avec ses vraies données (en attente du jeton).

### 18/11/2026 — Réglages : tuiles Aide / Un souci / Une idée
- Demande de Théo (capture) : les 3 boutons du haut des Réglages manquaient de contours. Remplacés par 3 tuiles blanches avec bord, ombre et coins arrondis : icône dans une pastille de couleur (vert, rouge, jaune), titre ("Aide", "Un souci" au lieu de "Un problème" qui passait sur 2 lignes, "Une idée") et sous-titre. Alignées en haut ; une règle générale des boutons écrasait leur marge (corrigé avec une règle plus précise). Clair et sombre vérifiés (capture tests/shots58/reglages-tuiles.png). En ligne.
- Le connecteur Claude ajouté par Théo dans claude.ai fonctionne (outils "Gestion locative" visibles côté Claude).

### 18/11/2026 — banque en direct (Enable Banking)
- Théo a créé l'application Enable Banking "Gestion locative" (production, lecture des comptes, active ; retour https://sci-gestion-locative.com/). Identifiant `ce885f55-e7cd-427d-95c6-1e41589ab36a`, clé privée dans `.env` (`ENABLEBANKING_APP_ID`, `ENABLEBANKING_KEY`) et en secrets Supabase. Hôte api.enablebanking.com ajouté au réseau de la session.
- Serveur : table `banque_directe` (`supabase/banque_directe.sql`) ; fonction `banque-directe` : `banques` (132 banques françaises), `connecter` (adresse d'accord officielle, compte pro ou perso, accord jusqu'à 180 jours), `valider` (retour de la banque, session, comptes), `actualiser` (au plus toutes les 6 h : les banques limitent à 4 lectures par jour), `debrancher` (retire l'accès chez la banque), `toutes` (tâche planifiée `banque-directe` toutes les 6 h, clé de la tâche du matin). Soldes et opérations (120 jours, nom du payeur + libellé) rangés dans `banque`, `banque_comptes`, `banque_liens` (source `enablebanking`) : pointage des loyers, quittances automatiques et trésorerie marchent tels quels. Relier sa banque remplace Pennylane pour cet espace (`banque_vider_pennylane`).
- Appli : Réglages › Banque › "🏦 Relier ma banque" (aussi proposé quand Pennylane est branché) : recherche de la banque (sans accents), type de compte (pro pour une SCI), départ vers la banque ; au retour, l'adresse est nettoyée avant tout, puis "✅ Ta banque est reliée · N comptes · N opérations". Annulation ou faux retour : message clair. "↻ Relire maintenant", "Débrancher". Tâche "Renouvelle l'accès à ta banque" 15 jours avant la fin de l'accord, ou si la banque ne répond plus.
- Tests : test66 (vrai Enable Banking jusqu'à la page d'accord de la banque, sans codes bancaires) 12/12 ; test5, test53, test58 OK. En ligne.
- Pas vérifié : la lecture de vrais soldes et opérations (il faut que Théo se connecte à sa banque) ; le format exact des libellés de sa banque pour reconnaître les locataires.

### 18/11/2026 — connecteur Claude : adresse sur le domaine de l'appli
- Essai de Théo dans claude.ai : "Connexion requise" puis "Impossible de s'inscrire auprès du service de connexion". Cause : à l'adresse Supabase, la recherche OAuth de Claude (`/.well-known/oauth-protected-resource/functions/v1/mcp/…`) reçoit un 401 de Supabase ("No API key"), Claude croit qu'il faut un identifiant.
- Correction : le connecteur est servi sur https://sci-gestion-locative.com/mcp/JETON (Cloudflare Pages Functions, dossier `functions/` : `mcp/[[chemin]].js` relaie vers la fonction Supabase `mcp` ; `.well-known/[[chemin]].js` répond 404 propre). Le lien affiché dans l'appli est le nouveau ; le jeton de Théo reste valable.
- Vérifié : découverte OAuth → 404 JSON, GET → 405, faux lien → 404, vrai lien de Théo → initialize OK et 9 outils avec la bibliothèque officielle MCP. test65 OK. En ligne.
- Pas vérifié : l'ajout dans claude.ai avec la nouvelle adresse (Théo).

### 18/11/2026 — brancher l'appli sur Claude (connecteur MCP)
- Réglages › "🤖 Brancher sur Claude" (propriétaire) : un lien secret par espace (`supabase/connecteur.sql`, table `connecteurs`, empreinte du jeton seulement), servi par la fonction `mcp` (protocole MCP en HTTP, lecture seule). Étapes affichées : claude.ai › Paramètres › Connecteurs › Ajouter un connecteur personnalisé (nom, URL), puis l'activer dans une conversation.
- 9 outils : résumé du mois, locataires (avec recherche par nom et mois impayés), logements, impayés, à faire, échéances 90 jours, trésorerie, compta de l'année, liste des documents (sans contenu). Aucun outil d'écriture.
- L'appli republie les chiffres à chaque modification (si changés). "Désactiver ce lien" coupe tout accès. Confidentialité complétée.
- Tests : test65 (vraie base, vraie fonction) 17/17 ; vérifié aussi avec la bibliothèque officielle MCP (`@modelcontextprotocol/sdk` 1.17.0, transport HTTP) : connexion, liste des outils, appels. test5, test53, test64 OK. En ligne.
- Pas vérifié : l'ajout réel dans claude.ai (à faire par Théo, 1 minute).

### 18/11/2026 — tous mes espaces sur un écran, prochaines sorties, défaut de suppression corrigé
- **Tous mes espaces** (page `#tous`, carte sur l'accueil et bouton dans "Mes espaces" dès 2 espaces) : en haut, loyers reçus du mois sur tous les espaces (barre), montant en retard, tâches urgentes, logements et quittances à envoyer ; puis une carte par espace (ce mois-ci, retards par locataire, 3 urgences, "✓ Rien d'urgent", Ouvrir), les espaces avec quelque chose à faire en premier. Les autres espaces sont lus en entier (hors documents) et calculés avec les mêmes règles que l'appli.
- **Prochaines sorties** (Réglages › 🚀, page `#bientot`) : assistant IA, banque en direct, signature à distance, prélèvement, recommandé, App Store, déclarations préremplies ; "👍 Ça m'intéresse" (table `envies`, `supabase/envies.sql`, nombre d'intéressés par fonction via `envies_compte`), classées par nombre d'intéressés.
- **Défaut grave corrigé** (introduit à l'étape "qui a fait quoi") : le déclencheur qui garde les suppressions bloquait la suppression d'un espace entier (et donc "Supprimer mon compte"). Il ignore maintenant les suppressions en cascade. Vérifié : suppression d'espaces OK. Espaces de test oubliés du compte de test supprimés.
- Tests : test64 (vraie base, 2 espaces) 12/12 ; test5, test53, test59 OK. En ligne.

### 18/11/2026 — importer depuis un tableur (Excel, export Rentila / autre appli)
- Biens › "📊 Depuis un tableur" (propriétaire) : .xlsx, .xls, .ods (lus avec SheetJS 0.18.5 depuis cdnjs, toutes les feuilles) ou .csv. L'IA (`ia` action `tableur`, 1 lecture de document) comprend les colonnes, garde seulement les locataires ACTUELS, ignore totaux, encaissements et anciens, ne recrée pas un logement déjà là.
- Fenêtre "Ce que l'IA a trouvé" : bilan chiffré, remarques de l'IA, tout est modifiable (logements : nom, adresse, type, vide/meublée ; locataires : nom, logement y compris 🆕, loyer, charges, jour, entrée, e-mail, téléphone), décocher = ne pas créer.
- Défaut évité en testant : le loyer du mois déjà passé était compté comme impayé (et les relances automatiques seraient parties). Le suivi commence au prochain loyer à payer.
- Tests : test63 (vrai fichier Excel à 2 feuilles, vraie IA, 9 s) 9/9 ; test5, test53 OK. En ligne.

### 18/11/2026 — boîte à documents par e-mail
- Docs › "📨 Ta boîte à documents" › "Créer mon adresse" : une adresse par espace (ex. gtp-invest-xxxxx@sci-gestion-locative.com, table `boites`, `supabase/boite.sql`). On y transfère factures, avis, attestations : les pièces jointes PDF et photos arrivent dans "À ranger" (documents `boite: true`, sans logement), avec l'expéditeur et l'objet ; notification à tous les membres.
- Seuls les membres de l'espace (adresse du compte ou Gmail branché) et les adresses ajoutées ("Autoriser une autre adresse" : syndic, comptable…) peuvent déposer ; les autres sont refusés avec un message.
- "🤖 Lire et ranger" : l'IA lit le document, ouvre le bon formulaire rempli ET range le fichier dans le bon logement et la bonne catégorie (`rangerApresLecture`). "🏠 Ranger" à la main, Ouvrir, ✕.
- Chaîne : Cloudflare Email Routing (règle "catch-all") → programme Cloudflare `boite-documents` (dossier `email-worker/`, postal-mime, déployé) → fonction Supabase `boite` (clé `BOITE_SECRET`, dans `.env`, les secrets Supabase et le programme Cloudflare).
- Tests : test62 (vraie base, vraie IA pour 1 document) 15/15 ; programme Cloudflare testé avec un vrai e-mail au format brut (PDF envoyé en "octet-stream" reconnu, logo du mail ignoré, majuscules, refus 403/422). En ligne.
- **À faire par Théo (2 minutes, le jeton Cloudflare n'a pas ce droit)** : 1) https://dash.cloudflare.com/ad8f78937df88f2398700f8584351cfc/sci-gestion-locative.com/email/routing/overview › "Activer Email Routing" › "Ajouter les enregistrements et activer" ; 2) onglet "Règles de routage" › "Adresse catch-all" › Modifier › Action "Envoyer à un Worker" › "boite-documents" › Enregistrer, puis activer la règle. Ensuite : Docs › Créer mon adresse, et s'envoyer une facture pour essayer.
- Pas vérifié : la réception d'un vrai e-mail (en attente de l'activation ci-dessus).

### 18/11/2026 — agenda abonné (Google Agenda, iPhone, Outlook)
- Réglages › "📅 Dans ton agenda" › "Abonner mon agenda" (aussi dans le menu rapide) : un lien secret par espace (`supabase/agenda.sql`, table `agendas`, empreinte du jeton seulement) lu par la fonction `agenda` (sans connexion, `?j=…`, text/calendar). Boutons Google Agenda (`calendar.google.com/calendar/r?cid=webcal://…`), iPhone / Mac (webcal), Outlook, Copier, Désactiver, "lu il y a…".
- L'appli republie le calendrier à chaque modification (si changé) : loyers attendus, révisions, fins d'assurance, préavis, départs, PNO, DPE, rappels, déclarations, taxe foncière, AG. Fichier .ics rendu conforme (lignes repliées, rafraîchissement toutes les 3 h conseillé, identifiants propres à l'espace). Le téléchargement d'un .ics reste possible.
- Tests : test61 (vraie base, lecture sans connexion comme un agenda) 12/12 ; test5, test53 OK. En ligne.
- Pas vérifié : l'abonnement réel dans Google Agenda et sur un iPhone (Google relit ces liens toutes les quelques heures, pas tout de suite).

### 18/11/2026 — relances automatiques (comme Qalimo)
- Réglages › "🔁 Relances automatiques" (propriétaire) : chaque matin (tâche `notifier` v13), un locataire en retard reçoit depuis le Gmail du propriétaire un rappel gentil à J+3 (jusqu'à J+10), puis un 2e rappel ferme à J+8 (jusqu'à J+25) si le 1er date d'au moins 4 jours. Mêmes mots que les relances de l'appli, prénom du propriétaire, IBAN rappelé. Jamais la mise en demeure. Rien pendant un accord d'étalement, rien sans e-mail, rien pour un locataire exclu (fiche › Plus › "Pas de relance automatique pour lui").
- Chaque relance envoyée est notée dans l'appli (relance du mois, `auto: true`), dans le journal des envois (anti-doublon entre associés) et annoncée par une notification ; si Gmail refuse, notification "pas envoyée".
- "👀 Voir ce qui partirait demain matin" : aperçu exact des e-mails (le serveur calcule sans rien envoyer ; refusé sans connexion ou à un non-membre).
- Tests : test60 (vraie base, aucun e-mail envoyé) 11/11 ; test5, test53 OK. En ligne.
- Pas vérifié : un vrai envoi (le compte de test n'a pas de Gmail). 1er passage réel : le matin qui suit l'activation.

### 18/11/2026 — feuille de route, étape 7 : surveillance de l'appli
- GitHub Action `.github/workflows/surveillance.yml`, chaque jour à 6 h 17 UTC (7 h 17 à Paris en hiver), et à la demande (onglet Actions › Surveillance de l'appli › Run workflow) : la page https://sci-gestion-locative.com s'ouvre et contient l'appli ; l'adresse pages.dev s'ouvre ; la base répond (requête légère sur `espaces`, qui évite aussi la mise en pause du projet Supabase gratuit) ; la fonction `locataire` refuse un faux lien (404). Si une étape échoue, GitHub envoie un e-mail. La clé utilisée est la clé publique lue sur la page (aucun secret).
- Essai des 4 vérifications depuis la machine de session : page ok, pages.dev ok, base 200, fonction 404. 1er passage sur GitHub lancé à la main le 18/11 : réussi (https://github.com/crbntheo-png/Logements-/actions/runs/44197732192).

### 18/11/2026 — feuille de route, étape 6 : qui a fait quoi entre associés
- Serveur (`supabase/activite.sql`) : la table `docs` note l'auteur de chaque ajout ou modification (déclencheur `docs_auteur` : `maj_par` = la personne connectée, nouvelle colonne `cree_le`) ; les suppressions de paiements, dépenses, locataires et logements sont gardées 60 jours (`docs_supprimes`, lisible par les membres). Les anciennes lignes ont reçu `cree_le = maj_le`.
- Accueil : carte "👥 Ce que font tes associés" (seulement à plusieurs) : ce que les AUTRES ont fait ces 14 jours, regroupé ("Gabriel a enregistré 3 paiements (1 650 € · Jean, Marie)", "a ajouté une dépense : Plombier (120 €)", "a supprimé…", "a envoyé « Relance » à …"), "Tout voir". Rechargée quand on revient dans l'appli.
- Anti-doublon : un document adressé à un locataire à qui un associé a écrit ces 3 derniers jours affiche en grand "👥 Gabriel a déjà écrit à … il y a 2 h · « objet »".
- Tests : test59 (vraie base, 2 vrais comptes : propriétaire + associé) 10/10 ; test33, test47, test55, test56 (écritures serveur après le déclencheur) OK ; test5, test58 OK. En ligne.
- Pas vérifié : avec Gabriel et Pierre pour de vrai.

### 18/11/2026 — feuille de route, étape 5 : trésorerie des 12 prochains mois
- Compta (année en cours) : carte "📈 Trésorerie des 12 prochains mois". Départ = solde lu dans la banque (Pennylane), sinon solde saisi une fois. Chaque mois : + loyers prévus par les baux en cours (les retards passés ne comptent pas), − échéances de prêts (tableaux d'amortissement ; sans prêt saisi, moyenne des échéances vues dans les dépenses), − taxe foncière en octobre (dernier montant connu par logement), − moyenne des dépenses courantes des 12 derniers mois (hors taxe foncière, prêts, achat, travaux d'amélioration).
- En grand : "✅ Pas de trou prévu · au plus bas X € en …" ou "⚠️ Ton compte pourrait passer sous X € en …". Graphique de 12 barres (rouge sous le seuil, orange au plus bas), détail mois par mois repliable, seuil d'alerte réglable. Sous le seuil : tâche "Trésorerie" dans À faire.
- Tests : test58 (mode local, clair et sombre) 21/21, calculs vérifiés (100 €/mois de courantes, 900 € de taxe en octobre, mensualité du prêt) ; À faire reste rapide (2 ms). test5, test22, test33, test38, test53 OK. En ligne.
- Pas vérifié : avec les vraies données de GTP (prêts pas encore saisis : la moyenne des "ECH PRET" de la banque sert en attendant).

### 18/11/2026 — feuille de route, étape 4 : l'IA lit tous les papiers
- Bouton "🤖 Lire" sur chaque document rangé dans l'appli (PDF ou photo, propriétaire seulement), et "🤖 Lire avec l'IA" dans les actions d'un fichier du Drive. L'IA reconnaît le papier et ouvre le bon formulaire déjà rempli, avec un message en grand "vérifie" :
  - avis de taxe foncière → fiche taxe foncière du bon logement (retrouvé par l'adresse), bonne année, total et ordures ménagères (les parts des locataires se calculent) ;
  - facture, assurance du propriétaire, appel de charges → nouvelle dépense (date, total TTC, catégorie, logement d'après l'adresse du chantier, fournisseur et objet) ;
  - DPE → classes énergie et climat, numéro ADEME, dates, enregistrés sur le logement ;
  - attestation d'assurance d'un locataire → le bon locataire et sa date de fin (rappel un mois avant) ;
  - bail → renvoie vers "🤖 Remplir depuis le bail" ; autre → résumé, rien à remplir.
- Serveur `ia` v7 : action `doc` (schéma `S_DOC`), même crédits que la lecture des baux (lectures de documents), remboursé si l'IA échoue.
- Confidentialité : précise que le contenu d'un document est envoyé à Anthropic seulement quand on demande sa lecture (c'était déjà le cas pour les baux, pas écrit).
- Test réel : test57 (4 vrais PDF, vraie IA, 6 à 9 s chacun) 12/12 : taxe 831 € dont 133 € de TEOM sur le bon logement, facture 1 039,50 € TTC en travaux sur le 43 (adresse du chantier), DPE E/B avec numéro et dates, attestation jusqu'au 31/08/2027 sur Jean. test5, test45, test49, test53 OK. En ligne.
- Pas vérifié : sur de vrais avis scannés ou photographiés (le test utilise des PDF avec du texte).

### 18/11/2026 — feuille de route, étape 3 : espace locataire
- **Propriétaire** : fiche du locataire › Plus › "🔗 Son espace locataire" : ce qu'il verra / ne verra jamais, "Créer son lien", puis Copier, Envoyer (WhatsApp, SMS…), "Voir ce qu'il voit", "Désactiver ce lien", et "ouvert pour la dernière fois il y a…". Réservé aux éditeurs (pas aux lecteurs).
- **Locataire** (lien https://sci-gestion-locative.com/#locataire=…, sans compte, vouvoiement) : son logement et le contact du propriétaire ; en grand "✅ Vous êtes à jour" ou "Reste à payer" ; loyer, prochain loyer, IBAN à copier ; quittances des 12 derniers mois en PDF ; son bail et ses états des lieux rangés dans l'appli (liens temporaires d'1 h) ; "🔧 Signaler un problème" avec photo, et "Mes demandes" (Envoyée / Réglé). Aucun menu de l'appli.
- **Propriétaire prévenu** : notification à tous les membres et e-mail au propriétaire depuis son Gmail (`notifier` v13, `{ demande }`) ; la demande est dans À faire en urgent ("🔧 Jean signale un problème") ; "Voir" (texte, photo, appeler, répondre) puis "✓ C'est réglé".
- **Serveur** : `supabase/locataire.sql` (tables `portails_locataire` : empreinte SHA-256 du jeton, photo des données publiée par l'appli ; `demandes_locataire` ; lecture par les membres, écriture par les éditeurs, rien pour l'anonyme). Fonction `locataire` (sans connexion, vérifie le jeton) : `voir`, `signaler` (10 demandes par jour maximum, photo réduite à 1600 px dans le bucket documents). L'appli republie la photo des données à chaque modification (`planifierPortails`, seulement si elle a changé).
- **Sécurité vérifiée** : sans le lien, rien n'est lisible (3 tables testées en anonyme) ; faux lien refusé ; lien désactivé = plus d'accès ; le locataire ne voit ni l'autre locataire ni son bail.
- Confidentialité : paragraphe "Espace locataire" ajouté.
- Tests : test56 (vraie base, 2 locataires, vrai PDF, vraie photo, sans compte côté locataire) 22/22 ; test5, test22, test33, test38, test45, test53, test55 OK. En ligne.
- Pas vérifié : la notification et l'e-mail réels au propriétaire (le compte de test n'a ni Gmail ni téléphone abonné) ; l'ouverture sur un vrai téléphone de locataire.

### 18/11/2026 — feuille de route, étape 2 : quittance dès que le loyer arrive
- Quand la banque (Pennylane) montre un loyer payé en entier (`rapprocherBanque` garde maintenant la liste `RECUS`), l'appli réagit, seulement pour les loyers qui viennent d'arriver (jamais l'arriéré) :
  - option arrêtée (par défaut) : message "💶 Loyer de Jean reçu : 500 €" avec le bouton "Envoyer la quittance" (ouvre la fenêtre habituelle, on valide) ;
  - option activée (Réglages › 🧾 Quittances automatiques, propriétaire seulement, Gmail branché avec Google) : la quittance part toute seule au locataire, message "🧾 1 quittance envoyée automatiquement (Marie)". Pas de double envoi (quittance notée envoyée), rien pour un paiement partiel, rien chez un associé (ni son appareil ni son Gmail).
- Limite : ça se fait quand le propriétaire ouvre l'appli (synchro de la banque), pas la nuit appli fermée. Le faire côté serveur demanderait de fabriquer le PDF sur le serveur.
- Tests : test55 (vraie base, envoi simulé, aucun vrai e-mail) 11/11 ; test5, test38, test53 OK. En ligne.
- Pas vérifié : avec un vrai virement sur le compte de GTP.

### 18/11/2026 — feuille de route, étape 1 : signer au doigt
- Bouton "✍️ Signer" sur les documents qui ont une zone de signature : bail, état des lieux, avenant, plan d'apurement (pas sur les quittances ni les courriers). Une ligne par signataire (bailleur, locataire), nom prérempli et modifiable, cadre où l'on signe au doigt, Effacer / Valider. Refusé sans dessin ou sans nom.
- La signature (image rognée), "Lu et approuvé" quand le document le demande, le nom, la date et l'heure sont ajoutés au document affiché et au PDF (téléchargé, partagé, envoyé par e-mail). Le bouton devient "Signé (N)".
- "📁 Ranger le PDF signé dans le logement" : copie le PDF dans les documents du logement ("Bail (signé le JJ/MM/AAAA)", rattaché au locataire, catégorie Bail ou État des lieux, `signe: true`). Fermer le document sans ranger : avertissement une fois (sinon la signature est perdue).
- Barre du document sur téléphone : elle débordait (le bouton Envoyer sortait de l'écran à 390 px) ; le titre se raccourcit et PDF / Partager n'affichent que leur icône quand Signer est là.
- Valeur légale : c'est une signature simple (comme sur papier, faite devant toi). Pour signer à distance avec valeur renforcée, il faudra un service payant (Youtrust).
- Tests : test53 (local, clair et sombre) 31/31 ; test54 (vraie base, compte de test, espace supprimé à la fin) 9/9 : PDF rangé, vrai PDF avec la signature, ouvrable. test5, test22, test38 OK. test30 échoue aussi sans ce changement (bibliothèque en ligne injoignable depuis la machine de test). En ligne.
- Pas vérifié : sur un vrai téléphone, au doigt.


### 18/11/2026 — bilan de l'IA, propositions modifiables
- Carte IA renommée "🤖 Le bilan de l'IA" ; bouton "🤖 Qu'est-ce que tu me suggères ?". En tête, des chiffres : logements à créer, dossiers à relier, locataires actuels, anciens locataires, logements sans dossier, documents lus.
- Chaque proposition est modifiable avant d'appliquer : logement à créer (nom, adresse, type, vide/meublée ; l'adresse "rue, 35000 Ville" est découpée en adresse / code postal / ville), dossier à relier (choix du logement, y compris un logement proposé 🆕), ancien locataire (nom, logement). Décocher = ne pas appliquer.
- Guide de démarrage : l'étape "Tes logements" propose d'abord "🤖 Depuis mon Drive" (l'IA crée les logements, on corrige), sinon Biens › + Ajouter.
- Tests réels : test52 (nouvel utilisateur sans logement : 4 logements proposés en 16 s, compta écartée, corrections appliquées, logement décoché non créé, ancienne locataire rattachée, 10 documents rangés) 12/12 ; test48 16/16.
- À savoir : un document d'un dossier non relié peut être rangé par la règle des noms dans un logement voisin (ex. "lot 2" dans "Agon lot 1" si le lot 2 n'est pas créé) ; annulable via "Derniers rangements automatiques".

### 18/11/2026 — demander une intégration avec une autre appli
- Les utilisateurs peuvent demander de brancher une autre appli : fenêtre "🔌 Brancher une autre appli" (choix parmi Dropbox, OneDrive, iCloud Drive, banque directe, Qonto, signature électronique, Outlook, Excel/Sheets, logiciel comptable, WhatsApp, Autre + nom), "Pourquoi ? Qu'est-ce que ça t'éviterait ?" (obligatoire), "🔥 Indispensable / 👍 Pratique". Accès : bouton "?", page Docs ("Tes documents sont ailleurs ? Demande-nous de le brancher"), Réglages › "Une autre appli ?".
- Enregistré comme signalement de type `integration` (fonction `signaler` existante) : Théo est prévenu par e-mail depuis son Gmail et par notification (titre "[Intégration demandée n°…]", `notifier` v11).
- Page admin `#integrations` (lien dans Réglages › Une autre appli, visible seulement par l'administrateur) : classement par appli (nombre de demandes et de personnes, raisons, 🔥, bouton Répondre par e-mail). SQL `est_admin()` et `demandes_integrations()` (refusée à tout autre compte, supabase/integrations.sql).
- Tests : test51 8/8 (envoi simulé pour ne pas envoyer de vrai e-mail ; refus admin testé sur le vrai serveur).

### 18/11/2026 — nouveaux utilisateurs, invitations, IA réservée au propriétaire
- Vérifié de bout en bout avec de vrais comptes neufs (test50, 11/11) : connexion → "Bienvenue / Créer mon espace" → propriétaire ; crédits normaux pour tout nouveau compte (2/jour, 5/mois d'analyses ; 15 lectures de documents/mois ; budget global 3 $/mois) ; Théo seul sans limite (IA_SANS_LIMITE).
- Invitations : plusieurs adresses d'un coup (séparées par virgules ou espaces), puis fenêtre "📤 Dernière étape : préviens-les" en grand, avec un message prêt (lien https://sci-gestion-locative.com, nom de l'espace, adresse à utiliser, tutoiement ou vouvoiement selon le nombre) : Envoyer (WhatsApp, SMS…), Copier, Par e-mail. "Partager le lien" donne toujours le nouveau domaine.
- Crédits IA réservés au propriétaire de l'espace : le serveur `ia` (v6) vérifie `est_proprietaire` (403 "réservée au propriétaire" sinon) ; dans l'appli, un associé a la lecture simple du bail, sans IA ; Réglages › Membres et la carte IA disent "les crédits IA sont à toi".
- test9 (ancien test d'invitation du 13/11) échoue aussi sans ces changements : obsolète, remplacé par test50.

### 18/11/2026 — l'IA lit les baux et remplit la fiche du locataire
- Comparaison avec Qalimo (qalimo.fr) : l'appli a déjà relances en 3 niveaux, quittances, avis d'échéance, IRL, régularisation, états des lieux, candidats, aide à la déclaration. Manquent surtout : signature électronique et recommandé en ligne (services payants), synchronisation bancaire sans Pennylane (compte chez un fournisseur à ouvrir). Choix de la mise en prod : créer un locataire depuis son bail, sans rien taper (Qalimo fait tout saisir).
- Serveur `ia` (v5) : action `bail` (Claude Opus 5.5, sortie JSON imposée) : 21 champs (locataires, colocataires, contact, adresse précédente, type, date d'effet, loyer HC, charges et mode, jour de paiement, dépôt, IRL, révision, garant, Visale, clauses particulières, adresse du logement, remarques). Texte du PDF envoyé quand il est lisible (moins cher), sinon le PDF scanné ou la photo. Compteur séparé : 10 lectures par jour, 15 par mois (IA_DOCS_JOUR / IA_DOCS_MOIS), même budget global ; lecture ratée non comptée (supabase/ia_docs.sql).
- Appli : le bouton du formulaire devient "🤖 Remplir depuis le bail" (l'IA d'abord, l'ancienne lecture par règles en secours), cases remplies surlignées, message en grand "L'IA a rempli N cases : vérifie-les", logement reconnu par l'adresse du bail. Carte "Ce que l'IA a compris" : "🤖 Créer depuis son bail" pour chaque locataire actuel probable dont le bail est dans un dossier partagé (y compris pour un logement que l'IA vient de faire créer).
- Test réel (test49, bail PDF de 2 pages) : 16/16, 15 cases justes en 9 s ; même résultat depuis un dossier partagé ; locataire enregistré.
- Théo : 1 analyse réelle de son Drive le 17/11 (0,08 $). Il est bien sans limite (IA_SANS_LIMITE).

### 17/11/2026 (23 h) — crédits IA limités et annoncés en grand
- Serveur `ia` (v4) : 2 analyses par personne et par jour, 5 par mois (IA_JOUR, IA_MOIS), budget global de l'appli 3 $ par mois (IA_BUDGET_MOIS), Théo sans limite (IA_SANS_LIMITE). Coût réel de chaque appel enregistré (table `ia_usage`, colonne `cout` en millionièmes de dollar, supabase/ia_quota.sql). Une analyse ratée n'est pas comptée. Action `credits` : ce qui reste.
- Appli : messages "à lire" en grand (`grosMsg` : attention orange, ok vert, stop rouge). Avant : "⚠️ 5 analyses par mois · il te reste…". Confirmation obligatoire "Cette analyse utilise 1 de tes crédits IA". Après : "✅ Analyse faite · il te reste…". Épuisé : "⛔ Tu as utilisé tes 5 analyses de ce mois-ci", plus de bouton. L'analyse n'est plus lancée toute seule après un partage (elle coûte un crédit) : on invite à la lancer.
- Tests : test48 16/16 (vraie analyse, 9 s), test47 11/11, test45 25/25.

### 17/11/2026 (22 h) — l'IA organise le Drive (Claude)
- Théo veut que l'appli détecte seule les logements, les dossiers qui leur correspondent, les logements à créer ou à retirer. Les règles sur les noms (`deviner`) ne savent que ranger dans des logements existants.
- Clé Anthropic de Théo vérifiée (200 avec la clé, 401 avec une fausse), rangée dans `.env` et en secret Supabase `ANTHROPIC_API_KEY`.
- Nouvelle fonction serveur `ia` (verify_jwt true) : membre éditeur de l'espace obligatoire, 20 analyses par personne et par jour (table `ia_usage`, supabase/ia.sql). Envoie à Claude Opus 5.5 (effort medium, sortie JSON imposée par schéma, repli automatique en cas de refus) SEULEMENT les noms des dossiers, 10 noms de fichiers par dossier, les logements et les locataires. Rend : liens dossier → logement, logements à créer, anciens locataires, locataires actuels probables, logements sans dossier, résumé ; ne garde que des ids connus.
- Appli : carte "🤖 Ce que l'IA a compris" dans Docs (cases à cocher, "Appliquer ce qui est coché", rien n'est supprimé), lancée automatiquement après un nouveau dossier partagé, ou bouton "Analyser mon Drive". Appliquer crée les logements, relie les dossiers, ajoute les anciens locataires, puis le rangement automatique range les documents. Les questions "ancien locataire ?" des règles sont masquées quand l'IA a analysé. Confidentialité mise à jour (noms envoyés à Anthropic, pas de contenu, pas d'entraînement).
- Test réel (test48, Drive imitant GTP : Agon 2 lots, 41 et 43 Beauchamps, Compta) : 12/12, 11 s, ~2 900 jetons lus + 800 écrits ≈ 0,03 $. Corrigé en route : un commentaire avait masqué une ligne de code (détecté par test45 avant mise en ligne).

### 17/11/2026 (20 h) — clé de l'appli posée
- Compte de service `lecture-dossiers@gestion-locative-drive.iam.gserviceaccount.com` (projet gestion-locative-drive). Clé JSON rangée dans `.env` (GOOGLE_PARTAGE_SA, une ligne) et en secret Supabase. Vérifié : `config` prêt, `lister` répond (Google accepte la clé, API Drive active), `fichier` sur un fichier non partagé refusé, appel sans connexion refusé (401).

### 17/11/2026 (19 h) — dossiers PARTAGÉS avec l'appli (méthode principale)
- Essai du mode "tout le Drive" : la lecture marche (399 fichiers de GTP Invest), mais Théo refuse l'écran "appli non validée" et la phrase "accès à tout ton Drive" : les autres utilisateurs ne l'accepteront pas.
- Nouvelle méthode, comme beaucoup d'outils pros : la personne **partage son dossier avec l'adresse de l'appli** (un compte de service Google), en "Lecteur", comme avec un associé. Pas d'écran Google, pas d'accès au reste du Drive, arrêt en retirant le partage.
- Serveur : nouvelle fonction `partage` (verify_jwt true) : `config` (adresse de l'appli), `lister` (dossiers et fichiers partagés PAR CETTE personne, reconnue à ses adresses Google : connexion, identités, Drive, Gmail ; lecture des sous-dossiers côté serveur), `fichier` (téléchargement seulement si un dossier parent a été partagé par cette personne). Le jeton de l'appli ne quitte jamais le serveur. Secret attendu : `GOOGLE_PARTAGE_SA` (clé JSON).
- Appli : page Docs refaite autour de **+ Ajouter un dossier** (adresse à copier, étapes téléphone/ordinateur, "C'est fait" → lecture et rangement automatique) ; dossiers marqués "partagé, lecture seule" ; Retirer explique comment arrêter le partage ; "Des fichiers un par un" et "Importer un .zip" en options discrètes. L'accès à tout le Drive n'est plus proposé (le code reste, bouton "Retirer cet accès" pour ceux qui l'ont). Plus d'écran "Connecte ton Google Drive" obligatoire. Confidentialité et présentation mises à jour.
- Tests : test47 réécrit (partage) 11/11 ; test43, test45 adaptés aux nouveaux libellés.

### 17/11/2026 (17 h) — projet Google "Gestion locative Drive" créé
- Théo a créé le projet (n° 954754947849) et son client Web. Clés vérifiées auprès de Google (réponse "invalid_grant" à un faux jeton = client et secret reconnus), rangées dans `.env` et dans les secrets Supabase `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET`. La fonction `drive` répond `complet: true`.

### 17/11/2026 (9 h) — lire les dossiers en entier (projet Google à part)
- Théo : ne pas pouvoir lire un dossier entier est "catastrophique", et l'écran d'import n'était pas clair. Confirmé par un test d'un autre développeur (github.com/shitikanth/calibre-cloud/issues/156) : avec drive.file, choisir un dossier ne donne jamais son contenu. Seule la lecture du Drive (drive.readonly, "restreint") le permet.
- Choix : un **second projet Google réservé au Drive**, publié non vérifié (écran "appli non validée" une fois, 100 utilisateurs maximum tant qu'il n'y a pas d'audit). La connexion Google et Gmail restent sur le projet principal, dont la validation est en cours (on n'y ajoute pas d'accès restreint).
- Serveur `drive` : mode `choix` (drive.file, projet principal) ou `complet` (drive.readonly, secrets `GOOGLE_DRIVE_CLIENT_ID/SECRET`), colonne `drive_comptes.mode` (supabase/drive_complet.sql), renouvellement avec le bon client ; `config` dit si le mode complet est installé. `envoyer-gmail` : débrancher Gmail retire son accès chez Google si le Drive est sur l'autre projet.
- Appli : un seul bouton **+ Ajouter des dossiers ou fichiers** (le sélecteur accepte les deux), bandeau "Tes dossiers sont lus à moitié › Lire mes dossiers en entier" tant que le mode complet n'est pas actif, sélecteur rattaché au bon projet. Fenêtre d'import réduite au .zip / fichiers de l'appareil ("📦 Importer un .zip"), sans doublon avec le Drive. Textes de confidentialité et page de présentation mis à jour (lecture seule, seulement les dossiers choisis).
- Tests : test47 (nouveau) 12/12, test46 16/16, test45 25/25, test43 24/24, test33, test44 OK. En attente : les clés du projet Drive (sans elles, rien ne change pour l'utilisateur).

### 17/11/2026 (8 h) — import : directement dans le Drive
- Sur le téléphone de Théo, le bouton d'import ouvrait le choix Photo / Vidéo / Fichiers (champ sans filtre). Corrigé : le champ n'accepte que .zip, PDF, Word, Excel, texte, donc le téléphone ouvre directement ses fichiers.
- Nouveau gros bouton **📁 Choisir dans mon Drive** dans "Importer des documents" : le sélecteur Google s'ouvre, les fichiers touchés sont lus (documents Google convertis en PDF) et passent par le même aperçu (logement deviné) avant copie.
- Tests : test46 18/18, test45 25/25, test43 24/24.

### 17/11/2026 (0 h) — importer un dossier entier
- Théo a choisi "02 - GTP Invest" et l'appli a lu 0 fichier. C'est la règle de Google pour l'accès "fichiers choisis seulement" (drive.file) : choisir un dossier ne donne pas son contenu. Seul l'accès à tout le Drive (drive.readonly, "restreint") le permettrait, avec l'écran rouge et un audit de sécurité payant chaque année : écarté.
- Ajout de **📦 Importer un dossier entier** (page Docs, même sans Drive connecté) : sur ordinateur, clic droit sur le dossier dans drive.google.com › Télécharger → un .zip avec tous les sous-dossiers ; sur téléphone, plusieurs fichiers d'un coup. L'appli ouvre le .zip (JSZip 3.10.1, cdnjs), devine logement et type de chaque document (même fonction `deviner` que le Drive), montre la liste (Reconnus / À choisir toi-même, menu du logement sous chaque fichier, déjà présents et formats refusés signalés), et ne copie qu'après "Importer".
- Corrigés en route : nom `IMPORT` déjà pris (l'appli ne démarrait plus, jamais mis en ligne), fichiers du .zip sans type refusés par le stockage, aperçu serré sur téléphone.
- Tests : test46 (nouveau, vrai .zip avec sous-dossiers) 14/14, test45 25/25, test43 24/24, test33 OK.

### 16/11/2026 (23 h) — page Documents refaite en explorateur
- Retour de Théo : on ne pouvait pas ajouter de dossier (bouton caché derrière "Dossiers connectés"), "Ouvrir" bloquait dans GTP Invest sans pouvoir remonter, et toucher un fichier n'offrait aucun moyen de le retirer.
- Nouvelle page (appli installée) : carte **Mes dossiers Drive** toujours visible (nombre de fichiers par dossier, + Ajouter des dossiers / des fichiers). On entre dans un dossier (+ Choisir des fichiers ici, Ouvrir dans Drive, Retirer ce dossier avec confirmation) et on en ressort par "← Tous mes dossiers".
- Toucher un fichier ouvre ses actions : Ouvrir, Ranger dans un logement (logement deviné), Envoyer par e-mail (marche maintenant hors claude.ai), Retirer de l'appli (le fichier reste dans le Drive). La ligne indique où il est déjà rangé.
- Sélecteur Google : onglets "ce dossier", **Mon Drive** (pour remonter tout en haut), "Partagés avec moi", "Drives partagés". Les fichiers choisis depuis un dossier restent groupés sous ce dossier, même pris dans un sous-dossier.
- `envoyer-gmail` (v10) : la pièce jointe garde son vrai type (photo, Word…) au lieu de toujours "PDF".
- Titres du sélecteur Google raccourcis (le titre long recouvrait les onglets sur téléphone) ; consigne affichée par l'appli, au-dessus du sélecteur.
- Tests : test45 (nouveau) 25/25, test43 adapté 24/24, test33, test44, test5, test22, test26 OK.

### 16/11/2026 (22 h) — nom de domaine à soi
- Google refuse une page d'accueil sur une adresse partagée (`pages.dev`). Théo a acheté **sci-gestion-locative.com** chez Cloudflare (`gestion-locative-sci.com` était pris) et créé les 2 CNAME (`@` et `www` vers `gestion-locative-sci.pages.dev`).
- Domaine rattaché au projet Pages (API) : actif. Vérifié en se faisant passer pour Googlebot : `/`, `/presentation`, `/confidentialite`, le fichier de preuve Google et `/robots.txt` répondent 200 sur les deux adresses.
- Supabase : `site_url` = https://sci-gestion-locative.com, nouvelles adresses ajoutées à la liste autorisée (anciennes gardées). Secret `APP_URL` et adresse par défaut de `notifier` passés au nouveau domaine (redéployé, verify_jwt false).
- L'ancienne adresse pages.dev marche toujours.

### 16/11/2026 (21 h) — premiers essais réels de Google : ça marche
- Théo s'est connecté avec **Continuer avec Google** (20:00 UTC, compte rattaché au même utilisateur : fournisseurs email + google), a rebranché **Gmail avec Google** (20:01) et a **envoyé une attestation de loyer depuis son Gmail** (20:03, table `envois`). Tout le chemin Google est donc vérifié en vrai.
- Validation Google : site validé dans la Search Console (fichier servi par réécriture `_redirects`), accès déclarés, vidéo filmée : https://youtu.be/WzOVD4jxKMw . Fiche (branding) refusée une première fois car la preuve de propriété n'était pas encore enregistrée : **relancer le 17/11 au soir** ("J'ai corrigé les problèmes"), puis envoyer la demande au Centre de validation.
- Google : écran d'autorisation forcé à chaque branchement (`prompt: "consent"`), sinon pas de clé de renouvellement au 2e branchement.
- Reste : le code de connexion par e-mail (Brevo) tant que l'appli Google n'est pas publiée pour tous.

### 16/11/2026 (nuit, fin) — dossier de validation Google (Gmail)
- Page d'accueil publique **https://gestion-locative-sci.pages.dev/presentation** (`presentation.html`, copiée par `build.py`) : présente l'appli et ce qu'elle fait des données Google ; lien "Découvrir l'appli" sur l'écran de connexion.
- `build.py` copie dans `dist/` tout fichier `googleXXXX.html` posé à la racine du projet (vérification Google Search Console) : quand Théo donne le nom du fichier, créer `googleXXXX.html` contenant `google-site-verification: googleXXXX.html`, puis `./deploy.sh`.
- Dossier pas à pas pour Théo (5 étapes, textes en anglais pour gmail.send) : page privée https://claude.ai/artifact/2AWe6uC4Wz98xc27m2PXck
- Attend : le nom du fichier Search Console, puis la vidéo et l'envoi de la demande par Théo.

### 16/11/2026 (nuit, fin) — plus d'écran "Google n'a pas validé cette application" pour le Drive
- Essai réel de Théo : le dossier coché "02 - GTP Invest" n'a rien montré (avec `drive.file`, Google ne donne pas le contenu d'un dossier coché), et "Autoriser la lecture des dossiers" (`drive.readonly`) a affiché l'écran rouge de Google. Ce bouton est **supprimé** : l'appli ne demande plus jamais d'accès large au Drive.
- À la place : carte "Google ne laisse pas l'appli ouvrir ce dossier tout seul" avec un bouton **Ouvrir « nom du dossier »** : le sélecteur Google s'ouvre directement dans ce dossier (`ouvrirPicker(..., parent)`), on touche les fichiers à garder, Sélectionner. Ces fichiers sont rangés sous le nom du dossier (dossier = logement marche).
- Reste un écran d'avertissement : **brancher Gmail** (`gmail.send` est un droit "sensible" pour Google) tant que l'appli n'est pas validée par Google (demande gratuite : domaine vérifié, texte de justification, courte vidéo).
- test43 24/24, test33 OK, test5 OK. En ligne.

### 16/11/2026 (nuit, suite) — Drive : cocher des dossiers entiers (demande de Théo après essai sur son téléphone)
- Le sélecteur Google marche en vrai chez Théo (sans clé d'API). Mais cocher fichier par fichier n'est pas pratique : on coche maintenant **des dossiers entiers, plusieurs d'un coup** (`choisirDossierDrive` → sélecteur en mode dossiers), et l'appli lit leur contenu et leurs sous-dossiers (`S.sci.driveDossiers`). Les fichiers un par un restent possibles (`choisirFichiersDrive`).
- **Revenir dessus** : liste "Ce que l'appli peut lire dans ton Drive" (`blocConnecte`, Docs › Dossiers connectés et Réglages › Google Drive) avec "+ Ajouter des dossiers", "+ Des fichiers" et "Retirer".
- Incertain chez Google : avec l'accès limité (`drive.file`), un dossier coché donne-t-il accès à son contenu ? Si Google ne montre rien, carte "Google ne montre pas l'intérieur de ce dossier" avec "Autoriser la lecture des dossiers" (`connecterDrive(true)`, droit `drive.readonly` ; l'appli ne lit toujours que les dossiers cochés). À observer au premier essai de Théo.
- "Dossiers et logements" (dossier = logement) revient avec les dossiers cochés.
- test43 22/22 (dossiers, sous-dossiers, alerte, liste, retirer, doublons), test33 OK, test5, 26, 44 OK. En ligne.

### 16/11/2026 (nuit) — plus aucun e-mail par l'appli, connexion Google, Drive par le sélecteur Google (session du compte principal, demande de Théo)
- **Plus aucun e-mail envoyé par un serveur commun (Brevo)**, sauf les codes de connexion de secours (voir plus bas). Chacun envoie depuis **son** Gmail branché (droit "envoyer" seulement) :
  - documents, quittances, relances : `peutEnvoyer()` exige un Gmail branché ; sans Gmail, l'aperçu propose Partager / Ouvrir ma messagerie / SMS / WhatsApp + "Déjà envoyé autrement", et un lien "branche ton Gmail". `envoyerViaServeur` supprimé ; RPC `envoyer_mail` fermée à tous (`supabase/sans_brevo.sql`).
  - résumé des loyers (1er et 5) et copie de sauvegarde du lundi : partent du Gmail de la personne, vers elle-même (fonctions `notifier` v4 et `sauvegarde` v5, helper `envoyerParGmail`). Sans Gmail : alerte sur le téléphone seulement / copie en pause.
  - signalements (bouton ?) : gardés dans la table ; alerte au Gmail et au téléphone de l'administrateur (`admin_destinataire()`, notifier `{signalement}`).
  - ⚠️ `notifier` et `sauvegarde` doivent rester en `verify_jwt=false` (appelées par les tâches planifiées) : `tests/deploy_fn.sh` le fait tout seul.
- **Connexion "Continuer avec Google"** (jeton d'identité Google vérifié par Supabase, `signInWithIdToken` + nonce ; fournisseur Google activé côté Supabase avec l'ID client). Le code par e-mail reste en lien de secours ("Pas de compte Google ?") : c'est le **seul** envoi restant via Brevo. Le retirer quand la connexion Google est confirmée.
- **Drive par le sélecteur officiel de Google** : droit `drive.file` au lieu de `drive.readonly` (plus d'audit de sécurité Google, plus d'écran "accès à tout le Drive"). L'appli ne connaît que les fichiers cochés (`S.sci.driveChoisis` : nom, type, lien). "Choisir mes documents" (Docs, Réglages) et "Ajouter un document › Choisir dans mon Google Drive" ouvrent le sélecteur (`ouvrirPicker`, `GOOGLE_PROJET` = 502656965437). Analyse et rangement automatique inchangés, sur les fichiers choisis. Fini : lecture des dossiers, "dossier = logement". Ancienne connexion (lecture de tout le Drive) signalée dans Réglages (Débrancher puis Connecter). Débrancher le Drive ou Gmail ne retire plus l'autorisation Google si l'autre est branché (sinon les deux sautaient).
- Tests : test43 réécrit (sélecteur simulé) 15/15, test33 adapté 14/14, test36 (dossiers) supprimé, test31 (envoi serveur fermé) OK, test44 15/15 ; test5, 22, 26, 29, 38 OK. 25 tests coupent le vrai bouton Google (injoignable depuis la machine de test). Espaces de test restés supprimés. En ligne.
- Pas vérifié en vrai (Google injoignable d'ici) : la connexion Google, le sélecteur Google, un envoi Gmail réel. Le sélecteur peut demander une clé d'API Google (`window.APP_GOOGLE_API_KEY`, pas encore posée) : à ajouter si Google la réclame.

### 16/11/2026 (soir) — loyers de Beauchamps, confidentialité (session du compte principal, demandes de Gaby et Théo)
- **Loyers faux corrigés dans la vraie base** (Gaby : "pas précis") : 41 Margottet – Fravelle **612 €** (au lieu de 500), 43 Steve **515 €** (au lieu de 510). Preuves : prorata du notaire (244,80 € = 612 × 12/30 ; 206 € = 515 × 12/30), bordereau CAF de janvier 2026 (612 €), quittance de février 2026 de Steve (515 €). Modifiés : `loyerHC`, l'avenant n° 1 (loyer gardé), `loyerRef` du 41, plan de Steve (dette 315 € au lieu de 310). Anciennes valeurs : 500 / 510 / 310. L'appli acceptait déjà les centimes (cases à 0,01 €).
- ⚠️ **Margottet – Fravelle** : la CAF verse l'allocation directement au bailleur (612 € en janvier, 594 € en décembre, à M. Loslier). Si la CAF n'a pas été prévenue du changement de propriétaire, elle paie encore l'ancien : c'est sans doute pourquoi novembre n'est pas arrivé.
- **Taxes foncières** : déjà par logement dans l'appli (Compta › Plus › Saisir une taxe foncière). Agon reste à parts égales et sans ordures ménagères : il faut le détail par local de l'avis 2026 (introuvable dans Gmail et Drive). Dès qu'il est saisi, "À faire" propose d'envoyer la demande à Antoine, Emma et Sofiane.
- **Gmail "envoi seulement"** : le mot de passe d'application (accès à toute la boîte) est remplacé par "Continuer avec Google" avec le seul droit `gmail.send` (même client Google que le Drive). Serveur : `supabase/gmail.sql` (colonne `mode`, `gmail_google_enregistrer`, `gmail_oublier`, clé dans le coffre `gmailg_<user>`, l'ancien mot de passe est effacé au passage, `gmail_brancher` n'est plus appelable), fonction `envoyer-gmail` v7 (envoi par l'API Gmail, actions config / brancher_google / debrancher ; l'ancien mot de passe marche encore le temps de rebrancher). Appli : écran Réglages › Envoi des e-mails, tâche "Rebrancher ton Gmail avec Google" pour les comptes à l'ancienne (Théo et Maxence).
- **Pennylane** : `banque_brancher` refuse désormais un jeton qui peut modifier la compta (scopes autres que `:readonly` et `exports:`). Testé avec le jeton actuel de GTP (refusé : il a des droits d'écriture ; celui déjà branché continue de marcher).
- **Page "Mentions légales et confidentialité"** : éditeur Théo Corbin (crbntheo@gmail.com), engagement de l'hébergeur à ne jamais consulter les données sauf demande, Gmail envoi seul, banque et Drive en lecture seule.
- Nouveau `tests/test44.js` (vraie base, Google simulé) 15/15 ; `tests/deploy_fn.sh <nom>` publie une fonction serveur. test5, test22 OK. En ligne.
- Page publique **https://gestion-locative-sci.pages.dev/confidentialite** (fabriquée par `build.py` depuis `pageLegal()`, exigée par Google pour publier l'appli Google) + section "Tes données Google" (utilisation limitée).
- Pas vérifié : un vrai branchement Google + envoi réel (il faut que Théo le fasse), et si l'API Gmail est activée dans le projet Google Cloud.

### 16/11/2026 (suite) — contrôle de confidentialité (session du compte principal)
- Le jeton d'administration Supabase avait été remplacé : nouveau jeton `sbp_fc39…` donné par Théo, rangé dans `.env` (et dans le secret réseau de l'environnement cloud). Les autres sessions doivent mettre à jour leur `.env`.
- Test « inconnu » (sans compte, puis compte test-b non invité) sur les 15 tables, les buckets et les fonctions : aucune donnée de GTP lisible, écriture refusée, `envoyer_mail` et `banque_actualiser` refusés. Côté serveur : 15 tables sur 15 avec RLS, buckets `photos` et `documents` privés, seules fonctions appelables sans compte : `est_membre`, `est_editeur`, `est_proprietaire` (renvoient faux sans compte).
- Nettoyé : 2 espaces de test « Nouveau venu » restés sur test-b (pense à supprimer les espaces de test à la fin des tests).

### 16/11/2026 — « Ajouter un document » : choisir dans Google Drive (session du compte principal, demande de Théo)
- Fenêtre « Ajouter un document » : bouton **📁 Choisir dans mon Google Drive** (propriétaire, Drive connecté) ; sinon lien « Connecte ton Drive ». Le choix sur le téléphone reste en dessous.
- Navigateur Drive (`choisirFichierDrive`) : dossiers choisis en premier (« tes documents »), Mon Drive, partagés avec moi, sous-dossiers (› / ← Retour), recherche par nom, plusieurs fichiers cochés, catégorie et locataire.
- `importerDepuisDrive` : chaque fichier est **copié** dans le bucket `documents` (les associés l'ouvrent sans accès au Drive) ; documents Google (Docs, Sheets) convertis en PDF ; si trop lourd (> 20 Mo) ou refusé par Drive, gardé en lien ; pas de doublon (`driveId`).
- Nouveau `tests/test43.js` (vraie base, comptes de test, Drive simulé) 12/12. test5 et test22 OK. En ligne.
- Pas vérifié : un vrai choix dans le Drive de Théo depuis son téléphone.

### 14/11/2026 (message 2) — Bloc 5 : prêts, rentabilité nette, avances des associés
- **Prêts** (nouvelle collection `prets`, ajoutée à `COLLS`, à `blank()` et à la copie de sauvegarde du lundi) : Compta › Emprunts › "+ Prêt" (banque, logement ou SCI, montant, taux, durée en mois, 1re échéance, assurance emprunteur par mois, différé en mois : partiel = intérêts seuls, total = intérêts ajoutés au prêt). `tableauPret` calcule le tableau (mensualités constantes, dernière échéance ajustée) ; la mensualité s'affiche pendant la saisie. Taux variable ou différé compliqué : "Importer le tableau de la banque (CSV)" (fichier ou copier-coller ; colonnes date, intérêts, capital/amortissement, assurance et capital restant dû si présentes ; nombres et dates à la française) qui remplace le calcul. Vue du tableau par année (intérêts, capital, assurance, reste dû).
- **Ventilation** (`propositionsVentilation`, `ventilerEcheances`) : une dépense "Échéance de prêt (à ventiler)" OU une dépense "Intérêts d'emprunt" qui est en fait une échéance complète, dont le montant correspond (à 1 € près, à 12 jours près) à une échéance du tableau, est **proposée** ; fenêtre avec aperçu (intérêts, capital, assurance, écart d'arrondi), cases à décocher, "Oui, ventiler les N". Chaque échéance devient 3 dépenses (`pretId`, `ventileDe`, même `banqueTx`, donc pas reproposée par la banque). Rien sans validation.
- **Compta et 2072** : quand des prêts sont saisis, les intérêts de l'année viennent des tableaux (`interetsTableaux`), et les dépenses d'intérêts déjà couvertes (ventilées ou échéance complète reconnue) ne sont pas comptées deux fois. Note dans l'aide à la 2072.
- ⚠️ À noter pour GTP : 8 dépenses "ECH PRET INT" d'environ 1 540 € sont classées en intérêts. Si Théo saisit son prêt et que ce sont des échéances complètes, l'appli les proposera à la ventilation (et le résultat de -16 506 € changera).
- **Fiche logement** : "Rentabilité nette" et "Cash-flow" (`rentaNette`) à côté de la rentabilité brute, avec "Pourquoi ? Comment c'est calculé" (loyers HC sur 12 mois − charges non récupérables des 12 derniers mois − taxe foncière sans les ordures ménagères − assurances propriétaire et loyers impayés − intérêts et assurance de prêt des 12 prochains mois d'après le tableau, sinon des dépenses) ÷ prix d'achat ; cash-flow = (loyers − charges − taxe − assurances) ÷ 12 − mensualité complète.
- **Avances des associés** (SCI seulement) : Compta › Plus › "Un associé a payé de sa poche" (qui, combien, quand, pour quoi, catégorie, logement) : la dépense compte pour la SCI (`avancePar`) ; section "Avances des associés" : "La SCI lui doit X €" par associé, bouton "Remboursé" (date, `rembourseLe`). Masqué en nom propre.
- Corrigé : bouton "Annuler" du message illisible en mode sombre automatique (thème du téléphone).
- Nouveau `tests/test42.js` (mode local, clair et sombre) 40/40 : 100 000 € à 3 % sur 20 ans = 554,60 €/mois, différé, saisie, CSV, ventilation, intérêts en compta et 2072, rentabilité nette et cash-flow recalculés à la main, avances. test5, test17, test23, test29, test30 49/49, test38 OK. En ligne.
- Rien n'a été modifié dans les données réelles de GTP INVEST.

### 14/11/2026 (message 2) — Bloc 6 : espace locataire (pas codé, à décider)
Ce que ça apporte : chaque locataire a son accès (lien + code par e-mail, comme l'appli) pour voir ses quittances, son bail, ses avis d'échéance, et signaler un problème avec photo (fuite, panne). Le propriétaire reçoit la demande dans À faire.
Ce que ça demande :
- **Comptes** : les locataires se connectent avec le même système (code à 6 chiffres par e-mail, Supabase Auth). Nouveau rôle `locataire` dans `membres`, lié à un bail (`bail_id`), invitation depuis la fiche du locataire (aperçu + "Oui, envoyer").
- **Sécurité Supabase (le plus important)** : aujourd'hui un membre voit TOUT l'espace (table `docs` générique). Un locataire ne doit voir que SES lignes. Il faut donc des règles d'accès (RLS) nouvelles : soit une vue/fonction serveur `espace_locataire()` qui renvoie seulement son bail, ses quittances, ses paiements et les documents marqués "visibles par le locataire" ; soit des tables séparées. Les documents (bucket `documents`) : URL signées générées côté serveur, seulement pour ses fichiers. Aucun accès aux autres locataires, à la compta, à la banque, aux associés.
- **Signalements avec photo** : table `demandes` (bail, texte, photos dans un bucket `demandes`, statut), RLS : le locataire écrit et lit les siennes, les membres de l'espace lisent tout ; alerte (notification + À faire) chez le propriétaire.
- **Écrans** : une petite appli à part (mêmes fichiers, mode "locataire") : Mes quittances, Mon bail, Signaler un problème, Mes demandes.
- **Tests** : comptes de test locataire A et B, vérifier qu'aucun ne voit l'autre ni la compta (comme test9 et test31).
- **Temps estimé** : 3 à 4 sessions (1 pour la sécurité et les fonctions serveur, 1 à 2 pour les écrans, 1 pour les tests d'isolement et le passage en ligne). Aucun service payant à ouvrir. À faire seulement si Théo veut l'ouvrir à ses locataires.

### 14/11/2026 (message 2) — Bloc 4 : déclaration d'occupation (GMBI)
- **Sources vérifiées** :
  - [impots.gouv.fr, la déclaration d'occupation](https://www.impots.gouv.fr/particulier/la-declaration-doccupation) : avant le 1er juillet, déclarer les changements d'occupation survenus entre le 2 janvier de l'année d'avant et le 1er janvier, dans "Gérer mes biens immobiliers".
  - [FAQ officielle GMBI (PDF impots.gouv)](https://www.impots.gouv.fr/sites/default/files/media/1_metier/1_particulier/EV/5_patrimoine_logement/560_travaux_habitation/faq_gmbi.pdf) : amende de 150 € par local (article 1770 terdecies du CGI), même amende en cas d'omission ou d'inexactitude ; une personne morale (SCI) adhère au service GMBI par son espace professionnel.
  - Espaces vérifiés : cfspro.impots.gouv.fr (professionnel), cfspart.impots.gouv.fr (particulier).
- **Tâche** (`tacheGmbi`, `changementsOccupation`) : à partir du 1er juin, "Déclarer les changements d'occupants avant le 1er juillet", avec la liste calculée (arrivées, départs y compris anciens locataires de l'historique, logement vide au 1er janvier après un départ) ; lien vers l'espace professionnel (SCI) ou particulier (`estPerso()`). Après le 1er juillet : "en retard", urgente (jusqu'à la fin de l'année). "C'est fait" (clé `gmbi-<année>`). Aucune tâche s'il n'y a eu aucun changement.
- Lexique ("gmbi") et "Pourquoi ?" (amende 150 € par logement).
- Nouveau `tests/test41.js` (mode local, dates simulées 20/05, 10/06, 05/07/2027) 13/13. test5, test30 49/49. En ligne.
- Données GTP actuelles : aucun changement entre le 2/01/2025 et le 1/01/2026 dans l'appli, donc pas de tâche pour 2026 ; la 1re tâche viendra le 1er juin 2027 (arrivées d'Antoine, Emma, Sofiane en 2026).

### 14/11/2026 (message 2) — Bloc 3 : DPE électrique
- **Sources vérifiées** :
  - [INC, inc-conso.fr](https://www.inc-conso.fr/content/1er-janvier-2026-abaissement-du-coefficient-de-conversion-de-lelectricite-des-dpe) : coefficient de l'électricité 1,9 depuis le 1er janvier 2026 (avant 2,3) ; attestation pour les DPE établis du 1er juillet 2021 au 31 décembre 2025, à télécharger sur l'Observatoire DPE-Audit de l'ADEME (observatoire-dpe-audit.ademe.fr/accueil).
  - [ecologie.gouv.fr](https://www.ecologie.gouv.fr/presse/dpe-audits-energetiques-publication-larrete-abaissant-facteur-conversion-lelectricite-17-1er) : 1,7 au 1er janvier 2027 (arrêté publié au Journal officiel le 31/08/2026) ; à partir de cette date, mise à jour gratuite et immédiate des DPE faits jusqu'au 31/12/2026, sans nouvelle visite.
  - [service-public.fr F1311](https://www.service-public.gouv.fr/particuliers/vosdroits/F1311) : révision interdite pour les logements F et G (baux signés, renouvelés ou reconduits depuis le 24 août 2022, métropole) ; une révision se demande dans l'année qui suit la date de révision, sinon elle est perdue ; pas d'effet rétroactif.
  - [service-public.fr F2042](https://www.service-public.gouv.fr/particuliers/vosdroits/F2042) : G exclu de la location depuis 2025, F à partir de 2028, E à partir de 2034.
  - Le site de l'ADEME (observatoire) bloque la lecture automatique : je n'ai pas pu lire sa page directement, seulement les pages officielles ci-dessus qui y renvoient.
- **Fiche logement** : champ "Numéro du DPE (13 caractères)" (`dpeNumero`, mis en majuscules, refusé s'il ne fait pas 13 caractères ; déjà rempli par "Retrouver le DPE").
- **Tâche** "Ton DPE peut s'améliorer gratuitement" (`tacheDpeElec`) : chauffage électrique ou pompe à chaleur, classe E, F ou G, DPE fait depuis le 1er juillet 2021 (date du DPE, sinon validité moins 10 ans). DPE de juillet 2021 à fin 2025 : à faire maintenant (1,9) ; DPE de 2026 : prévenu pour le 1er janvier 2027 (1,7) ; à partir de 2027 : nouvelle tâche pour tous les DPE d'avant 2027. Boutons "Copier le numéro" (ou "Noter le numéro" s'il manque) et "Ouvrir l'Observatoire". "C'est fait", et "Pourquoi ?" ajouté.
- **F ou G vers E ou mieux** (fiche du logement ou "Retrouver le DPE") : fenêtre "La révision de loyer est de nouveau possible" par locataire (montant si l'indice est connu, bouton Réviser) ; rappel : pas de rattrapage des mois passés, à demander dans l'année. L'écran de révision refusait déjà une date passée ; `revInfo` limitait déjà à un an après la date anniversaire.
- Nouveau `tests/test40.js` (mode local) 18/18. test5, test30 49/49 OK. En ligne.

### 14/11/2026 (message 2) — Bloc 2 : ne rien perdre
- **File des modifications sur l'appareil** (`ecrireSupabase`, `viderFile`, `appliquerFile`) : chaque modification est d'abord notée dans `localStorage gestion-sci-file-<espace>`, puis envoyée ; elle n'en sort que quand le serveur l'a reçue (et pas si elle a été remodifiée entre-temps). Avant : en cas d'échec, l'appli oubliait la modification (elle était perdue si on fermait l'appli). Renvoi : retour du réseau (`online`), retour dans l'appli (`visibilitychange`), ouverture de l'espace. À l'ouverture (copie de l'appareil ou chargement en ligne), les modifs en attente passent par-dessus les données en ligne, et le temps réel ne les écrase pas. Badge "⏳ N modifs en attente" à la place de "Synchronisé". Se déconnecter avec des modifs en attente : avertissement (elles seraient perdues).
- `tests/test32.js` complété : modif hors réseau gardée dans la file + badge, appli rouverte sans réseau (modif là), rouverte avec réseau (pas écrasée par la version en ligne, partie toute seule, file vide), retour du réseau sans recharger (événement online). 16/16.
- **Supabase** : l'API ne donne pas l'offre (accès refusé à l'organisation), mais la liste des sauvegardes est vide et la sauvegarde continue (PITR) n'est pas activée : c'est l'offre gratuite. D'après la doc officielle (supabase.com/docs/guides/platform/backups), les sauvegardes quotidiennes sont réservées aux offres Pro (7 jours), Team (14), Enterprise (30) ; l'offre gratuite n'en a pas. Base : 14 Mo, données de GTP : 70 ko.
- **Copie chaque semaine par e-mail** (Réglages › Sauvegarde et import, propriétaire seulement) : `supabase/sauvegarde.sql` appliqué (table `sauvegarde_hebdo`, RPC `sauvegarde_activer` réservée au propriétaire, tâche `sauvegarde` chaque lundi 6 h UTC) ; fonction `sauvegarde` (sans JWT ; tâche protégée par la clé `x-cle-cron` des notifications ; appel direct = propriétaire connecté vérifié). Même contenu que `exportJSON`. Avant d'activer ou d'envoyer : aperçu (adresse, taille, nombre de logements, locataires, documents) puis "Oui, activer" / "Oui, envoyer". **Brevo refuse les pièces jointes .json** (doc officielle, liste des extensions) : solution la plus simple, le fichier part en `.json.txt` (même JSON), et "Ouvrir une sauvegarde" accepte maintenant le `.txt`.
- Nouveau `tests/test39.js` (vraie base, comptes de test) 11/11 : aperçu, activer, arrêter, refus pour un autre compte. **Aucun e-mail envoyé pendant les tests** (aperçu seulement). test5, test30 49/49, test31 OK. En ligne.
- Pas vérifié : un vrai envoi (Théo : Réglages › Sauvegarde et import › M'envoyer une copie chaque semaine, case "maintenant" cochée), et l'ouverture du `.txt` reçu.

### 14/11/2026 (message 2) — Bloc 1 : quittances du mois en un geste
- Accueil et À faire : dès 2 quittances, bouton "Envoyer les N quittances" (bandeau en haut de À faire).
- Une seule fenêtre "Quittances à envoyer (N)" : une ligne par locataire et par mois (montant, logement), case à décocher, adresse e-mail modifiable, bouton "Voir" pour l'aperçu de chaque quittance ; un seul bouton "Oui, envoyer les N" (le nombre suit les coches). "⚠️ Un e-mail envoyé ne peut pas être annulé."
- Respecte "Pas besoin" (`qno-`) et `sansQuittance` (via `qAFaire`). Sans e-mail : listés à part avec "Télécharger le PDF".
- Une adresse corrigée dans la fenêtre est enregistrée sur la fiche du locataire, seulement si elle a vraiment été modifiée (défaut trouvé en test : quand un locataire avait 2 mois dans la liste, la 2e ligne remettait l'ancienne adresse). Chaque quittance part à l'adresse affichée sur sa ligne.
- Nouveau `tests/test38.js` (mode local, envoi simulé, clair et sombre) 24/24. test5, test22 (aucun envoi sans validation), test25, test30 49/49 OK. En ligne.

### 14/11/2026 (suite) — Partie 2 : intégrations (demande de Théo)
**A. Gratuites, codées et en ligne** (toujours en proposition : rien n'est rempli sans validation). Vérifiées avant de coder : service public, gratuit, sans clé, appelable depuis le téléphone (en-tête CORS `*` contrôlé).
- **Adresse (Géoplateforme IGN)** `https://data.geopf.fr/geocodage/search` (limite : 50 requêtes/s par adresse IP). Formulaire du logement : en tapant l'adresse, l'appli propose les adresses ; un choix remplit rue, code postal, ville et garde `banId`, `lat`, `lon` (oubliés si on retape l'adresse). Rien n'est enregistré avant "Enregistrer".
- **DPE (ADEME)** jeu "DPE Logements existants (depuis juillet 2021)", Licence Ouverte, `data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines`. Fiche logement › "Retrouver / Vérifier le DPE" : cherche par identifiant d'adresse (`identifiant_ban`), ou par numéro de DPE (13 caractères). Plusieurs DPE à la même adresse (un par logement de l'immeuble) : liste à choisir (classe énergie et climat, surface, complément, date, validité, expiré signalé), triée par surface la plus proche. "Utiliser ce DPE" note `dpe`, `dpeGes`, `dpeValidite`, `dpeDate`, `dpeNumero`.
- **Risques (Géorisques)** API v1 `www.georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=` (sans clé). Fiche logement › "État des risques" : liste des risques naturels et technologiques présents, lien vers le rapport complet, et bouton vers l'**ERP officiel** sur `errial.georisques.gouv.fr` (gratuit, à joindre au bail, moins de 6 mois). Le résumé n'est rangé dans les documents du logement que si on le demande ("vérifiés le …" sur la fiche). L'appli ne fabrique pas l'ERP officiel elle-même : seul le formulaire de l'État fait foi.
- Corrigé en testant : listes à choisir (DPE, et aussi dossiers Drive) dont les lignes se tassaient et se chevauchaient quand il y en a beaucoup.
- Nouveau `tests/test37.js` (mode local, vrais appels aux services publics avec une adresse publique neutre, clair et sombre) 24/24. Aucune donnée de GTP envoyée.

**B. Avec un compte à ouvrir par Théo : PAS codé.** Prix vérifiés sur les sites officiels le 14/11/2026 (HT).
1. **Yousign (devenu "Youtrust")** : signature en ligne des baux, avenants, états des lieux, sans imprimer ; l'appli saurait quand c'est signé et rangerait le PDF signé.
   - Prix : appli seule dès 9 €/mois (10 signatures/mois) ; pour la brancher à l'appli il faut l'offre **API** : Plus 104 €/mois ou Pro 129 €/mois, 500 signatures/an, engagement 12 mois. Espace de test (sandbox) gratuit, sans carte bancaire (durée annoncée : 40 jours).
   - Théo doit : créer un compte sandbox sur youtrust.com (Développeurs › "Créer un compte sandbox"), puis la clé API dans l'espace développeur ; plus tard l'offre API payante.
   - Code : par une fonction Supabase (clé secrète, retour "signé" par webhook). Environ 1 à 2 sessions.
2. **GoCardless** : prélèvement automatique des loyers (le locataire signe un mandat en ligne une fois, le loyer est prélevé tout seul, l'appli sait aussitôt, quittance prête, alerte si rejet). Plus besoin de surveiller la banque pour les loyers.
   - Prix (page tarifs France) : 1 % + 0,20 € par prélèvement, plafonné à 2 € (offre Standard), pas de frais de mise en place ni d'abonnement ; nom de la SCI sur les relevés en option 50 €/mois. Pour un loyer de 500 € : 2 €.
   - Théo doit : créer un compte GoCardless au nom de la SCI (Kbis, IBAN, pièce d'identité du gérant), puis un jeton d'accès (Développeurs › Créer un jeton) ; un compte sandbox gratuit pour l'essai.
   - Code : fonction Supabase + webhooks (mandats, paiements, rejets). Environ 2 sessions.
3. **Bridge ou Powens** : lire n'importe quel compte bancaire (toutes les banques françaises) sans Pennylane.
   - Prix : **aucun tarif public** chez l'un comme chez l'autre, devis commercial obligatoire. Espace de test : Bridge a une "Demo Bank" de test, Powens un bac à sable en libre-service.
   - Théo doit : demander un devis (bridgeapi.io ou powens.com), créer le compte développeur, récupérer l'identifiant et le secret client.
   - Code : fonction Supabase (secret), même rangement que Pennylane aujourd'hui. Environ 2 sessions. À comparer avec l'import du relevé (gratuit) et Pennylane (déjà branché).
4. **Stripe** : offre payante de l'appli (abonnement mensuel pour d'autres propriétaires).
   - Prix : 1,5 % + 0,25 € par paiement par carte européenne ; prélèvement SEPA 0,35 € ; abonnements (Stripe Billing) 0,7 % du montant ; pas de frais mensuels.
   - Théo doit : créer un compte Stripe (entreprise, IBAN), activer les paiements, récupérer la clé secrète et la clé publique (Développeurs › Clés API), décider du prix et de ce qui est payant. Et remplir le nom de l'éditeur dans les mentions légales avant toute vente.
   - Code : Stripe Checkout + webhook dans une fonction Supabase + blocage des fonctions payantes. Environ 2 à 3 sessions.

### 14/11/2026 — Drive partie 1 : plusieurs dossiers, dossier = logement, rangement automatique (demande de Théo)
- **Choix des dossiers** (`choisirDossierDrive`) : on coche plusieurs dossiers (Mon Drive + Partagé avec moi), on peut descendre dans un sous-dossier (› puis ← Retour), les coches restent. Enregistré dans `S.sci.driveDossiers` [{id, nom}] ; `S.sci.driveId` = le 1er (compatibilité, et un lien collé à la main remplace la liste). `indexerDriveG` lit tous les dossiers choisis et leurs sous-dossiers sans doublon ; chaque fichier garde ses dossiers (`ancetres`).
- **Avant l'écran Google** : "Google va dire que l'appli peut voir tout ton Drive. En vrai, elle ne lira que les dossiers que tu choisis juste après." `texteDrive()` et la page confidentialité mis à jour. Droit Google inchangé : `drive.readonly`.
- **Dossier = logement** : Docs › "Dossiers et logements" (liste repliée, un choix "Ce dossier =" par dossier) ; `S.sci.driveLogements` {dossierId: bienId}. `deviner()` prend le logement du dossier relié le plus proche (dossier ou sous-dossier), avant toute devinette par le nom ; le type vient toujours de `REGLES_DOCS`.
- **Rangement automatique** (`rangerAuto`, `lectureDriveFond`) : seulement le propriétaire, Drive connecté. Déclencheurs : dossiers choisis, dossier relié, logement ou locataire créé ou modifié, ouverture de l'appli (lecture en fond, 1 fois par 24 h au plus par appareil, `localStorage gestion-drive-lu-<espace>`). Range seul les documents sûrs (type trouvé ET logement trouvé sans égalité, ou par dossier relié) ; les autres restent en propositions. Chaque document : `auto: true` + `lot` ; `S.sci.driveLots` garde les 10 derniers. Message "N documents rangés automatiquement · Voir · Annuler" ; Docs › "Derniers rangements automatiques" avec Annuler. Annuler retire tout le lot et marque ces fichiers `drv-noauto-` (plus jamais rangés tout seuls, mais toujours proposés). Toujours `dejaLies`, `dejaTitres`, `drv-ign-`.
- **Bandeau** sur l'accueil si le Drive s'est déconnecté (pas si on l'a débranché soi-même : `S.sci.driveDebranche`).
- **Tests** : nouveau `tests/test36.js` (vraie base, compte de test, Google simulé) 22/22 : plusieurs dossiers, sous-dossier + retour, dossiers lus sans "Photos vacances", 4 rangés auto, document ignoré non rangé, message Voir/Annuler, aucun doublon en relançant, dossier relié -> facture d'un sous-dossier rangée, Annuler retire le lot et ne le range plus tout seul (reste proposé), renommer un logement relance, membre non propriétaire : rien, bandeau. Rejoué en sombre : OK (corrigé : bandeau coupé en colonnes, boutons du message peu lisibles en sombre). test33 adapté (cases à cocher, rangement auto) OK ; test5 OK ; test30 49/49.
- **Copie locale des vraies données GTP INVEST** (rien en ligne) : liste du Drive reconstruite à partir des 151 documents déjà rangés (mêmes identifiants Google, mêmes noms) -> 0 rangé une 2e fois, 0 proposition. Pas fait avec la vraie liste du Drive de Théo (je n'ai pas lu son Drive).
- En ligne. Pas vérifié : sur ton téléphone avec ton vrai Drive (choisir les dossiers, relier, rangement auto).

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

## Idées en réserve (proposées le 14/11/2026 par la session du compte principal, rien de codé)

Par ordre de priorité conseillé :
1. **Signature au doigt sur le téléphone** (état des lieux, bail, avenant, plan d'apurement) : zone de signature (canvas) pour le bailleur et le locataire, sur place ; la signature est ajoutée au PDF (jsPDF addImage), avec date, heure et nom, puis le PDF signé est rangé dans les documents du bien. Gratuit, sans compte, fin du papier pour l'état des lieux. ~1 session.
2. **Surveillance + anti-mise en veille** : une GitHub Action planifiée chaque jour (gratuite) qui ouvre l'appli en ligne, appelle Supabase (une requête légère) et échoue si quelque chose ne répond pas → GitHub envoie un e-mail à Théo. Évite aussi la mise en pause de la base gratuite après 7 jours sans activité. ~½ session.
3. **Trésorerie des 12 prochains mois** (Compta) : loyers attendus − échéances de prêts − taxe foncière − assurances − autres dépenses récurrentes, solde prévu mois par mois à partir du solde Pennylane ; alerte dans À faire si le compte passe sous un seuil choisi. ~1 session.
4. **Activité entre associés** : « Gabriel a marqué le loyer d'Emma payé · il y a 2 h », « Pierre a envoyé la quittance de novembre » (colonne `maj_par` + `envois` déjà là) ; évite les doublons (deux associés qui relancent le même locataire). ~1 session.
5. **Vue « tous mes espaces »** pour qui a une SCI et des biens en nom propre : total des loyers, retards et à faire de tous ses espaces sur un seul écran. ~1 session.
6. **Découper `index.html`** (plus de 5 000 lignes) en plusieurs fichiers (calculs, documents, banque, écrans) : moins de conflits quand deux sessions travaillent l'une après l'autre, corrections plus sûres. ~1 session, à faire quand aucune autre session ne travaille.
7. **Assistant « Pose ta question »** (API Claude) : réponses sur la loi et brouillons de courriers à partir des données de l'espace. Demande une clé API Anthropic (payant à l'usage, quelques centimes par question).
8. **DossierFacile** (dossier locataire vérifié par l'État) pour les candidats : à étudier, demande une convention de partenariat avec le service.
