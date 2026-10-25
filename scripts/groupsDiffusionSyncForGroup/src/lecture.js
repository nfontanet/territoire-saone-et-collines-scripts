/**
 * ============================================================
 * 05_Lecture.gs
 * Lecture et détection des colonnes de Membres
 * ============================================================
 */


/**
 * Vérifie que l'onglet Membres existe et contient les colonnes
 * obligatoires Email (ou équivalent) et Mission.
 *
 * @return {Object} Résultat de la vérification.
 */
function verifierColonnesMembres_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(CONFIG.ONGLET_MEMBRES);

  if (!feuille) {
    throw new Error(
      'L’onglet "' + CONFIG.ONGLET_MEMBRES + '" est introuvable.'
    );
  }

  const entetes = obtenirEntetesMembres_(feuille);

  if (!entetes) {
    throw new Error(
      'Impossible de détecter les en-têtes de Membres dans les ' +
      'cinq premières lignes. Les colonnes de courriel et Mission ' +
      'doivent être présentes sur la même ligne.'
    );
  }

  const colonnes = obtenirColonnesMembres_(feuille);

  const manquantes = [];

  if (!colonnes.email) {
    manquantes.push('Email (ou équivalent)');
  }

  if (!colonnes.mission) {
    manquantes.push('Mission');
  }

  if (manquantes.length > 0) {
    throw new Error(
      'Colonnes obligatoires manquantes dans Membres : ' +
      manquantes.join(', ') + '.'
    );
  }

  return {
    feuille: feuille,
    ligneEntetes: entetes.ligne,
    colonnes: colonnes
  };
}


/**
 * Recherche la ligne des en-têtes dans les cinq premières lignes.
 *
 * Les colonnes de courriel et Mission doivent être sur la même ligne.
 * Les cellules contenant @ ne sont pas considérées comme des en-têtes.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @return {{ligne:number, valeurs:string[]}|null}
 */
function obtenirEntetesMembres_(feuille) {
  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne < 1 || derniereColonne < 1) {
    return null;
  }

  const nombreLignes = Math.min(5, derniereLigne);

  const valeurs = feuille.getRange(
    1,
    1,
    nombreLignes,
    derniereColonne
  ).getDisplayValues();

  for (let i = 0; i < valeurs.length; i++) {
    let aEmail = false;
    let aMission = false;

    for (let j = 0; j < valeurs[i].length; j++) {
      const valeur = String(valeurs[i][j] || '').trim();

      if (!valeur || valeur.indexOf('@') !== -1) {
        continue;
      }

      if (estEnteteEmailLecture_(valeur)) {
        aEmail = true;
      }

      if (estEnteteMissionLecture_(valeur)) {
        aMission = true;
      }
    }

    if (aEmail && aMission) {
      return {
        ligne: i + 1,
        valeurs: valeurs[i]
      };
    }
  }

  return null;
}


/**
 * Détermine les numéros de colonnes utiles dans Membres.
 *
 * Les numéros de colonnes retournés commencent à 1,
 * conformément aux méthodes Google Sheets.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @return {Object}
 */
function obtenirColonnesMembres_(feuille) {
  const entetes = obtenirEntetesMembres_(feuille);

  const resultat = {
    email: null,
    mission: null,
    statutDiffusion: null
  };

  if (!entetes) {
    return resultat;
  }

  entetes.valeurs.forEach(function(valeur, index) {
    const texte = String(valeur || '').trim();

    if (!texte || texte.indexOf('@') !== -1) {
      return;
    }

    const numeroColonne = index + 1;

    if (
      resultat.email === null &&
      estEnteteEmailLecture_(texte)
    ) {
      resultat.email = numeroColonne;
    }

    if (
      resultat.mission === null &&
      estEnteteMissionLecture_(texte)
    ) {
      resultat.mission = numeroColonne;
    }

    if (
      resultat.statutDiffusion === null &&
      estEnteteStatutDiffusionLecture_(texte)
    ) {
      resultat.statutDiffusion = numeroColonne;
    }
  });

  return resultat;
}


/**
 * Indique si un intitulé correspond à une colonne de courriel.
 *
 * @param {*} valeur
 * @return {boolean}
 */
function estEnteteEmailLecture_(valeur) {
  const texte = String(valeur || '').trim();

  if (!texte || texte.indexOf('@') !== -1) {
    return false;
  }

  if (typeof CONFIG.REGEX_EMAIL_ENTETE !== 'undefined') {
    return CONFIG.REGEX_EMAIL_ENTETE.test(texte);
  }

  return /mail|courriel/i.test(texte);
}


/**
 * Indique si un intitulé correspond à la colonne Mission.
 *
 * @param {*} valeur
 * @return {boolean}
 */
function estEnteteMissionLecture_(valeur) {
  const texte = String(valeur || '').trim();

  if (!texte || texte.indexOf('@') !== -1) {
    return false;
  }

  if (typeof CONFIG.REGEX_MISSION_ENTETE !== 'undefined') {
    return CONFIG.REGEX_MISSION_ENTETE.test(texte);
  }

  return /mission/i.test(texte);
}


/**
 * Indique si un intitulé correspond à Statut Diffusion.
 *
 * @param {*} valeur
 * @return {boolean}
 */
function estEnteteStatutDiffusionLecture_(valeur) {
  return normaliserEnteteLecture_(valeur) === 'statut diffusion';
}


/**
 * Normalise un intitulé de colonne.
 *
 * @param {*} valeur
 * @return {string}
 */
function normaliserEnteteLecture_(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


/**
 * Lit les lignes de données de Membres.
 *
 * Les lignes situées avant ou sur la ligne d'en-têtes
 * ne sont pas considérées comme des membres.
 *
 * Aucune cellule n'est modifiée par cette fonction.
 *
 * @return {Object[]} Liste des membres.
 */
function lireMembres_() {
  const verification = verifierColonnesMembres_();
  const feuille = verification.feuille;
  const ligneEntetes = verification.ligneEntetes;
  const colonnes = verification.colonnes;

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne <= ligneEntetes) {
    return [];
  }

  const nombreLignes = derniereLigne - ligneEntetes;

  const valeurs = feuille.getRange(
    ligneEntetes + 1,
    1,
    nombreLignes,
    derniereColonne
  ).getValues();

  return valeurs.map(function(ligne, index) {
    const email = ligne[colonnes.email - 1];
    const mission = ligne[colonnes.mission - 1];

    const statut = colonnes.statutDiffusion
      ? ligne[colonnes.statutDiffusion - 1]
      : '';

    return {
      ligneFeuille: ligneEntetes + index + 1,
      email: normaliserEmailLecture_(email),
      mission: String(mission || '').trim(),
      missions: separerMissionsLecture_(mission),
      statutDiffusion: String(statut || '').trim(),
      valeurs: ligne
    };
  });
}


/**
 * Sépare les missions contenues dans une cellule.
 *
 * Les missions sont séparées par des virgules.
 * Les espaces superflus et les valeurs vides sont supprimés.
 *
 * @param {*} valeur
 * @return {string[]}
 */
function separerMissionsLecture_(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') {
    return [];
  }

  return String(valeur)
    .split(',')
    .map(function(mission) {
      return String(mission).trim();
    })
    .filter(function(mission) {
      return mission !== '';
    });
}


/**
 * Normalise une adresse email.
 *
 * @param {*} valeur
 * @return {string}
 */
function normaliserEmailLecture_(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase();
}


/**
 * Recherche les membres par adresse email.
 *
 * Plusieurs lignes peuvent être retournées si une adresse
 * apparaît plusieurs fois dans la feuille.
 *
 * @param {string} email Adresse recherchée.
 * @return {Object[]}
 */
function rechercherMembresParEmail_(email) {
  const emailRecherche = normaliserEmailLecture_(email);

  if (!emailRecherche) {
    return [];
  }

  return lireMembres_().filter(function(membre) {
    return membre.email === emailRecherche;
  });
}


/**
 * Recherche les membres associés à une mission.
 *
 * Une ligne est retenue si l'une de ses missions correspond
 * à la mission recherchée, sans tenir compte de la casse,
 * des accents ou des espaces superflus.
 *
 * @param {string} mission Mission recherchée.
 * @return {Object[]}
 */
function rechercherMembresParMission_(mission) {
  const missionRecherche = normaliserMissionLecture_(mission);

  if (!missionRecherche) {
    return [];
  }

  return lireMembres_().filter(function(membre) {
    return membre.missions.some(function(missionMembre) {
      return normaliserMissionLecture_(missionMembre) ===
        missionRecherche;
    });
  });
}


/**
 * Normalise une mission pour comparaison.
 *
 * @param {*} valeur
 * @return {string}
 */
function normaliserMissionLecture_(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


/**
 * Recherche la colonne Statut Diffusion.
 *
 * Retourne null si cette colonne n'existe pas.
 *
 * @return {number|null}
 */
function trouverColonneStatutDiffusion_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(CONFIG.ONGLET_MEMBRES);

  if (!feuille) {
    return null;
  }

  const colonnes = obtenirColonnesMembres_(feuille);

  return colonnes.statutDiffusion;
}