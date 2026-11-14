# Journal de bord — appli « Gestion locative »

Plusieurs sessions Claude (comptes différents) travaillent sur ce projet, **une à la fois**.
Règle pour chaque session :

1. **Au début** : `git pull origin ccr-6df8be48-11wmro`, lire `REPRISE.md` puis ce journal (surtout « À faire »).
2. **À la fin** : ajouter une entrée en haut de « Historique » (date, ce qui a été fait, ce qui reste, ce qui n'est pas vérifié), mettre à jour « À faire », puis `git add -A && git commit && git push origin ccr-6df8be48-11wmro`.
3. Toujours travailler sur la branche **`ccr-6df8be48-11wmro`** (c'est la branche de l'appli en ligne).
4. Si l'appli a été modifiée : `node tests/test5.js` (au minimum) puis `./deploy.sh`, et noter dans l'entrée si c'est en ligne.
5. Ne jamais mettre de clé dans Git : elles vont dans `.env` (ignoré par Git).

## À faire (priorités)

- [ ] **Prêts GTP** : saisir le ou les prêts (Compta › Emprunts › + Prêt, ou importer le tableau de la banque), puis "Voir et ventiler" les échéances proposées ; vérifier les 8 "ECH PRET INT" d'environ 1 540 €.
- [ ] **Copie de sauvegarde** : Réglages › Sauvegarde et import › "M'envoyer une copie chaque semaine" (case "maintenant" cochée pour vérifier la réception et rouvrir le .txt).
- [ ] **Espace locataire** : décider (fiche dans l'Historique du 14/11, bloc 6).
- [ ] **Drive** : sur ton téléphone, choisir tes dossiers (plusieurs possibles), relier chaque dossier de logement (Docs › Dossiers et logements), vérifier le 1er rangement automatique (Annuler si besoin).
- [ ] **DPE et risques** : sur chaque logement, "Retrouver le DPE" puis "État des risques" ; faire l'ERP officiel sur errial.georisques.gouv.fr avant le prochain bail.
- [ ] **Services payants** (Youtrust, GoCardless, Bridge/Powens, Stripe) : fiches dans l'Historique du 14/11 ; rien codé tant que Théo n'a pas ouvert de compte.
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
