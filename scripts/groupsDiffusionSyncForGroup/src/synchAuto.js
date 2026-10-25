/**
 * ============================================================
 * syncAuto.gs
 * Gestion de la synchronisation automatique
 * ============================================================
 *
 * Fonctionnement :
 * - SynchroAutomatique = Oui : installe un déclencheur quotidien.
 * - SynchroAutomatique = Non : supprime les déclencheurs associés.
 * - Le déclencheur vérifie les données sans modifier les groupes Google.
 * - La vérification relit le réglage avant chaque exécution.
 * - Les déclencheurs en double sont supprimés.
 */

/**
 * Fonction exécutée automatiquement par le déclencheur.
 *
 * Cette fonction vérifie les données et journalise le résultat.
 * Elle ne modifie pas les appartenances aux groupes Google.
 */
function executerSyncAuto() {
  // Vérifier le réglage à chaque exécution.
  if (!synchroAutoEstActive_()) {
    supprimerDeclencheursSyncAuto_();

    console.log(
      'La vérification automatique est désactivée dans Config. ' +
      'Les déclencheurs associés ont été supprimés.'
    );
    return;
  }

  const verrou = LockService.getDocumentLock();

  if (!verrou.tryLock(1000)) {
    console.log(
      'Une opération est déjà en cours. ' +
      'La vérification automatique est ignorée.'
    );
    return;
  }

  try {
    const bilan = verifierDonneesAvantSynchronisation_();

    journaliserAction_(
      'Synchronisation automatique',
      'Vérification terminée',
      construireResumeSynchronisation_(bilan)
    );

  } catch (erreur) {
    journaliserErreur_(
      'Synchronisation automatique',
      erreur
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/**
 * Installe ou supprime le déclencheur selon Config.
 *
 * Cette fonction peut être appelée depuis initSheets().
 * Elle ne présente aucune fenêtre utilisateur.
 */
function installerDeclencheurSyncAuto_() {
  if (!synchroAutoEstActive_()) {
    const nombreSupprime = supprimerDeclencheursSyncAuto_();

    journaliserAction_(
      'Synchronisation automatique',
      'Désactivée',
      'SynchroAutomatique est différent de Oui. ' +
      'Déclencheurs supprimés : ' + nombreSupprime
    );

    return false;
  }

  const fonctionCible = 'executerSyncAuto';
  const declencheurs = ScriptApp.getProjectTriggers();

  const declencheursCibles = declencheurs.filter(
    function(declencheur) {
      return declencheur.getHandlerFunction() === fonctionCible;
    }
  );

  // Aucun doublon : conserver le déclencheur existant.
  if (declencheursCibles.length === 1) {
    console.log(
      'Le déclencheur automatique est déjà installé.'
    );
    return true;
  }

  // En cas de doublons, les supprimer tous avant d'en créer un.
  if (declencheursCibles.length > 1) {
    declencheursCibles.forEach(function(declencheur) {
      ScriptApp.deleteTrigger(declencheur);
    });

    console.log(
      'Les déclencheurs automatiques en double ont été supprimés.'
    );
  }

  ScriptApp.newTrigger(fonctionCible)
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  journaliserAction_(
    'Synchronisation automatique',
    'Déclencheur installé',
    'Vérification quotidienne autour de 6 h, selon le fuseau horaire ' +
    'du script. Le déclencheur vérifie les données sans synchroniser ' +
    'les appartenances aux groupes Google.'
  );

  return true;
}


/**
 * Lit le paramètre SynchroAutomatique dans Config.
 *
 * Seule la valeur Oui active le déclencheur.
 * Une valeur absente, vide ou différente de Oui est considérée comme Non.
 */
function synchroAutoEstActive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille || feuille.getLastRow() < 2) {
    console.log(
      'Config est absent ou vide : synchronisation automatique désactivée.'
    );
    return false;
  }

  const valeurs = feuille
    .getRange(1, 1, feuille.getLastRow(), 2)
    .getDisplayValues();

  for (let i = 1; i < valeurs.length; i++) {
    const cle = normaliserCleSyncAuto_(valeurs[i][0]);

    if (cle === 'synchroautomatique') {
      return normaliserCleSyncAuto_(valeurs[i][1]) === 'oui';
    }
  }

  console.log(
    'Le paramètre SynchroAutomatique est absent de Config : ' +
    'synchronisation automatique désactivée.'
  );

  return false;
}


/**
 * Normalise une valeur pour comparer les paramètres sans tenir compte
 * de la casse, des accents, des espaces ou des séparateurs.
 */
function normaliserCleSyncAuto_(valeur) {
  return String(valeur == null ? '' : valeur)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}


/**
 * Supprime tous les déclencheurs associés à executerSyncAuto.
 *
 * Fonction interne sans dialogue utilisateur, utilisable par
 * l'installation et par l'exécution automatique.
 *
 * @return {number} Nombre de déclencheurs supprimés.
 */
function supprimerDeclencheursSyncAuto_() {
  const fonctionCible = 'executerSyncAuto';
  const declencheurs = ScriptApp.getProjectTriggers();
  let nombreSupprime = 0;

  declencheurs.forEach(function(declencheur) {
    if (declencheur.getHandlerFunction() === fonctionCible) {
      ScriptApp.deleteTrigger(declencheur);
      nombreSupprime++;
    }
  });

  return nombreSupprime;
}


/**
 * Désactive la vérification automatique après confirmation.
 *
 * Cette action supprime les déclencheurs, mais ne change pas
 * automatiquement la valeur de SynchroAutomatique dans Config.
 */
function supprimerDeclencheurSyncAuto() {
  const ui = SpreadsheetApp.getUi();

  const confirmation = ui.alert(
    'Désactiver la vérification automatique',
    'Voulez-vous supprimer le déclencheur de vérification automatique ?\n\n' +
    'Pour éviter qu’il soit réinstallé, vérifie également que ' +
    'SynchroAutomatique vaut Non dans Config.',
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    return;
  }

  const nombreSupprime = supprimerDeclencheursSyncAuto_();

  journaliserAction_(
    'Synchronisation automatique',
    'Déclencheurs supprimés',
    'Nombre supprimé : ' + nombreSupprime
  );

  ui.alert(
    'Vérification automatique',
    nombreSupprime > 0
      ? 'Le déclencheur automatique a été supprimé.\n\n' +
        'Vérifie que SynchroAutomatique vaut Non dans Config.'
      : 'Aucun déclencheur automatique n’était installé.',
    ui.ButtonSet.OK
  );
}


/**
 * Affiche l'état du réglage et des déclencheurs automatiques.
 *
 * @return {boolean} Indique si un déclencheur existe.
 */
function afficherEtatSyncAuto() {
  const ui = SpreadsheetApp.getUi();
  const estActive = synchroAutoEstActive_();
  const declencheurs = ScriptApp.getProjectTriggers();

  const declencheursCibles = declencheurs.filter(
    function(declencheur) {
      return declencheur.getHandlerFunction() === 'executerSyncAuto';
    }
  );

  let message = 'Réglage SynchroAutomatique : ' +
    (estActive ? 'Oui' : 'Non') + '\n';

  message += 'Nombre de déclencheurs : ' +
    declencheursCibles.length + '\n\n';

  if (!estActive && declencheursCibles.length > 0) {
    message +=
      'Attention : le réglage est désactivé, mais des déclencheurs ' +
      'existent encore. Relance l’installation pour les supprimer.';
  } else if (!estActive) {
    message += 'La vérification automatique est désactivée.';
  } else if (declencheursCibles.length === 0) {
    message +=
      'Le réglage est activé, mais aucun déclencheur n’est installé.';
  } else if (declencheursCibles.length > 1) {
    message +=
      'Attention : plusieurs déclencheurs existent. Relance ' +
      'l’installation pour supprimer les doublons.';
  } else {
    message +=
      'La vérification automatique est activée. Elle s’exécute ' +
      'quotidiennement autour de 6 h.';
  }

  ui.alert(
    'État de la vérification automatique',
    message,
    ui.ButtonSet.OK
  );

  return declencheursCibles.length > 0;
}