/**
 * ============================================================
 * 03_Saison.gs
 * Détection automatique de la saison
 * ============================================================
 *
 * Prérequis :
 * - Service avancé Google Drive API v3 activé.
 * - Constante CONFIG définie dans 00_Config.gs.
 *
 * Fonctions principales :
 * - detecterSaison_()
 * - debugDetectionSaison()
 */


/**
 * Détecte la saison à partir des dossiers ancêtres du classeur.
 *
 * Ordre de recherche :
 * 1. Dossiers parents du classeur, en remontant l'arborescence.
 * 2. Nom du Drive partagé, si le classeur y est stocké.
 * 3. Saison par défaut définie dans CONFIG.
 *
 * @return {string} Saison détectée, par exemple "2026-2027".
 */
function detecterSaison_() {
  const resultat = rechercherSaisonDansDrive_();

  if (resultat.saison) {
    console.log(
      'Saison détectée : ' +
      resultat.saison +
      ' — Source : ' +
      resultat.source
    );

    return resultat.saison;
  }

  const saisonParDefaut = CONFIG.SAISON_PAR_DEFAUT;

  console.warn(
    'Aucune saison détectée dans Drive. ' +
    'Utilisation de la saison par défaut : ' +
    saisonParDefaut
  );

  return saisonParDefaut;
}


/**
 * Recherche une saison dans l'arborescence Drive.
 *
 * @return {{saison: (string|null), source: string}}
 */
function rechercherSaisonDansDrive_() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    return {
      saison: null,
      source: 'Aucun classeur actif'
    };
  }

  const fichier = obtenirMetadonneesDrive_(classeur.getId());

  if (!fichier) {
    return {
      saison: null,
      source: 'Métadonnées du classeur indisponibles'
    };
  }

  const dossiersVisites = {};

  const saisonParents = rechercherSaisonDansParents_(
    fichier.parents || [],
    dossiersVisites
  );

  if (saisonParents) {
    return {
      saison: saisonParents,
      source: 'Dossier parent ou ancêtre du classeur'
    };
  }

  if (fichier.driveId) {
    const saisonDrivePartage = rechercherSaisonDansDrivePartage_(
      fichier.driveId
    );

    if (saisonDrivePartage) {
      return {
        saison: saisonDrivePartage,
        source: 'Nom du Drive partagé'
      };
    }
  }

  return {
    saison: null,
    source: 'Aucune saison trouvée'
  };
}


/**
 * Recherche une saison dans les dossiers parents et leurs ancêtres.
 *
 * @param {string[]} parentsIds Identifiants des dossiers parents.
 * @param {Object} dossiersVisites Dossiers déjà examinés.
 * @return {string|null}
 */
function rechercherSaisonDansParents_(
  parentsIds,
  dossiersVisites
) {
  if (!parentsIds || parentsIds.length === 0) {
    return null;
  }

  for (let i = 0; i < parentsIds.length; i++) {
    const dossierId = parentsIds[i];

    if (!dossierId || dossiersVisites[dossierId]) {
      continue;
    }

    dossiersVisites[dossierId] = true;

    const dossier = obtenirMetadonneesDrive_(dossierId);

    if (!dossier) {
      continue;
    }

    const saison = extraireSaisonDepuisNom_(dossier.name);

    if (saison) {
      return saison;
    }

    const saisonAncetre = rechercherSaisonDansParents_(
      dossier.parents || [],
      dossiersVisites
    );

    if (saisonAncetre) {
      return saisonAncetre;
    }
  }

  return null;
}


/**
 * Extrait une saison au format AAAA-AAAA depuis un nom.
 *
 * Exemples :
 * - "Club - 2026-2027" -> "2026-2027"
 * - "Saison 2025–2026 Archives" -> "2025-2026"
 * - "Territoire 2026—2027" -> "2026-2027"
 * - "Documents généraux" -> null
 *
 * La deuxième année doit être égale à la première année + 1.
 *
 * @param {string} nom Nom du dossier ou du Drive.
 * @return {string|null}
 */
function extraireSaisonDepuisNom_(nom) {
  if (!nom) {
    return null;
  }

  const regex = /(?:^|\D)(20\d{2})\s*[-–—]\s*(20\d{2})(?:\D|$)/;
  const correspondance = String(nom).match(regex);

  if (!correspondance) {
    return null;
  }

  const anneeDebut = Number(correspondance[1]);
  const anneeFin = Number(correspondance[2]);

  if (anneeFin !== anneeDebut + 1) {
    return null;
  }

  return anneeDebut + '-' + anneeFin;
}


/**
 * Récupère les métadonnées d'un fichier ou dossier Drive.
 *
 * Nécessite le service avancé Google Drive API v3.
 *
 * @param {string} fichierId Identifiant Drive.
 * @return {Object|null}
 */
function obtenirMetadonneesDrive_(fichierId) {
  if (!fichierId) {
    return null;
  }

  try {
    return Drive.Files.get(fichierId, {
      supportsAllDrives: true,
      fields: 'id,name,mimeType,parents,driveId'
    });
  } catch (erreur) {
    console.warn(
      'Impossible de lire les métadonnées Drive pour ' +
      fichierId +
      ' : ' +
      (erreur && erreur.message
        ? erreur.message
        : String(erreur))
    );

    return null;
  }
}


/**
 * Recherche une saison dans le nom d'un Drive partagé.
 *
 * @param {string} driveId Identifiant du Drive partagé.
 * @return {string|null}
 */
function rechercherSaisonDansDrivePartage_(driveId) {
  if (!driveId) {
    return null;
  }

  try {
    const drivePartage = Drive.Drives.get(driveId, {
      fields: 'id,name'
    });

    return extraireSaisonDepuisNom_(drivePartage.name);

  } catch (erreur) {
    console.warn(
      'Impossible de lire le nom du Drive partagé : ' +
      (erreur && erreur.message
        ? erreur.message
        : String(erreur))
    );

    return null;
  }
}


/**
 * Fonction de diagnostic accessible depuis le menu Apps Script.
 *
 * Affiche :
 * - la saison détectée ;
 * - la source de détection ;
 * - la saison par défaut ;
 * - la saison finalement utilisée.
 *
 * @return {string} Saison finalement utilisée.
 */
function debugDetectionSaison() {
  const ui = SpreadsheetApp.getUi();
  const resultat = rechercherSaisonDansDrive_();
  const saisonParDefaut = CONFIG.SAISON_PAR_DEFAUT;
  const saisonFinale = resultat.saison || saisonParDefaut;

  const message = [
    'Diagnostic de détection de saison',
    '',
    'Saison détectée : ' +
      (resultat.saison || 'Aucune'),
    'Source : ' + resultat.source,
    'Saison par défaut : ' + saisonParDefaut,
    'Saison utilisée : ' + saisonFinale,
    '',
    'Si aucune saison n’est détectée, vérifiez le nom des dossiers parents',
    'et l’activation du service avancé Google Drive API v3.'
  ].join('\n');

  console.log(message);

  ui.alert(
    'Diagnostic de saison',
    message,
    ui.ButtonSet.OK
  );

  return saisonFinale;
}