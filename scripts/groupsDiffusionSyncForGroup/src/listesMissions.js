
/**
 * ============================================================
 * 08_ListesMissions.gs
 * Listes déroulantes multiples des missions
 * ============================================================
 *
 * Les options proviennent de la colonne Mission de Mapping.
 * Les missions choisies sont conservées dans une cellule,
 * séparées par des virgules.
 */

/**
 * Actualise les listes déroulantes de la colonne Mission
 * dans l'onglet Adhérents.
 *
 * Les valeurs déjà présentes dans les cellules ne sont pas
 * modifiées par cette fonction.
 */
function actualiserListesMissionsAdherents() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const feuilleAdherents = ss.getSheetByName(CONFIG.ONGLET_MEMBRES);
    const feuilleMapping = ss.getSheetByName(CONFIG.ONGLET_MAPPING);

    if (!feuilleAdherents) {
      throw new Error(
        'Onglet introuvable : ' + CONFIG.ONGLET_MEMBRES
      );
    }

    if (!feuilleMapping) {
      throw new Error(
        'Onglet introuvable : ' + CONFIG.ONGLET_MAPPING
      );
    }

    // Détecter la colonne Mission dans Adhérents.
    const verification = verifierColonnesMembres_();
    const colonneMission = verification.colonnes.mission;
    const ligneDebut = verification.ligneEntetes + 1;

    // Lire les missions depuis Mapping.
    const missions = obtenirMissionsDepuisMapping_(feuilleMapping);

    if (missions.length === 0) {
      throw new Error(
        'Aucune mission trouvée dans la colonne Mission de Mapping.'
      );
    }

    const nombreLignes = feuilleAdherents.getMaxRows() - ligneDebut + 1;

    if (nombreLignes <= 0) {
      throw new Error(
        'Aucune ligne disponible sous les en-têtes de Adhérents.'
      );
    }

    const plage = feuilleAdherents.getRange(
      ligneDebut,
      colonneMission,
      nombreLignes,
      1
    );

    // Autoriser les valeurs composées de plusieurs missions.
    // Le contrôle de validation ne doit pas rejeter les cellules
    // après qu'une sélection multiple a été enregistrée.
    const validation = SpreadsheetApp.newDataValidation()
      .requireValueInList(missions, true)
      .setAllowInvalid(true)
      .setHelpText(
        'Sélectionnez une mission. Pour en ajouter ou en retirer, ' +
        'sélectionnez une autre mission dans la liste.'
      )
      .build();

    plage.setDataValidation(validation);

    journaliserActionListesMissions_(
      'Actualisation des listes déroulantes',
      'OK',
      missions.length + ' missions proposées dans ' +
        nombreLignes + ' cellules.'
    );

    ui.alert(
      'Listes de missions actualisées',
      missions.length + ' missions sont maintenant proposées dans ' +
      'la colonne Mission de Adhérents.\n\n' +
      'Les valeurs déjà présentes ont été conservées.',
      ui.ButtonSet.OK
    );

  } catch (erreur) {
    journaliserActionListesMissions_(
      'Actualisation des listes déroulantes',
      'ERREUR',
      erreur.message || String(erreur)
    );

    ui.alert(
      'Impossible d’actualiser les listes de missions',
      erreur.message || String(erreur),
      ui.ButtonSet.OK
    );
  }
}


/**
 * Récupère les missions uniques depuis la colonne Mission
 * de Mapping. Les intitulés sont conservés tels qu'ils sont écrits.
 */
function obtenirMissionsDepuisMapping_(feuilleMapping) {
  const derniereLigne = feuilleMapping.getLastRow();
  const derniereColonne = feuilleMapping.getLastColumn();

  if (derniereLigne < 2 || derniereColonne < 1) {
    return [];
  }

  const valeurs = feuilleMapping
    .getRange(1, 1, Math.min(5, derniereLigne), derniereColonne)
    .getDisplayValues();

  let ligneEntetes = -1;
  let colonneMission = -1;

  for (let i = 0; i < valeurs.length; i++) {
    for (let j = 0; j < valeurs[i].length; j++) {
      const entete = String(valeurs[i][j] || '').trim();

      if (normaliserMissionListes_(entete) === 'mission') {
        ligneEntetes = i + 1;
        colonneMission = j + 1;
        break;
      }
    }

    if (colonneMission !== -1) {
      break;
    }
  }

  if (colonneMission === -1) {
    throw new Error(
      'Impossible de trouver l’en-tête « Mission » dans Mapping.'
    );
  }

  if (derniereLigne <= ligneEntetes) {
    return [];
  }

  const cellules = feuilleMapping.getRange(
    ligneEntetes + 1,
    colonneMission,
    derniereLigne - ligneEntetes,
    1
  ).getDisplayValues();

  const missions = [];
  const dejaVues = {};

  cellules.forEach(function(ligne) {
    const mission = String(ligne[0] || '').trim();
    const cle = normaliserMissionListes_(mission);

    if (mission && !dejaVues[cle]) {
      dejaVues[cle] = true;
      missions.push(mission);
    }
  });

  return missions;
}


/**
 * Gère la sélection multiple dans la colonne Mission.
 *
 * Lorsqu'une mission est sélectionnée :
 * - elle est ajoutée si elle n'est pas déjà présente ;
 * - elle est retirée si elle est déjà présente.
 *
 * Ce gestionnaire est appelé automatiquement par Google Sheets
 * lorsqu'un utilisateur modifie une cellule.
 */
function onEdit(e) {
  if (!e || !e.range) {
    return;
  }

  const plageModifiee = e.range;

  // Ne traiter qu'une cellule à la fois.
  if (
    plageModifiee.getNumRows() !== 1 ||
    plageModifiee.getNumColumns() !== 1
  ) {
    return;
  }

  const feuille = plageModifiee.getSheet();

  if (feuille.getName() !== CONFIG.ONGLET_MEMBRES) {
    return;
  }

  let verification;

  try {
    verification = verifierColonnesMembres_();
  } catch (erreur) {
    return;
  }

  const ligneEntetes = verification.ligneEntetes;
  const colonneMission = verification.colonnes.mission;

  if (
    plageModifiee.getRow() <= ligneEntetes ||
    plageModifiee.getColumn() !== colonneMission
  ) {
    return;
  }

  // e.value est absent lorsque l'utilisateur efface la cellule.
  // Dans ce cas, on laisse l'effacement tel quel.
  if (typeof e.value === 'undefined' || e.value === '') {
    return;
  }

  const nouvelleMission = String(e.value).trim();

  if (!nouvelleMission) {
    return;
  }

  // Une première sélection ne nécessite aucune combinaison.
  if (typeof e.oldValue === 'undefined' || e.oldValue === '') {
    plageModifiee.setValue(nouvelleMission);
    return;
  }

  const missionsExistantes = String(e.oldValue)
    .split(',')
    .map(function(mission) {
      return mission.trim();
    })
    .filter(function(mission) {
      return mission !== '';
    });

  const cleNouvelleMission = normaliserMissionListes_(nouvelleMission);

  const indexExistante = missionsExistantes.findIndex(function(mission) {
    return normaliserMissionListes_(mission) === cleNouvelleMission;
  });

  if (indexExistante >= 0) {
    // La mission était déjà sélectionnée : on la retire.
    missionsExistantes.splice(indexExistante, 1);
  } else {
    // Nouvelle mission : on l'ajoute à la suite.
    missionsExistantes.push(nouvelleMission);
  }

  plageModifiee.setValue(missionsExistantes.join(', '));
}


/**
 * Normalise une mission pour comparer les intitulés.
 */
function normaliserMissionListes_(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


/**
 * Ajoute une entrée au Journal si l'onglet existe.
 * Cette fonction n'empêche pas l'opération principale
 * de fonctionner si le Journal n'est pas disponible.
 */
function journaliserActionListesMissions_(action, resultat, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const feuille = ss.getSheetByName(CONFIG.ONGLET_JOURNAL);

    if (!feuille) {
      return;
    }

    feuille.appendRow([
      new Date(),
      action,
      resultat,
      details
    ]);
  } catch (erreur) {
    // Le journal ne doit pas bloquer les listes déroulantes.
  }
}
