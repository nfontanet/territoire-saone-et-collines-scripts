/**
 * ============================================================
 * 04_MiseEnForme.gs
 * Mise en forme des onglets du classeur
 * ============================================================
 */


/**
 * Applique la mise en forme aux différents onglets.
 */
function mettreEnFormeOnglets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  mettreEnFormeOngletMembres_(ss);
  mettreEnFormeOngletMapping_(ss);
  mettreEnFormeOngletConfiguration_(ss);
  mettreEnFormeOngletInfos_(ss);
  mettreEnFormeOngletJournal_(ss);

  SpreadsheetApp.flush();
}


/**
 * Mise en forme de l'onglet Membres.
 *
 * Les données existantes ne sont pas modifiées.
 */
function mettreEnFormeOngletMembres_(ss) {
  const feuille = ss.getSheetByName(CONFIG.ONGLET_MEMBRES);

  if (!feuille) {
    return;
  }

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne < 1 || derniereColonne < 1) {
    return;
  }

  const ligneEntetes = trouverLigneEntetesMembres_(feuille);

  if (!ligneEntetes) {
    console.warn(
      'Mise en forme de Membres ignorée : ' +
      'en-têtes Email et Mission introuvables dans les cinq premières lignes.'
    );
    return;
  }

  feuille.getRange(
    ligneEntetes,
    1,
    1,
    derniereColonne
  )
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground(CONFIG.COULEUR_ENTETE || '#1F4E78')
    .setVerticalAlignment('middle')
    .setWrap(true);

  feuille.setRowHeight(ligneEntetes, 32);
  feuille.setFrozenRows(ligneEntetes);

  const filtreExistant = feuille.getFilter();

  if (filtreExistant) {
    filtreExistant.remove();
  }

  if (derniereLigne > ligneEntetes) {
    feuille.getRange(
      ligneEntetes,
      1,
      derniereLigne - ligneEntetes + 1,
      derniereColonne
    ).createFilter();

    feuille.getRange(
      ligneEntetes + 1,
      1,
      derniereLigne - ligneEntetes,
      derniereColonne
    ).setVerticalAlignment('middle');
  }

  ajusterLargeursColonnes_(feuille, derniereColonne);
}


/**
 * Recherche la ligne d'en-têtes de Membres dans les cinq
 * premières lignes.
 *
 * La même ligne doit contenir un en-tête de courriel
 * et un en-tête de mission.
 *
 * Les cellules contenant une adresse avec @ ne sont pas
 * considérées comme des en-têtes de courriel.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @return {number|null}
 */
function trouverLigneEntetesMembres_(feuille) {
  const nombreLignes = Math.min(5, feuille.getLastRow());
  const nombreColonnes = feuille.getLastColumn();

  if (nombreLignes < 1 || nombreColonnes < 1) {
    return null;
  }

  const valeurs = feuille.getRange(
    1,
    1,
    nombreLignes,
    nombreColonnes
  ).getDisplayValues();

  for (let i = 0; i < valeurs.length; i++) {
    let contientEmail = false;
    let contientMission = false;

    for (let j = 0; j < valeurs[i].length; j++) {
      const valeur = String(valeurs[i][j] || '').trim();

      if (!valeur || valeur.indexOf('@') !== -1) {
        continue;
      }

      const entete = normaliserEnteteMiseEnForme_(valeur);

      if (
        typeof CONFIG.REGEX_EMAIL_ENTETE !== 'undefined' &&
        CONFIG.REGEX_EMAIL_ENTETE.test(valeur)
      ) {
        contientEmail = true;
      } else if (entete === 'email') {
        contientEmail = true;
      }

      if (
        typeof CONFIG.REGEX_MISSION_ENTETE !== 'undefined' &&
        CONFIG.REGEX_MISSION_ENTETE.test(valeur)
      ) {
        contientMission = true;
      } else if (entete === 'mission') {
        contientMission = true;
      }
    }

    if (contientEmail && contientMission) {
      return i + 1;
    }
  }

  return null;
}


/**
 * Normalise un intitulé de colonne.
 *
 * @param {*} valeur
 * @return {string}
 */
function normaliserEnteteMiseEnForme_(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


/**
 * Mise en forme de l'onglet Mapping.
 *
 * La feuille conserve exclusivement ses données manuelles.
 */
function mettreEnFormeOngletMapping_(ss) {
  const feuille = ss.getSheetByName(CONFIG.ONGLET_MAPPING);

  if (!feuille) {
    return;
  }

  mettreEnFormeTableSimple_(feuille);
}


/**
 * Mise en forme de l'onglet Config.
 */
function mettreEnFormeOngletConfiguration_(ss) {
  const feuille = ss.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille) {
    return;
  }

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne < 1 || derniereColonne < 1) {
    return;
  }

  const colonnesFormatees = Math.min(derniereColonne, 2);

  feuille.getRange(
    1,
    1,
    derniereLigne,
    colonnesFormatees
  )
    .setVerticalAlignment('middle')
    .setWrap(true);

  feuille.setColumnWidth(1, 240);

  if (colonnesFormatees >= 2) {
    feuille.setColumnWidth(2, 320);
  }

  feuille.setFrozenRows(1);

  feuille.getRange(
    1,
    1,
    1,
    derniereColonne
  )
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground(CONFIG.COULEUR_ENTETE || '#1F4E78')
    .setVerticalAlignment('middle')
    .setWrap(true);

  feuille.setRowHeight(1, 32);
}


/**
 * Mise en forme de la feuille Infos configuration.
 *
 * Cette feuille est un guide et non un tableau de données :
 * aucun filtre n'est ajouté.
 */
function mettreEnFormeOngletInfos_(ss) {
  const feuille = ss.getSheetByName(CONFIG.ONGLET_INFOS);

  if (!feuille) {
    return;
  }

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne < 1 || derniereColonne < 1) {
    return;
  }

  feuille.getRange(
    1,
    1,
    derniereLigne,
    derniereColonne
  )
    .setVerticalAlignment('top')
    .setWrap(true);

  feuille.setColumnWidth(1, 240);

  if (derniereColonne >= 2) {
    feuille.setColumnWidth(2, 420);
  }

  feuille.setFrozenRows(0);
}


/**
 * Mise en forme de l'onglet Journal.
 *
 * Les couleurs des lignes de journal sont conservées :
 * elles sont gérées par le module 08_Journal.gs.
 */
function mettreEnFormeOngletJournal_(ss) {
  const feuille = ss.getSheetByName(CONFIG.ONGLET_JOURNAL);

  if (!feuille) {
    return;
  }

  mettreEnFormeTableSimple_(feuille);

  if (feuille.getLastColumn() >= 1) {
    feuille.setColumnWidth(1, 160);
  }

  if (feuille.getLastColumn() >= 2) {
    feuille.setColumnWidth(2, 190);
  }

  if (feuille.getLastColumn() >= 3) {
    feuille.setColumnWidth(3, 180);
  }

  if (feuille.getLastColumn() >= 4) {
    feuille.setColumnWidth(4, 450);
  }
}


/**
 * Mise en forme générique d'un tableau dont les en-têtes
 * sont sur la première ligne.
 *
 * Cette fonction est réservée aux onglets de type tableau.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 */
function mettreEnFormeTableSimple_(feuille) {
  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  if (derniereLigne < 1 || derniereColonne < 1) {
    return;
  }

  feuille.getRange(
    1,
    1,
    1,
    derniereColonne
  )
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground(CONFIG.COULEUR_ENTETE || '#1F4E78')
    .setVerticalAlignment('middle')
    .setWrap(true);

  feuille.setRowHeight(1, 30);
  feuille.setFrozenRows(1);

  feuille.getRange(
    1,
    1,
    derniereLigne,
    derniereColonne
  ).setVerticalAlignment('middle');

  const filtreExistant = feuille.getFilter();

  if (filtreExistant) {
    filtreExistant.remove();
  }

  if (derniereLigne > 1) {
    feuille.getRange(
      1,
      1,
      derniereLigne,
      derniereColonne
    ).createFilter();
  }

  ajusterLargeursColonnes_(feuille, derniereColonne);
}


/**
 * Ajuste les largeurs de colonnes.
 *
 * Les colonnes restent dans une plage lisible.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @param {number} nombreColonnes
 */
function ajusterLargeursColonnes_(feuille, nombreColonnes) {
  const largeurMinimale = 100;
  const largeurMaximale = 350;

  for (let colonne = 1; colonne <= nombreColonnes; colonne++) {
    feuille.autoResizeColumn(colonne);

    const largeurActuelle = feuille.getColumnWidth(colonne);

    if (largeurActuelle < largeurMinimale) {
      feuille.setColumnWidth(colonne, largeurMinimale);
    } else if (largeurActuelle > largeurMaximale) {
      feuille.setColumnWidth(colonne, largeurMaximale);
    }
  }
}