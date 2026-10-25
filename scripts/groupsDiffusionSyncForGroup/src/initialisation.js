
/**
 * 02_Initialisation.gs
 *
 * Initialise les onglets du projet Group Sync.
 *
 * Principes :
 * - Préserver les données des onglets Adhérents et Mapping.
 * - Préserver les préfixes déjà définis dans Mapping.
 * - Conserver les valeurs existantes dans Config lorsqu'elles sont connues.
 * - Ajouter NomGroupe à Config.
 * - Ne pas créer de paramètre FormatNomGroupe.
 * - Ne pas synchroniser les groupes Google pendant l'initialisation.
 */

/**
 * Point d'entrée de l'initialisation.
 */
function initSheets() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const feuilleAdherents = classeur.getSheetByName(
    CONFIG.ONGLET_MEMBRES
  );

  if (!feuilleAdherents) {
    ui.alert(
      'Initialisation impossible',
      'L’onglet "' + CONFIG.ONGLET_MEMBRES +
      '" est introuvable. Vérifie son nom avant de recommencer.',
      ui.ButtonSet.OK
    );
    return;
  }

  /*
   * Vérifie les en-têtes avant toute modification.
   */
  const verification = verifierEntetesAdherentsInitialisation_(
    feuilleAdherents
  );

  if (!verification.valide) {
    ui.alert(
      'Initialisation interrompue',
      verification.message,
      ui.ButtonSet.OK
    );
    return;
  }

  const feuilleConfigExistante = classeur.getSheetByName(
    CONFIG.ONGLET_CONFIG
  );

  if (feuilleConfigExistante) {
    const confirmation = ui.alert(
      'Confirmer l’initialisation',
      'L’onglet Config existe déjà.\n\n' +
      'Les paramètres reconnus seront conservés lorsque possible. ' +
      'Les paramètres inconnus peuvent être retirés de Config.\n\n' +
      'Les données des onglets Adhérents et Mapping seront préservées.\n\n' +
      'Veux-tu continuer ?',
      ui.ButtonSet.YES_NO
    );

    if (confirmation !== ui.Button.YES) {
      return;
    }
  }

  try {
    /*
     * Vérifie Mapping avant de modifier les onglets.
     * Ne crée pas automatiquement de missions et ne modifie pas
     * les préfixes existants.
     */
    const feuilleMapping = classeur.getSheetByName(
      CONFIG.ONGLET_MAPPING
    );

    if (!feuilleMapping) {
      throw new Error(
        'L’onglet "' + CONFIG.ONGLET_MAPPING +
        '" est introuvable. Crée-le ou restaure-le avant de recommencer.'
      );
    }

    /*
     * Crée ou actualise Config en conservant les valeurs connues.
     */
    initialiserConfigGroupSync_(classeur);

    /*
     * Ajoute Statut Diffusion si nécessaire.
     * Les données existantes ne sont pas effacées.
     */
    ajouterColonneStatutDiffusionInitialisation_(
      feuilleAdherents
    );

    /*
     * Crée le Journal s'il est absent.
     */
    initialiserJournalGroupSync_(classeur);

    /*
     * Renomme l'ancien onglet d'informations si nécessaire.
     */
    renommerAncienOngletInfosInitialisation_(classeur);

    /*
     * Applique le formatage si les fonctions existent.
     */
    if (typeof appliquerMiseEnForme === 'function') {
      appliquerMiseEnForme();
    }

    if (typeof actualiserInfosConfiguration === 'function') {
      actualiserInfosConfiguration();
    }

    /*
     * Configure la validation Oui/Non de SynchroAutomatique.
     */
    appliquerValidationSynchroAutomatiqueInitialisation_(
      classeur
    );

    /*
     * Masque les onglets techniques si la fonction existe.
     */
    if (typeof masquerOngletsTechniques === 'function') {
      masquerOngletsTechniques();
    } else {
      masquerOngletsTechniquesInitialisation_(classeur);
    }

    /*
     * Installe le déclencheur automatique si la fonction existe.
     * Cela ne lance pas de synchronisation immédiate.
     */
    if (typeof installerDeclencheurSyncAuto_ === 'function') {
      installerDeclencheurSyncAuto_();
    }

    ui.alert(
      'Initialisation terminée',
      'Les onglets ont été vérifiés et la configuration a été actualisée.\n\n' +
      'Vérifie notamment les paramètres NomGroupe et CodeGroupe ' +
      'dans Config avant toute synchronisation.',
      ui.ButtonSet.OK
    );

  } catch (erreur) {
    ui.alert(
      'Erreur pendant l’initialisation',
      String(erreur && erreur.message ? erreur.message : erreur),
      ui.ButtonSet.OK
    );

    throw erreur;
  }
}

/**
 * Vérifie la présence des en-têtes attendus dans les cinq premières lignes.
 */
function verifierEntetesAdherentsInitialisation_(feuille) {
  const derniereColonne = feuille.getLastColumn();

  if (derniereColonne < 1) {
    return {
      valide: false,
      message:
        'L’onglet Adhérents est vide. Ajoute les en-têtes avant de continuer.'
    };
  }

  const nombreLignes = Math.min(
    Math.max(feuille.getLastRow(), 1),
    5
  );

  const donnees = feuille.getRange(
    1,
    1,
    nombreLignes,
    derniereColonne
  ).getDisplayValues();

  let entetesTrouves = [];

  donnees.forEach(function (ligne) {
    const cellules = ligne.map(function (valeur) {
      return String(valeur || '').trim();
    });

    if (
      cellules.some(function (valeur) {
        return /email|courriel/i.test(valeur);
      }) &&
      cellules.some(function (valeur) {
        return /mission/i.test(valeur);
      })
    ) {
      entetesTrouves = cellules;
    }
  });

  if (entetesTrouves.length === 0) {
    return {
      valide: false,
      message:
        'Les en-têtes Email et Mission n’ont pas été trouvés ' +
        'dans les cinq premières lignes de l’onglet Adhérents.'
    };
  }

  return {
    valide: true,
    message: 'En-têtes vérifiés.',
    entetes: entetesTrouves
  };
}

/**
 * Crée ou actualise l'onglet Config.
 *
 * Les paramètres conservés sont ceux déclarés dans
 * CONFIG.PARAMETRES_CONFIG.
 */
function initialiserConfigGroupSync_(classeur) {
  let feuille = classeur.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille) {
    feuille = classeur.insertSheet(CONFIG.ONGLET_CONFIG);
  }

  const valeursExistantes = {};

  if (feuille.getLastRow() > 0) {
    feuille.getDataRange().getValues().forEach(function (ligne) {
      if (ligne.length < 2) return;

      const parametre = String(ligne[0] || '').trim();

      if (parametre) {
        valeursExistantes[parametre] = ligne[1];
      }
    });
  }

  const parametres = Array.isArray(CONFIG.PARAMETRES_CONFIG)
    ? CONFIG.PARAMETRES_CONFIG.slice()
    : [
        'CodeGroupe',
        'NomGroupe',
        'PrefixeObjet',
        'SynchroAutomatique',
        'AdresseGroupeAdherents'
      ];

  /*
   * Garantit la présence de NomGroupe, sans ajouter FormatNomGroupe.
   */
  if (parametres.indexOf('NomGroupe') === -1) {
    parametres.push('NomGroupe');
  }

  const donnees = [
    ['Paramètre', 'Valeur']
  ];

  parametres.forEach(function (parametre) {
    let valeur;

    if (
      Object.prototype.hasOwnProperty.call(
        valeursExistantes,
        parametre
      )
    ) {
      valeur = valeursExistantes[parametre];
    } else {
      valeur = obtenirValeurDefautConfigInitialisation_(
        parametre
      );
    }

    donnees.push([parametre, valeur]);
  });

  feuille.clearContents();

  feuille.getRange(
    1,
    1,
    donnees.length,
    2
  ).setValues(donnees);

  feuille.setFrozenRows(1);

  feuille.getRange(1, 1, 1, 2)
    .setFontWeight('bold');

  feuille.autoResizeColumns(1, 2);
}

/**
 * Fournit les valeurs par défaut de Config.
 */
function obtenirValeurDefautConfigInitialisation_(parametre) {
  switch (parametre) {
    case 'SynchroAutomatique':
      return 'Non';

    case 'PrefixeObjet':
      return CONFIG.PREFIXE_OBJET_DIFFUSION || '';

    case 'CodeGroupe':
      return '';

    case 'NomGroupe':
      return CONFIG.NOM_GROUPE_PAR_DEFAUT || '';

    case 'AdresseGroupeAdherents':
      return CONFIG.ADRESSE_GROUPE_ADHERENTS || '';

    default:
      return '';
  }
}

/**
 * Ajoute Statut Diffusion si la colonne n'existe pas.
 *
 * Aucune donnée existante n'est supprimée.
 */
function ajouterColonneStatutDiffusionInitialisation_(feuille) {
  const derniereColonne = Math.max(feuille.getLastColumn(), 1);
  const nombreLignes = Math.min(
    Math.max(feuille.getLastRow(), 1),
    5
  );

  const donnees = feuille.getRange(
    1,
    1,
    nombreLignes,
    derniereColonne
  ).getDisplayValues();

  let ligneEntetes = 0;
  let indexStatut = -1;

  for (let i = 0; i < donnees.length; i++) {
    const ligne = donnees[i];

    const contientEmail = ligne.some(function (valeur) {
      return /email|courriel/i.test(String(valeur || ''));
    });

    const contientMission = ligne.some(function (valeur) {
      return /mission/i.test(String(valeur || ''));
    });

    if (contientEmail && contientMission) {
      ligneEntetes = i + 1;

      indexStatut = ligne.findIndex(function (valeur) {
        return /^statut\s*diffusion$/i.test(
          String(valeur || '').trim()
        );
      });

      break;
    }
  }

  if (!ligneEntetes) {
    throw new Error(
      'Impossible de déterminer la ligne des en-têtes de Adhérents.'
    );
  }

  if (indexStatut !== -1) {
    return;
  }

  const nouvelleColonne = feuille.getLastColumn() + 1;

  feuille.getRange(
    ligneEntetes,
    nouvelleColonne
  ).setValue('Statut Diffusion');
}

/**
 * Crée l'onglet Journal si nécessaire.
 */
function initialiserJournalGroupSync_(classeur) {
  let feuille = classeur.getSheetByName(CONFIG.ONGLET_JOURNAL);

  if (!feuille) {
    feuille = classeur.insertSheet(CONFIG.ONGLET_JOURNAL);
  }

  if (feuille.getLastRow() === 0) {
    feuille.getRange(1, 1, 1, 4).setValues([
      ['Date', 'Action', 'Résultat', 'Détails']
    ]);
  }

  feuille.setFrozenRows(1);

  feuille.getRange(1, 1, 1, 4)
    .setFontWeight('bold');
}

/**
 * Renomme l'ancien onglet Infos si l'onglet cible n'existe pas.
 */
function renommerAncienOngletInfosInitialisation_(classeur) {
  const ancienNom = CONFIG.ONGLET_ANCIEN_INFOS || 'Infos';
  const nouveauNom = CONFIG.ONGLET_INFOS || 'Infos configuration';

  const ancienneFeuille = classeur.getSheetByName(ancienNom);
  const nouvelleFeuille = classeur.getSheetByName(nouveauNom);

  if (ancienneFeuille && !nouvelleFeuille) {
    ancienneFeuille.setName(nouveauNom);
  }
}

/**
 * Applique la validation Oui/Non à SynchroAutomatique.
 */
function appliquerValidationSynchroAutomatiqueInitialisation_(
  classeur
) {
  const feuille = classeur.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille || feuille.getLastRow() < 2) {
    return;
  }

  const donnees = feuille.getRange(
    2,
    1,
    feuille.getLastRow() - 1,
    2
  ).getValues();

  for (let i = 0; i < donnees.length; i++) {
    const parametre = String(donnees[i][0] || '').trim();

    if (parametre !== 'SynchroAutomatique') {
      continue;
    }

    const cellule = feuille.getRange(i + 2, 2);

    const validation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Oui', 'Non'], true)
      .setAllowInvalid(false)
      .build();

    cellule.setDataValidation(validation);

    const valeur = String(cellule.getValue() || '')
      .trim()
      .toLowerCase();

    if (valeur !== 'oui' && valeur !== 'non') {
      cellule.setValue('Non');
    }

    break;
  }
}

/**
 * Masque les onglets techniques sans les supprimer.
 */
function masquerOngletsTechniquesInitialisation_(classeur) {
  const nomsTechniques = [
    CONFIG.ONGLET_MAPPING,
    CONFIG.ONGLET_CONFIG,
    CONFIG.ONGLET_JOURNAL,
    CONFIG.ONGLET_INFOS
  ];

  nomsTechniques.forEach(function (nom) {
    if (!nom) return;

    const feuille = classeur.getSheetByName(nom);

    if (
      feuille &&
      classeur.getSheets().length > 1 &&
      !feuille.isSheetHidden()
    ) {
      feuille.hideSheet();
    }
  });
}
