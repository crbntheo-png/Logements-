# Gestion SCI

Appli de gestion locative pour une SCI : biens, locataires, loyers, quittances, relances, baux, compta.

Tout tient dans un seul fichier : `index.html`. Il suffit de l'ouvrir dans un navigateur (Chrome, Firefox, Safari).

## Ce que fait l'appli

- **Locataires d'abord** : une carte par locataire avec le loyer du mois et ses prochaines étapes. Un appui sur "A payé" et la quittance PDF part par e-mail (Gmail).
- **Révision de loyer automatique** : les indices IRL officiels de l'INSEE sont dans l'appli, le nouveau loyer est calculé à la date anniversaire (bloqué si DPE F ou G).
- **Partage** : dans la version en ligne (claude.ai), les données sont stockées en ligne et partagées entre associés.

## Détail

- **Tableau de bord** : la liste de ce qu'il faut faire, calculée toute seule (loyers impayés, quittances à envoyer, révision IRL, assurance habitation, départs, dépôt de garantie, régularisation des charges, biens vides, DPE F/G, taxe foncière, 2072, AG annuelle, rappels perso).
- **Loyers** : un clic sur "Encaissé" quand le locataire a payé. Paiement partiel, prorata d'entrée/sortie, historique.
- **Documents en PDF** : quittance, reçu partiel, avis d'échéance, relance (3 niveaux jusqu'à la mise en demeure), courrier de révision de loyer, bail (vide 3 ou 6 ans selon SCI familiale ou non, meublé, étudiant, mobilité), bilan annuel.
- **Compta** : dépenses par bien, résultat par bien, part de chaque associé, export CSV pour le comptable.
- **Sauvegarde** : fichier à télécharger et à rouvrir sur un autre ordinateur.

## Limites connues

- Ouvert en fichier local, les données restent dans le navigateur et l'envoi Gmail n'est pas disponible (lien mailto à la place).
- Les indices IRL publiés après le T3 2026 sont à ajouter dans Réglages.
- Pas de lien avec la banque.
- Le bail est un modèle à relire avant signature (quelques champs "……" à compléter à la main).
