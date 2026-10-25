/**
 * ============================================================
 * 06_Synchronisation.gs
 * Génération des adresses et orchestration de la synchronisation
 * Google Groups.
 * ============================================================
 *
 * Mapping : Mission | PrefixeEmail | AdresseGroupe
 * Config  : CodeGroupe | AdresseGroupeAdherents
 *
 * Règles :
 * - Mapping est la référence officielle des missions autorisées.
 * - Les missions multiples sont séparées par des virgules.
 * - Une mission inconnue bloque la synchronisation réelle ;
 *   la simulation la signale seulement.
 * - Aucune mission inconnue n'est ajoutée automatiquement à Mapping.
 * - Les préfixes saisis manuellement ne sont jamais écrasés.
 * - Le groupe commun reçoit tous les adhérents actifs ayant un email
 *   valide, indépendamment de leur mission.
 */


/* ============================================================
 * 0. OUTILS COMMUNS
 * ============================================================ */

function emailValideSynchronisation_(email) {
  return CONFIG.REGEX_EMAIL.test(String(email || ''));
}

function messageErreurSynchronisation_(erreur) {
  return erreur && erreur.message ? erreur.message : String(erreur);
}

/**
 * Retourne les adresses uniques des membres actifs ayant un email valide.
 * Si cleMission est fourni, seuls les membres de cette mission sont retenus.
 */
function collecterEmailsActifsSynchronisation_(membres, cleMission) {
  const vus = Object.create(null);
  const emails = [];

  membres.forEach(function(membre) {
    if (cleMission) {
      const missionsMembre = Array.isArray(membre.missions)
        ? membre.missions
        : separerMissionsLecture_(membre.mission);

      const aMission = missionsMembre.some(function(missionMembre) {
        return normaliserMissionLecture_(missionMembre) === cleMission;
      });

      if (!aMission) return;
    }

    const email = normaliserEmailLecture_(membre.email);

    if (
      !emailValideSynchronisation_(email) ||
      normaliserStatutSynchronisation_(membre.statutDiffusion) !== 'actif'
    ) {
      return;
    }

    const cle = email.toLowerCase();

    if (vus[cle]) return;

    vus[cle] = true;
    emails.push(email);
  });

  return emails;
}

/**
 * Liste les groupes dont l'adresse n'appartient pas à CONFIG.DOMAINE.
 */
function trouverGroupesHorsDomaineSynchronisation_(contexte) {
  const suffixe = '@' + String(CONFIG.DOMAINE || '').trim().toLowerCase();

  return [contexte.groupeAdherents]
    .concat(contexte.groupes)
    .filter(function(groupe) {
      if (!groupe || !groupe.adresse) return false;

      const adresse = String(groupe.adresse).toLowerCase();
      return adresse.slice(-suffixe.length) !== suffixe;
    })
    .map(function(groupe) {
      return groupe.mission + ' (' + groupe.adresse + ')';
    });
}


/* ============================================================
 * 1. GÉNÉRATION DES ADRESSES DE GROUPES
 * ============================================================ */

function genererAdressesGroupes() {
  const verrou = LockService.getDocumentLock();

  if (!verrou.tryLock(30000)) {
    throw new Error('Une opération est déjà en cours. Réessayez plus tard.');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const membres = lireMembres_();
    const mapping = lireMappingGroupes_();
    const validationMissions = validerMissionsAdherents_();
    const codeGroupe = lireCodeGroupeConfiguration_();

    const colonneAdresse = obtenirOuCreerColonneAdresseGroupe_(mapping);

    let nombreAdresses = 0;
    let nombreSansPrefixe = 0;
    let nombrePrefixeInvalide = 0;

    const lignesResume = [];

    mapping.associations.forEach(function(association) {
      const mission = association.mission;
      const prefixeOriginal = String(association.prefixe || '').trim();

      const adresse = construireAdresseGroupeMission_(
        prefixeOriginal,
        codeGroupe
      );

      mapping.feuille
        .getRange(association.ligneFeuille, colonneAdresse)
        .setValue(adresse);

      if (adresse) {
        nombreAdresses++;
        lignesResume.push('✅ ' + mission + '\n   ' + adresse);
      } else if (!prefixeOriginal) {
        nombreSansPrefixe++;
        lignesResume.push(
          '⚠️ ' + mission + '\n   Préfixe manquant dans Mapping'
        );
      } else {
        nombrePrefixeInvalide++;
        lignesResume.push(
          '❌ ' + mission + '\n   Préfixe invalide : ' + prefixeOriginal
        );
      }
    });

    const lignesMissionsInconnues = validationMissions.erreurs.map(
      function(erreur) {
        return '🔴 Ligne ' + erreur.ligne +
          (erreur.email ? ' — ' + erreur.email : '') +
          '\n   ' +
          (erreur.missionManquante
            ? 'Mission manquante'
            : 'Mission absente de Mapping : ' + erreur.missions.join(', '));
      }
    );

    SpreadsheetApp.flush();

    const resume = [
      'Génération des adresses de groupes',
      '',
      'CodeGroupe : ' + codeGroupe,
      'Lignes de membres lues : ' + membres.length,
      'Missions présentes dans Mapping : ' + mapping.associations.length,
      'Adresses enregistrées : ' + nombreAdresses,
      'Préfixes manquants : ' + nombreSansPrefixe,
      'Préfixes invalides : ' + nombrePrefixeInvalide,
      'Lignes avec missions incorrectes : ' + validationMissions.erreurs.length,
      '',
      lignesResume.length
        ? lignesResume.join('\n\n')
        : 'Aucune mission présente dans Mapping.',
      '',
      lignesMissionsInconnues.length
        ? 'MISSIONS À CORRIGER DANS ADHÉRENTS :\n\n' +
          lignesMissionsInconnues.join('\n\n')
        : 'Toutes les missions saisies sont reconnues.',
      '',
      'Les préfixes existants ont été conservés.',
      'Les adresses ont été écrites dans Mapping.',
      'Le groupe commun des adhérents reste indépendant de Mapping.',
      'Aucun groupe Google n’a été créé ou modifié.'
    ].join('\n');

    journaliserAction_(
      'Génération des adresses de groupes',
      nombreSansPrefixe || nombrePrefixeInvalide || !validationMissions.valide
        ? 'AVERTISSEMENT'
        : 'SUCCÈS',
      'CodeGroupe : ' + codeGroupe +
      ' | Membres : ' + membres.length +
      ' | Missions Mapping : ' + mapping.associations.length +
      ' | Adresses : ' + nombreAdresses +
      ' | Préfixes manquants : ' + nombreSansPrefixe +
      ' | Préfixes invalides : ' + nombrePrefixeInvalide +
      ' | Lignes avec missions incorrectes : ' +
        validationMissions.erreurs.length
    );

    ss.toast(
      validationMissions.valide
        ? 'Les missions sont valides.'
        : 'Certaines missions sont incorrectes. Vérifiez les cellules rouges.',
      'Group Sync',
      8
    );

    SpreadsheetApp.getUi().alert(
      'Group Sync — Adresses des groupes',
      resume,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return {
      codeGroupe: codeGroupe,
      membresLus: membres.length,
      missionsMapping: mapping.associations.length,
      adressesCalculees: nombreAdresses,
      prefixeManquant: nombreSansPrefixe,
      prefixeInvalide: nombrePrefixeInvalide,
      erreursMissions: validationMissions.erreurs.length
    };

  } catch (erreur) {
    journaliserAction_(
      'Génération des adresses de groupes',
      'ERREUR',
      messageErreurSynchronisation_(erreur)
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/* ============================================================
 * 2. CONSTRUCTION DES ADRESSES
 * ============================================================ */

/**
 * Format : PrefixeEmail-CodeGroupe@CONFIG.DOMAINE
 */
function construireAdresseGroupeMission_(prefixe, codeGroupe) {
  const prefixeNormalise = normaliserPrefixeAdresseGroupe_(prefixe);
  const codeNormalise = normaliserCodeGroupeAdresse_(codeGroupe);
  const domaine = String(CONFIG.DOMAINE || '').trim().toLowerCase();

  if (!prefixeNormalise || !codeNormalise || !domaine) return '';

  const adresse = prefixeNormalise + '-' + codeNormalise + '@' + domaine;

  return emailValideSynchronisation_(adresse) ? adresse : '';
}

function lireCodeGroupeConfiguration_() {
  const feuille = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille || feuille.getLastRow() < 2) {
    throw new Error(
      'Impossible de lire CodeGroupe : vérifiez l’onglet Config.'
    );
  }

  const valeurs = feuille
    .getRange(2, 1, feuille.getLastRow() - 1, 2)
    .getDisplayValues();

  for (let i = 0; i < valeurs.length; i++) {
    if (String(valeurs[i][0] || '').trim() === 'CodeGroupe') {
      const code = String(valeurs[i][1] || '').trim();

      if (!normaliserCodeGroupeAdresse_(code)) {
        throw new Error(
          'Le paramètre CodeGroupe est vide ou invalide dans Config.'
        );
      }

      return code;
    }
  }

  throw new Error('Le paramètre CodeGroupe est absent de l’onglet Config.');
}

function normaliserCodeGroupeAdresse_(valeur) {
  let code = String(valeur == null ? '' : valeur)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');

  code = code.replace(/[^a-z0-9._+-]/g, '');
  code = code.replace(/^[._+-]+|[._+-]+$/g, '');

  if (!code || code.length > 63 || code.indexOf('..') !== -1) return '';

  return code;
}


/* ============================================================
 * 3. SYNCHRONISATION RÉELLE
 * ============================================================ */

/**
 * Lance la synchronisation des groupes Google.
 */
function syncGroups() {
  // Fonctionne que la vérification lève une exception ou retourne false.
  if (verifierUtilisateurAutorise_('Synchroniser maintenant') === false) {
    return;
  }

  const verrou = LockService.getDocumentLock();

  if (!verrou.tryLock(30000)) {
    throw new Error(
      'Une synchronisation est déjà en cours. Réessayez plus tard.'
    );
  }

  try {
    const contexte = preparerSynchronisation_({
      autoriserMissionsInvalides: false
    });

    if (!contexte.configuration.valide) {
      throw new Error(contexte.configuration.message);
    }

    const groupesSansPrefixe = contexte.groupes.filter(function(groupe) {
      return !groupe.prefixe;
    });

    const groupesSansAdresse = contexte.groupes.filter(function(groupe) {
      return !groupe.adresse || !groupe.adresseValide;
    });

    if (groupesSansPrefixe.length > 0 || groupesSansAdresse.length > 0) {
      throw new Error(
        'Synchronisation interrompue : certains groupes par mission ' +
        'n’ont pas de préfixe ou d’adresse valide.\n\n' +
        'Vérifiez PrefixeEmail dans Mapping, CodeGroupe dans Config, ' +
        'puis relancez la synchronisation.'
      );
    }

    if (
      !contexte.groupeAdherents ||
      !contexte.groupeAdherents.adresseValide
    ) {
      throw new Error(
        'Synchronisation interrompue : l’adresse du groupe commun ' +
        'des adhérents est invalide. Vérifiez AdresseGroupeAdherents ' +
        'dans Config.'
      );
    }

    const horsDomaine = trouverGroupesHorsDomaineSynchronisation_(contexte);

    if (horsDomaine.length > 0) {
      throw new Error(
        'Synchronisation interrompue : certaines adresses de groupe ne ' +
        'sont pas dans le domaine ' + CONFIG.DOMAINE + ' :\n- ' +
        horsDomaine.join('\n- ')
      );
    }

    if (typeof executerSynchronisationGoogleGroups_ !== 'function') {
      throw new Error(
        'La fonction executerSynchronisationGoogleGroups_() est absente ' +
        'de 07_AdminSDK.gs. Aucune modification Google Groups n’a été effectuée.'
      );
    }

    const bilan = executerSynchronisationGoogleGroups_(contexte);

    journaliserAction_(
      'Synchroniser maintenant',
      'SUCCÈS',
      construireResumeSynchronisation_(bilan)
    );

    SpreadsheetApp.getUi().alert(
      'Group Sync — Synchronisation terminée',
      'La synchronisation des groupes Google est terminée avec succès.\n\n' +
      'Groupes traités : ' + (bilan.groupesTraites || 0) + '\n' +
      'Groupes créés : ' + (bilan.groupesCrees || 0) + '\n' +
      'Groupes renommés : ' + (bilan.groupesRenommes || 0) + '\n' +
      'Réglages appliqués sans erreur : ' +
        (bilan.reglagesAppliques || 0) + '\n' +
      'Membres ajoutés : ' + (bilan.membresAjoutes || 0) + '\n' +
      'Membres retirés : ' + (bilan.membresRetires || 0) + '\n' +
      'Membres déjà conformes : ' + (bilan.membresDejaConformes || 0),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return bilan;

  } catch (erreur) {
    journaliserAction_(
      'Synchroniser maintenant',
      'ERREUR',
      messageErreurSynchronisation_(erreur)
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/* ============================================================
 * 4. SIMULATION
 * ============================================================ */

function syncGroupsDryRun() {
  const verrou = LockService.getDocumentLock();

  if (!verrou.tryLock(30000)) {
    throw new Error(
      'Une synchronisation est déjà en cours. Réessayez plus tard.'
    );
  }

  try {
    const contexte = preparerSynchronisation_({
      autoriserMissionsInvalides: true
    });

    const bilan = analyserMembresPourSynchronisation_(
      contexte.membres,
      contexte.saison
    );

    bilan.mode = 'SIMULATION';
    bilan.configuration = contexte.configuration;
    bilan.groupes = contexte.groupes;
    bilan.groupeAdherents = contexte.groupeAdherents;
    bilan.validationMissions = contexte.validationMissions;

    bilan.groupesSansPrefixe = contexte.groupes
      .filter(function(groupe) { return !groupe.prefixe; })
      .map(function(groupe) { return groupe.mission; });

    bilan.groupesAvecAdresseInvalide = contexte.groupes
      .filter(function(groupe) {
        return groupe.prefixe && !groupe.adresseValide;
      })
      .map(function(groupe) { return groupe.mission; });

    bilan.groupesHorsDomaine =
      trouverGroupesHorsDomaineSynchronisation_(contexte);

    journaliserAction_(
      'Simulation de synchronisation',
      contexte.validationMissions.valide
        ? 'SIMULATION'
        : 'SIMULATION AVEC ERREURS',
      construireResumeSynchronisation_(bilan)
    );

    SpreadsheetApp.getUi().alert(
      'Simulation de synchronisation',
      construireMessageSynchronisation_(bilan),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return bilan;

  } catch (erreur) {
    journaliserAction_(
      'Simulation de synchronisation',
      'ERREUR',
      messageErreurSynchronisation_(erreur)
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/* ============================================================
 * 5. PRÉPARATION DE LA SYNCHRONISATION
 * ============================================================ */

function preparerSynchronisation_(options) {
  options = options || {};

  const autoriserMissionsInvalides =
    options.autoriserMissionsInvalides === true;

  const validationMissions = validerMissionsAdherents_();

  if (!validationMissions.valide && !autoriserMissionsInvalides) {
    const message = construireMessageErreursMissions_(validationMissions);

    journaliserAction_('Validation des missions', 'ERREUR', message);

    throw new Error(message);
  }

  const verification = verifierColonnesMembres_();
  const membres = lireMembres_();
  const saison = detecterSaison_();
  const configuration = verifierConfigurationSynchronisation_();
  const mapping = lireMappingGroupes_();

  const colonneAdresse = obtenirOuCreerColonneAdresseGroupe_(mapping);

  const codeGroupe = String(configuration.valeurs.CodeGroupe || '').trim();

  const groupes = construireGroupesDepuisMapping_(
    membres,
    mapping,
    codeGroupe
  );

  groupes.forEach(function(groupe) {
    const cle = normaliserMissionLecture_(groupe.mission);
    const association = mapping.parMission[cle];

    if (association && association.ligneFeuille) {
      mapping.feuille
        .getRange(association.ligneFeuille, colonneAdresse)
        .setValue(groupe.adresse || '');
    }
  });

  const groupeAdherents = construireGroupeCommunAdherents_(
    membres,
    configuration
  );

  SpreadsheetApp.flush();

  return {
    classeur: SpreadsheetApp.getActiveSpreadsheet(),
    feuilleMembres: verification.feuille,
    ligneEntetes: verification.ligneEntetes,
    colonnes: verification.colonnes,
    membres: membres,
    saison: saison,
    configuration: configuration,
    validationMissions: validationMissions,
    mapping: mapping,
    groupes: groupes,
    groupeAdherents: groupeAdherents
  };
}

function verifierConfigurationSynchronisation_() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = classeur.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille) {
    return {
      valide: false,
      message: 'L’onglet Config est introuvable.',
      erreurs: ['L’onglet Config est introuvable.'],
      valeurs: {},
      codeGroupe: '',
      adresseGroupeAdherents: ''
    };
  }

  const valeurs = {};
  const derniereLigne = feuille.getLastRow();

  if (derniereLigne >= 2) {
    feuille
      .getRange(2, 1, derniereLigne - 1, 2)
      .getDisplayValues()
      .forEach(function(ligne) {
        const parametre = String(ligne[0] || '').trim();
        const valeur = String(ligne[1] || '').trim();

        if (parametre) valeurs[parametre] = valeur;
      });
  }

  const erreurs = [];

  const codeGroupe = String(valeurs.CodeGroupe || '').trim();

  if (!normaliserCodeGroupeAdresse_(codeGroupe)) {
    erreurs.push('CodeGroupe est absent, vide ou invalide dans Config.');
  }

  const adresseGroupeAdherents = (
    String(valeurs.AdresseGroupeAdherents || '').trim() ||
    String(CONFIG.ADRESSE_GROUPE_ADHERENTS || '').trim()
  ).toLowerCase();

  if (!emailValideSynchronisation_(adresseGroupeAdherents)) {
    erreurs.push(
      'L’adresse du groupe commun est absente ou invalide. ' +
      'Renseignez AdresseGroupeAdherents dans Config ou vérifiez ' +
      'ADRESSE_GROUPE_ADHERENTS dans 00_Config.gs.'
    );
  }


  // Lire REAPPLIQUER_REGLAGES_A_CHAQUE_SYNCHRO depuis le classeur
  let reappliquerReglages = CONFIG.REAPPLIQUER_REGLAGES_A_CHAQUE_SYNCHRO;
  if (valeurs.hasOwnProperty("REAPPLIQUER_REGLAGES_A_CHAQUE_SYNCHRO")) {
    const val = String(valeurs.REAPPLIQUER_REGLAGES_A_CHAQUE_SYNCHRO).trim().toLowerCase();
    reappliquerReglages = (val === "true" || val === "oui" || val === "1");
  }

  return {
    valide: erreurs.length === 0,
    message: erreurs.join('\n'),
    erreurs: erreurs,
    valeurs: valeurs,
    codeGroupe: codeGroupe,
    adresseGroupeAdherents: adresseGroupeAdherents,
    reappliquerReglages: reappliquerReglages
  };
}

/**
 * Construit le groupe commun de tous les adhérents actifs.
 * Il est marqué estCommun pour que 07_AdminSDK.gs le reconnaisse
 * même si AdresseGroupeAdherents est surchargée dans Config.
 */
function construireGroupeCommunAdherents_(membres, configuration) {
  const adresse = String(configuration.adresseGroupeAdherents || '').trim();
  const membresActifs = collecterEmailsActifsSynchronisation_(membres, null);

  return {
    mission: 'Tous les adhérents',
    estCommun: true,
    type: 'commun',
    prefixe: '',
    prefixeNormalise: '',
    adresse: adresse,
    adresseValide: emailValideSynchronisation_(adresse),
    membres: membresActifs,
    nombreMembresActifs: membresActifs.length
  };
}


/* ============================================================
 * 6. LECTURE DE MAPPING
 * ============================================================ */

function lireMappingGroupes_() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = classeur.getSheetByName(CONFIG.ONGLET_MAPPING);

  if (!feuille) {
    throw new Error(
      'L’onglet Mapping est introuvable. Initialisez les onglets avant ' +
      'de générer les adresses.'
    );
  }

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = Math.max(feuille.getLastColumn(), 2);

  if (derniereLigne < 1) {
    throw new Error(
      'L’onglet Mapping est vide. Les en-têtes Mission et PrefixeEmail ' +
      'doivent être présents sur la première ligne.'
    );
  }

  const entetes = feuille
    .getRange(1, 1, 1, derniereColonne)
    .getDisplayValues()[0];

  let colonneMission = null;
  let colonnePrefixe = null;

  entetes.forEach(function(entete, index) {
    const normalise = normaliserMissionLecture_(entete);

    if (normalise === 'mission') colonneMission = index + 1;
    if (normalise === 'prefixeemail') colonnePrefixe = index + 1;
  });

  if (colonneMission === null || colonnePrefixe === null) {
    throw new Error(
      'Mapping doit contenir les en-têtes Mission et PrefixeEmail ' +
      'sur la première ligne.'
    );
  }

  const associations = [];
  const parMission = Object.create(null);

  if (derniereLigne >= 2) {
    feuille
      .getRange(2, 1, derniereLigne - 1, derniereColonne)
      .getDisplayValues()
      .forEach(function(ligne, index) {
        const mission = String(ligne[colonneMission - 1] || '').trim();
        const prefixe = String(ligne[colonnePrefixe - 1] || '').trim();

        if (!mission) return;

        const cle = normaliserMissionLecture_(mission);

        const association = {
          mission: mission,
          cle: cle,
          prefixe: prefixe,
          ligneFeuille: index + 2
        };

        associations.push(association);

        if (!Object.prototype.hasOwnProperty.call(parMission, cle)) {
          parMission[cle] = association;
        }
      });
  }

  return {
    feuille: feuille,
    colonneMission: colonneMission,
    colonnePrefixe: colonnePrefixe,
    associations: associations,
    parMission: parMission
  };
}

function obtenirOuCreerColonneAdresseGroupe_(mapping) {
  const feuille = mapping.feuille;
  const derniereColonne = Math.max(feuille.getLastColumn(), 1);

  const entetes = feuille
    .getRange(1, 1, 1, derniereColonne)
    .getDisplayValues()[0];

  let colonneAdresse = null;

  entetes.forEach(function(entete, index) {
    if (normaliserMissionLecture_(entete) === 'adressegroupe') {
      colonneAdresse = index + 1;
    }
  });

  if (colonneAdresse === null) {
    colonneAdresse = derniereColonne + 1;

    feuille
      .getRange(1, colonneAdresse)
      .setValue('AdresseGroupe')
      .setFontWeight('bold');
  }

  return colonneAdresse;
}


/* ============================================================
 * 7. VALIDATION STRICTE DES MISSIONS
 * ============================================================ */

function validerMissionsAdherents_() {
  const feuille = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.ONGLET_MEMBRES);

  if (!feuille) {
    throw new Error('Onglet Adhérents introuvable.');
  }

  const verification = verifierColonnesMembres_();
  const membres = lireMembres_();
  const mapping = lireMappingGroupes_();

  const missionsConnues = Object.create(null);

  mapping.associations.forEach(function(association) {
    const cle = normaliserMissionLecture_(association.mission);
    if (cle) missionsConnues[cle] = true;
  });

  const colonneMission = verification.colonnes.mission;
  const erreurs = [];

  const couleurErreur = '#F4CCCC';
  const couleurTexteErreur = '#C00000';
  const couleurNormale = CONFIG.COULEUR_FOND || '#FFFFFF';
  const couleurTexteNormal = CONFIG.COULEUR_TEXTE || '#202124';

  membres.forEach(function(membre) {
    const cellule = feuille.getRange(membre.ligneFeuille, colonneMission);

    const texteMission = String(membre.mission || '').trim();
    const missions = separerMissionsLecture_(texteMission);
    const email = normaliserEmailLecture_(membre.email);

    if (!email && !texteMission) return;

    const missionsInconnues = missions.filter(function(mission) {
      return !missionsConnues[normaliserMissionLecture_(mission)];
    });

    const missionManquante = !!email && missions.length === 0;

    if (missionsInconnues.length > 0 || missionManquante) {
      cellule
        .setBackground(couleurErreur)
        .setFontColor(couleurTexteErreur);

      erreurs.push({
        ligne: membre.ligneFeuille,
        email: email,
        missions: missionsInconnues,
        missionManquante: missionManquante
      });

    } else {
      const fond = String(cellule.getBackground() || '').toUpperCase();

      if (fond === couleurErreur.toUpperCase()) {
        cellule
          .setBackground(couleurNormale)
          .setFontColor(couleurTexteNormal);
      }
    }
  });

  SpreadsheetApp.flush();

  return {
    valide: erreurs.length === 0,
    erreurs: erreurs
  };
}

function construireMessageErreursMissions_(resultat) {
  const lignes = [
    'SYNCHRONISATION BLOQUÉE',
    '',
    'Certaines missions sont incorrectes ou absentes de Mapping.',
    'Les cellules concernées ont été colorées en rouge.',
    '',
    'Corrige les missions dans Adhérents ou ajoute volontairement ' +
      'les missions autorisées dans Mapping.',
    ''
  ];

  resultat.erreurs.forEach(function(erreur) {
    let detail;

    if (erreur.missionManquante) {
      detail = 'Mission manquante';

      if (erreur.missions.length > 0) {
        detail += ' ; mission(s) inconnue(s) : ' + erreur.missions.join(', ');
      }
    } else {
      detail = 'Mission(s) inconnue(s) : ' + erreur.missions.join(', ');
    }

    lignes.push(
      'Ligne ' + erreur.ligne +
      (erreur.email ? ' — ' + erreur.email : '') +
      '\n' + detail
    );
  });

  return lignes.join('\n');
}

function exigerMissionsValides_() {
  const resultat = validerMissionsAdherents_();

  if (!resultat.valide) {
    const message = construireMessageErreursMissions_(resultat);

    journaliserAction_('Validation des missions', 'ERREUR', message);

    throw new Error(message);
  }

  return resultat;
}


/* ============================================================
 * 8. DÉTECTION DES MISSIONS
 * ============================================================ */

/**
 * Extrait les missions uniques présentes chez les adhérents.
 * Ne crée aucune ligne dans Mapping.
 */
function extraireMissionsUniquesSynchronisation_(membres) {
  const missions = [];
  const dejaVues = Object.create(null);

  (membres || []).forEach(function(membre) {
    let missionsMembre = membre.missions;

    if (!Array.isArray(missionsMembre)) {
      missionsMembre = separerMissionsLecture_(membre.mission);
    }

    missionsMembre.forEach(function(mission) {
      const nom = String(mission || '').trim();
      const cle = normaliserMissionLecture_(nom);

      if (!nom || !cle || dejaVues[cle]) return;

      dejaVues[cle] = true;
      missions.push(nom);
    });
  });

  return missions.sort(function(a, b) {
    return a.localeCompare(b, 'fr', { sensitivity: 'base' });
  });
}


/* ============================================================
 * 9. CONSTRUCTION DES GROUPES PAR MISSION
 * ============================================================ */

function construireGroupesDepuisMapping_(membres, mapping, codeGroupe) {
  const code = String(codeGroupe == null ? '' : codeGroupe).trim();

  return mapping.associations.map(function(association) {
    const mission = association.mission;
    const cle = normaliserMissionLecture_(mission);
    const prefixeOriginal = String(association.prefixe || '').trim();

    const membresDuGroupe = collecterEmailsActifsSynchronisation_(
      membres,
      cle
    );

    const adresse = construireAdresseGroupeMission_(prefixeOriginal, code);

    return {
      mission: mission,
      estCommun: false,
      prefixe: prefixeOriginal,
      prefixeNormalise: normaliserPrefixeAdresseGroupe_(prefixeOriginal),
      codeGroupe: code,
      adresse: adresse,
      adresseValide: emailValideSynchronisation_(adresse),
      membres: membresDuGroupe,
      nombreMembresActifs: membresDuGroupe.length
    };
  });
}

function normaliserPrefixeAdresseGroupe_(valeur) {
  let prefixe = String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');

  prefixe = prefixe.replace(/[^a-z0-9._%+-]/g, '');
  prefixe = prefixe.replace(/^[._+-]+|[._+-]+$/g, '');

  if (!prefixe || prefixe.length > 63) return '';
  if (prefixe.indexOf('..') !== -1) return '';

  return prefixe;
}


/* ============================================================
 * 10. ANALYSE DES MEMBRES
 * ============================================================ */

function analyserMembresPourSynchronisation_(membres, saison) {
  const bilan = {
    saison: saison,
    totalLignes: membres.length,
    emailsRenseignes: 0,
    emailsVides: 0,
    emailsInvalides: 0,
    statutsActifs: 0,
    statutsInactifs: 0,
    statutsInconnus: 0,
    lignesSansEmail: [],
    lignesEmailInvalide: [],
    lignesStatutInconnu: [],
    membres: []
  };

  membres.forEach(function(membre) {
    const email = normaliserEmailLecture_(membre.email);
    const statut = normaliserStatutSynchronisation_(membre.statutDiffusion);
    const emailValide = emailValideSynchronisation_(email);

    if (!email) {
      bilan.emailsVides++;
      bilan.lignesSansEmail.push(membre.ligneFeuille);
    } else if (!emailValide) {
      bilan.emailsInvalides++;
      bilan.lignesEmailInvalide.push(membre.ligneFeuille);
    } else {
      bilan.emailsRenseignes++;
    }

    if (statut === 'actif') {
      bilan.statutsActifs++;
    } else if (statut === 'inactif') {
      bilan.statutsInactifs++;
    } else {
      bilan.statutsInconnus++;
      bilan.lignesStatutInconnu.push(membre.ligneFeuille);
    }

    bilan.membres.push({
      ligneFeuille: membre.ligneFeuille,
      email: email,
      mission: membre.mission,
      missions: membre.missions || [],
      statutDiffusion: statut,
      emailValide: emailValide
    });
  });

  return bilan;
}

function normaliserStatutSynchronisation_(valeur) {
  const statut = String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (statut === 'actif') return 'actif';
  if (statut === 'inactif') return 'inactif';

  return 'inconnu';
}


/* ============================================================
 * 11. RÉSUMÉS ET MESSAGES
 * ============================================================ */

function construireResumeSynchronisation_(bilan) {
  const groupes = bilan.groupes || [];
  const groupeAdherents = bilan.groupeAdherents;

  const lignes = [
    'Mode : ' + (bilan.mode || 'RÉEL'),
    'Saison : ' + bilan.saison,
    'Lignes analysées : ' + bilan.totalLignes,
    'Emails valides : ' + bilan.emailsRenseignes,
    'Emails vides : ' + bilan.emailsVides,
    'Emails invalides : ' + (bilan.emailsInvalides || 0),
    'Statuts actifs : ' + bilan.statutsActifs,
    'Statuts inactifs : ' + bilan.statutsInactifs,
    'Statuts inconnus : ' + bilan.statutsInconnus,
    'Groupes par mission : ' + groupes.length,
    'Groupes sans adresse valide : ' +
      groupes.filter(function(groupe) {
        return !groupe.adresseValide;
      }).length
  ];

  if (groupeAdherents) {
    lignes.push(
      'Groupe commun : ' + groupeAdherents.adresse,
      'Membres actifs du groupe commun : ' +
        groupeAdherents.nombreMembresActifs
    );
  }

  if (bilan.validationMissions && !bilan.validationMissions.valide) {
    lignes.push(
      'Erreurs de mission : ' + bilan.validationMissions.erreurs.length
    );
  }

  return lignes.join(' | ');
}

function construireMessageSynchronisation_(bilan) {
  const lignes = [
    'Saison détectée : ' + bilan.saison,
    '',
    'Lignes analysées : ' + bilan.totalLignes,
    'Emails valides : ' + bilan.emailsRenseignes,
    'Emails vides : ' + bilan.emailsVides,
    'Emails invalides : ' + (bilan.emailsInvalides || 0),
    'Statuts Actif : ' + bilan.statutsActifs,
    'Statuts Inactif : ' + bilan.statutsInactifs,
    'Statuts inconnus : ' + bilan.statutsInconnus
  ];

  if (bilan.configuration) {
    lignes.push(
      '',
      'CodeGroupe : ' + (bilan.configuration.codeGroupe || '(absent)')
    );

    if (!bilan.configuration.valide) {
      lignes.push(
        'Configuration à corriger :',
        bilan.configuration.message
      );
    }
  }

  if (bilan.groupeAdherents) {
    lignes.push(
      '',
      'GROUPE COMMUN DES ADHÉRENTS',
      'Adresse : ' + (bilan.groupeAdherents.adresse || '(adresse invalide)'),
      'Membres actifs avec email valide : ' +
        bilan.groupeAdherents.nombreMembresActifs
    );

    if (!bilan.groupeAdherents.adresseValide) {
      lignes.push(
        '⚠️ Adresse du groupe commun invalide : vérifiez Config.'
      );
    }
  }

  if (bilan.validationMissions && !bilan.validationMissions.valide) {
    lignes.push(
      '',
      'MISSIONS À CORRIGER',
      construireMessageErreursMissions_(bilan.validationMissions)
    );
  }

  if (bilan.lignesSansEmail.length > 0) {
    lignes.push('', 'Lignes sans email : ' + bilan.lignesSansEmail.join(', '));
  }

  if (bilan.lignesEmailInvalide && bilan.lignesEmailInvalide.length > 0) {
    lignes.push(
      '',
      'Lignes avec email invalide : ' + bilan.lignesEmailInvalide.join(', ')
    );
  }

  if (bilan.lignesStatutInconnu.length > 0) {
    lignes.push(
      '',
      'Lignes avec statut inconnu : ' + bilan.lignesStatutInconnu.join(', ')
    );
  }

  if (bilan.groupes && bilan.groupes.length > 0) {
    lignes.push('', 'GROUPES PAR MISSION');

    bilan.groupes.forEach(function(groupe) {
      lignes.push(
        (groupe.adresseValide ? '✅ ' : '⚠️ ') +
        groupe.mission + ' : ' +
        (groupe.adresseValide
          ? groupe.adresse
          : 'adresse invalide : vérifiez PrefixeEmail et CodeGroupe') +
        ' — ' + groupe.nombreMembresActifs + ' membre(s) actif(s)'
      );
    });
  }

  if (bilan.groupesSansPrefixe && bilan.groupesSansPrefixe.length > 0) {
    lignes.push(
      '',
      'Préfixes manquants : ' + bilan.groupesSansPrefixe.join(', ')
    );
  }

  if (
    bilan.groupesAvecAdresseInvalide &&
    bilan.groupesAvecAdresseInvalide.length > 0
  ) {
    lignes.push(
      '',
      'Groupes avec adresse invalide : ' +
        bilan.groupesAvecAdresseInvalide.join(', ')
    );
  }

  if (bilan.groupesHorsDomaine && bilan.groupesHorsDomaine.length > 0) {
    lignes.push(
      '',
      '⚠️ Adresses hors du domaine ' + CONFIG.DOMAINE + ' (la synchronisation ' +
        'réelle sera bloquée) :',
      bilan.groupesHorsDomaine.join('\n')
    );
  }

  if (bilan.mode === 'SIMULATION') {
    lignes.push(
      '',
      'Simulation uniquement : aucune modification de Google Groups.'
    );
  }

  return lignes.join('\n');
}


/* ============================================================
 * 12. VÉRIFICATION POUR LES DÉCLENCHEURS AUTOMATIQUES
 * ============================================================ */

/**
 * Vérifie les données sans afficher de fenêtre.
 * Les missions incorrectes sont remontées dans le bilan.
 */
function verifierDonneesAvantSynchronisation_() {
  const contexte = preparerSynchronisation_({
    autoriserMissionsInvalides: true
  });

  const bilan = analyserMembresPourSynchronisation_(
    contexte.membres,
    contexte.saison
  );

  bilan.configuration = contexte.configuration;
  bilan.validationMissions = contexte.validationMissions;
  bilan.groupes = contexte.groupes;
  bilan.groupeAdherents = contexte.groupeAdherents;

  return bilan;
}
