/**
 * ============================================================
 * 08_Journal.gs
 * Journalisation des actions et des erreurs
 * ============================================================
 */


/**
 * Enregistre une action dans l'onglet Journal.
 *
 * Crée l'onglet et ses en-têtes s'ils sont absents.
 *
 * @param {string} action Nom de l'action.
 * @param {string} resultat Résultat de l'action.
 * @param {string} details Informations complémentaires.
 * @return {boolean} True si l'entrée a été enregistrée.
 */
function journaliserAction_(action, resultat, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let feuille = ss.getSheetByName(CONFIG.ONGLET_JOURNAL);

    if (!feuille) {
      feuille = ss.insertSheet(CONFIG.ONGLET_JOURNAL);
    }

    if (feuille.getLastRow() === 0) {
      feuille.getRange(1, 1, 1, 4).setValues([[
        'Date',
        'Action',
        'Résultat',
        'Détails'
      ]]);

      feuille.getRange(1, 1, 1, 4)
        .setFontWeight('bold')
        .setFontColor('#FFFFFF')
        .setBackground(CONFIG.COULEUR_ENTETE || '#1F4E78');

      feuille.setFrozenRows(1);
    }

    const ligne = [
      new Date(),
      valeurJournal_(action),
      valeurJournal_(resultat),
      valeurJournal_(details)
    ];

    feuille.appendRow(ligne);

    return true;

  } catch (erreur) {
    console.error(
      'Impossible d’écrire dans le journal : ' +
      erreur.message
    );

    return false;
  }
}


/**
 * Convertit une valeur en texte pour le journal.
 *
 * @param {*} valeur
 * @return {string}
 */
function valeurJournal_(valeur) {
  if (valeur === null || valeur === undefined) {
    return '';
  }

  if (valeur instanceof Error) {
    return valeur.message;
  }

  if (typeof valeur === 'object') {
    try {
      return JSON.stringify(valeur);
    } catch (erreur) {
      return String(valeur);
    }
  }

  return String(valeur);
}


/**
 * Enregistre une erreur dans le journal et dans la console.
 *
 * @param {string} contexte Contexte de l'erreur.
 * @param {Error|string} erreur Erreur rencontrée.
 */
function journaliserErreur_(contexte, erreur) {
  const message = erreur instanceof Error
    ? erreur.message
    : String(erreur || 'Erreur inconnue');

  const pile = erreur instanceof Error
    ? erreur.stack || ''
    : '';

  console.error(
    '[' + contexte + '] ' + message + '\n' + pile
  );

  journaliserAction_(
    contexte,
    'Erreur',
    message + (pile ? '\n' + pile : '')
  );
}


/**
 * Affiche les dernières entrées du journal.
 *
 * @param {number} nombre Nombre maximal d'entrées à afficher.
 */
function afficherDernieresEntreesJournal(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(CONFIG.ONGLET_JOURNAL);
  const ui = SpreadsheetApp.getUi();

  if (!feuille || feuille.getLastRow() < 2) {
    ui.alert(
      'Journal',
      'Aucune entrée enregistrée.',
      ui.ButtonSet.OK
    );
    return;
  }

  const maximum = Math.max(
    1,
    Math.min(Number(nombre) || 10, 50)
  );

  const derniereLigne = feuille.getLastRow();
  const premiereLigne = Math.max(
    2,
    derniereLigne - maximum + 1
  );

  const valeurs = feuille.getRange(
    premiereLigne,
    1,
    derniereLigne - premiereLigne + 1,
    4
  ).getDisplayValues();

  const message = valeurs.map(function(ligne) {
    return [
      ligne[0],
      ligne[1],
      ligne[2],
      ligne[3]
    ].filter(function(valeur) {
      return valeur !== '';
    }).join(' — ');
  }).join('\n\n');

  ui.alert(
    'Dernières entrées du journal',
    message,
    ui.ButtonSet.OK
  );
}


/**
 * Efface les entrées du journal en conservant les en-têtes.
 *
 * Une confirmation explicite est demandée avant l'effacement.
 */
function viderJournal() {
  const ui = SpreadsheetApp.getUi();
  const reponse = ui.alert(
    'Vider le journal',
    'Voulez-vous supprimer toutes les entrées du journal ?',
    ui.ButtonSet.YES_NO
  );

  if (reponse !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(CONFIG.ONGLET_JOURNAL);

  if (!feuille) {
    ui.alert('L’onglet Journal n’existe pas.');
    return;
  }

  const derniereLigne = feuille.getLastRow();

  if (derniereLigne > 1) {
    feuille.getRange(
      2,
      1,
      derniereLigne - 1,
      feuille.getMaxColumns()
    ).clearContent();
  }

  journaliserAction_(
    'Journal',
    'Journal vidé',
    'Les entrées précédentes ont été effacées.'
  );

  ui.alert('Le journal a été vidé.');
}