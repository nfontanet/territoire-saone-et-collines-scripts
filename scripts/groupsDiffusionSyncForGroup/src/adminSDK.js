/**
 * 07_AdminSDK.gs
 * Administration des groupes Google Groups via Admin Directory API
 * et Groups Settings API.
 *
 * Nom des groupes de mission : Groupe Diffusion - [Mission] - [NomGroupe]
 * Nom du groupe commun       : Adhérents
 *
 * ⚠️ Ce script ne crée QUE des groupes de type "Diffusion".
 *
 * Réglages NON exposés par l'API (à faire à la main, voir
 * checklistManuelleDiffusion_) : message de bienvenue, préfixe d'objet,
 * mode conversation, identification des nouveaux membres, visibilité de
 * l'e-mail des membres, rôles personnalisés, libellés partagés, réponse
 * privée aux auteurs.
 *
 * DÉROGATIONS EXPLICITES AU DOCUMENT DE RÉFÉRENCE (décisions du client) :
 * 1. whoCanPostMessage = ALL_IN_DOMAIN_CAN_POST (et non gestionnaires) :
 *    les adresses externes (familles) ne peuvent pas répondre.
 * 2. messageModerationLevel = MODERATE_NONE (et non MODERATE_ALL_MESSAGES) :
 *    cohérent avec la dérogation 1.
 */


/* ============================================================
 * CONFIGURATION GLOBALE
 * ============================================================ */

// Flag temporaire : mettez à TRUE pour forcer l'application des paramètres
// sur TOUS les groupes (y compris existants), puis remettez à FALSE après exécution
const FORCE_APPLIQUER_PARAMETRES_UNE_FOIS = false;


/* ============================================================
 * 1. VÉRIFICATIONS DE SERVICES
 * ============================================================ */

function verifierConfigurationAdministration_() {
  try {
    verifierServiceAdminDirectory_();
    return {
      valide: true,
      message: 'Le service Admin Directory est disponible.'
    };
  } catch (erreur) {
    return {
      valide: false,
      message: administrationMessageErreur_(erreur)
    };
  }
}

function afficherRapportAdministration() {
  const verification = verifierConfigurationAdministration_();

  SpreadsheetApp.getUi().alert(
    verification.valide
      ? 'Vérification réussie.\n\n' + verification.message
      : 'Vérification échouée.\n\n' + verification.message
  );
}

function verifierServiceAdminDirectory_() {
  if (
    typeof AdminDirectory === 'undefined' ||
    !AdminDirectory.Groups ||
    !AdminDirectory.Members
  ) {
    throw new Error(
      'Le service avancé Admin Directory API n’est pas activé. ' +
      'Dans Apps Script, ouvre Services, ajoute Admin SDK API ' +
      'et vérifie que l’API Admin SDK est activée dans Google Cloud.'
    );
  }
}

function verifierServiceAdminGroupsSettings_() {
  if (
    typeof AdminGroupsSettings === 'undefined' ||
    !AdminGroupsSettings.Groups
  ) {
    throw new Error(
      'Le service avancé Admin SDK Groups Settings n’est pas activé. ' +
      'Dans Apps Script > Services, ajoute Admin SDK Groups Settings, puis ' +
      'active l’API correspondante dans le projet Google Cloud.'
    );
  }
}


/* ============================================================
 * 2. CONTEXTE ET OPÉRATIONS
 * ============================================================ */

function obtenirContexteSDK_() {
  if (typeof preparerSynchronisation_ !== 'function') {
    throw new Error(
      'La fonction preparerSynchronisation_ est introuvable.'
    );
  }

  const contexte = preparerSynchronisation_({
    autoriserMissionsInvalides: false
  });

  if (!contexte) {
    throw new Error(
      'Impossible de préparer les données de synchronisation.'
    );
  }

  return contexte;
}

function executerOperationSDK_(operation) {
  verifierServiceAdminDirectory_();

  if (typeof operation !== 'function') {
    throw new Error(
      'Aucune opération d’administration valide n’a été fournie.'
    );
  }

  return operation();
}


/* ============================================================
 * 3. SYNCHRONISATION GLOBALE
 * ============================================================ */

function executerSynchronisationGoogleGroups_(contexte) {
  verifierServiceAdminDirectory_();

  const verrou = LockService.getScriptLock();

  if (!verrou.tryLock(30000)) {
    throw new Error(
      'Une autre synchronisation est déjà en cours. Réessaie plus tard.'
    );
  }

  const bilan = {
    groupesPrevus: 0,
    groupesTraites: 0,
    groupesCrees: 0,
    groupesRenommes: 0,
    membresAjoutes: 0,
    membresRetires: 0,
    membresDejaConformes: 0,
    proprietairesGestionnairesProteges: 0,
    reglagesAppliques: 0,
    reglagesEchoues: 0,
    erreursParametres: [],
    erreurs: []
  };

  try {
    const groupes = preparerGroupesAdministration_(contexte);

    bilan.groupesPrevus = groupes.length;

    verifierAbsenceDoublonsGroupes_(groupes);

    groupes.forEach(function (groupe) {
      try {
        const resultat = synchroniserUnGroupeAdministration_(groupe, contexte);

        bilan.groupesTraites++;
        bilan.groupesCrees += resultat.cree ? 1 : 0;
        bilan.groupesRenommes += resultat.renomme ? 1 : 0;
        bilan.membresAjoutes += resultat.ajoutes;
        bilan.membresRetires += resultat.retires;
        bilan.membresDejaConformes += resultat.dejaConformes;
        bilan.proprietairesGestionnairesProteges +=
          resultat.proprietairesGestionnairesProteges;
        
        // MODIFICATION: Compter les succès et échecs de paramètres
        if (resultat.reglagesAppliques) {
          bilan.reglagesAppliques++;
        } else if (resultat.erreursReglages && resultat.erreursReglages.length > 0) {
          bilan.reglagesEchoues++;
          resultat.erreursReglages.forEach(function(message) {
            bilan.erreursParametres.push(
              'Groupe "' + groupe.adresse + '" — réglages : ' + message
            );
          });
        }
      } catch (erreurGroupe) {
        bilan.erreurs.push(
          'Groupe "' + groupe.adresse + '" : ' +
          administrationMessageErreur_(erreurGroupe)
        );
      }
    });

    const resume = construireResumeAdministration_(bilan);

    journaliserAdministrationSecurise_(
      bilan.erreurs.length ? 'Échec ou résultat partiel' : 'Succès',
      resume
    );

    // MODIFICATION: Journaliser spécifiquement les échecs de paramètres
    if (bilan.erreursParametres.length > 0) {
      const messageParametres = bilan.erreursParametres.join('\n');
      journaliserAdministrationSecurise_(
        'AVERTISSEMENT',
        'Échecs d\'application des paramètres pour ' + bilan.reglagesEchoues + ' groupe(s) :\n' + messageParametres
      );
    }

    if (bilan.erreurs.length > 0) {
      throw new Error(resume);
    }

    return bilan;
  } finally {
    verrou.releaseLock();
  }
}

function preparerGroupesAdministration_(contexte) {
  if (!contexte || !contexte.configuration) {
    throw new Error(
      'Le contexte de synchronisation ou sa configuration est absent.'
    );
  }

  if (!contexte.configuration.valide) {
    throw new Error(
      'La configuration est invalide. Corrige les erreurs signalées.'
    );
  }

  if (!contexte.groupeAdherents) {
    throw new Error(
      'Le groupe commun des adhérents est absent du contexte.'
    );
  }

  if (!Array.isArray(contexte.groupes)) {
    throw new Error(
      'La liste des groupes de mission est absente ou invalide.'
    );
  }

  const groupes = [contexte.groupeAdherents].concat(contexte.groupes);

  groupes.forEach(function (groupe) {
    validerGroupeAdministration_(
      groupe,
      estGroupeCommunAdministration_(groupe)
    );
  });

  return groupes;
}

/**
 * Un groupe est "commun" si :
 * - il est marqué comme tel à la source (estCommun / type), ou
 * - son adresse correspond à AdresseGroupeAdherents (Config) ou à la
 *   constante CONFIG.ADRESSE_GROUPE_ADHERENTS.
 */
function estGroupeCommunAdministration_(groupe) {
  if (!groupe) return false;

  if (
    groupe.estCommun === true ||
    groupe.groupeCommun === true ||
    groupe.type === 'commun'
  ) {
    return true;
  }

  const adresse = String(groupe.adresse || '').trim().toLowerCase();

  if (!adresse) return false;

  const candidates = [
    CONFIG.ADRESSE_GROUPE_ADHERENTS,
    lireParametresNomGroupeAdministration_().adresseAdherents
  ];

  return candidates.some(function (candidate) {
    return String(candidate || '').trim().toLowerCase() === adresse;
  });
}

function validerGroupeAdministration_(groupe, estGroupeCommun) {
  if (!groupe || typeof groupe !== 'object') {
    throw new Error('Un groupe est vide ou invalide.');
  }

  const adresse = String(groupe.adresse || '').trim().toLowerCase();

  if (!adresse || !CONFIG.REGEX_EMAIL.test(adresse)) {
    throw new Error('Adresse de groupe invalide : "' + adresse + '".');
  }

  if (!Array.isArray(groupe.membres)) {
    throw new Error(
      'La liste des membres du groupe "' + adresse + '" est invalide.'
    );
  }

  const membresNormalises = [];
  const adressesVues = new Set();

  groupe.membres.forEach(function (membre) {
    const email = String(
      typeof membre === 'string'
        ? membre
        : membre && (membre.email || membre.adresse) || ''
    ).trim().toLowerCase();

    if (!email || !CONFIG.REGEX_EMAIL.test(email)) {
      throw new Error(
        'Adresse de membre invalide dans le groupe "' + adresse + '".'
      );
    }

    if (!adressesVues.has(email)) {
      adressesVues.add(email);
      membresNormalises.push(email);
    }
  });

  groupe.membres = membresNormalises;
  groupe.adresse = adresse;

  return groupe;
}

function verifierAbsenceDoublonsGroupes_(groupes) {
  const adresses = new Set();

  groupes.forEach(function (groupe) {
    const adresse = String(groupe.adresse || '').trim().toLowerCase();

    if (adresses.has(adresse)) {
      throw new Error(
        'L’adresse de groupe "' + adresse +
        '" est présente plusieurs fois (deux missions avec le même ' +
        'préfixe, ou groupe commun identique à une mission). ' +
        'Aucune modification lancée.'
      );
    }

    adresses.add(adresse);
  });
}


/* ============================================================
 * 4. SYNCHRONISATION D'UN GROUPE
 * ============================================================ */

function synchroniserUnGroupeAdministration_(groupe, contexte) {
  const resultat = {
    cree: false,
    renomme: false,
    ajoutes: 0,
    retires: 0,
    dejaConformes: 0,
    proprietairesGestionnairesProteges: 0,
    reglagesAppliques: false,
    erreursReglages: []
  };

  const estCommun = estGroupeCommunAdministration_(groupe);
  const nomSouhaite = construireNomGroupeAdministration_(groupe).trim();

  if (!nomSouhaite) {
    throw new Error('Nom de groupe vide pour ' + groupe.adresse);
  }

  let groupeDistant;
  let groupeCree = false;

  try {
    groupeDistant = AdminDirectory.Groups.get(groupe.adresse);
  } catch (erreurLecture) {
    if (!estErreurRessourceAbsenteAdministration_(erreurLecture)) {
      throw erreurLecture;
    }

    if (CONFIG.CREER_GROUPES_SI_ABSENT !== true) {
      throw new Error(
        'Le groupe n’existe pas et la création automatique est désactivée.'
      );
    }

    try {
      groupeDistant = AdminDirectory.Groups.insert({
        email: groupe.adresse,
        name: nomSouhaite
      });

      groupeCree = true;
      resultat.cree = true;

      // DELAS DE 2 SECONDES APRES CREATION POUR QUE GOOGLE PROPAGE LE GROUPE
      Utilities.sleep(2000);
    } catch (erreurCreation) {
      // La création peut échouer si le groupe existe déjà : on le relit.
      try {
        groupeDistant = AdminDirectory.Groups.get(groupe.adresse);
      } catch (erreurRelecture) {
        throw new Error(
          'Création impossible pour ' + groupe.adresse +
          ' ; nom transmis à Google : "' + nomSouhaite +
          '" ; erreur Google : ' +
          administrationMessageErreur_(erreurCreation) +
          ' ; récupération impossible : ' +
          administrationMessageErreur_(erreurRelecture)
        );
      }
    }
  }

  if (!groupeDistant || !groupeDistant.email) {
    throw new Error(
      'Google Groups n’a pas retourné les informations attendues.'
    );
  }

  const cleGroupe = String(
    groupeDistant.id || groupeDistant.email || groupe.adresse
  ).trim();

  // Renommage éventuel (l'adresse n'est jamais modifiée).
  if (String(groupeDistant.name || '').trim() !== nomSouhaite) {
    try {
      AdminDirectory.Groups.update({ name: nomSouhaite }, cleGroupe);
      groupeDistant.name = nomSouhaite;
      resultat.renomme = true;
    } catch (erreurRenommage) {
      throw new Error(
        'Impossible de renommer ' + groupe.adresse +
        ' avec le nom "' + nomSouhaite + '" : ' +
        administrationMessageErreur_(erreurRenommage)
      );
    }
  }

  // Réglages Groups Settings.
  // MODIFICATION: Paramètres appliqués à la création OU si flag temporaire activé
  // Pour forcer l'application sur TOUS les groupes existants une fois :
  // 1. Mettez FORCE_APPLIQUER_PARAMETRES_UNE_FOIS = true en haut de ce fichier
  // 2. Exécutez syncGroups()
  // 3. Remettez FORCE_APPLIQUER_PARAMETRES_UNE_FOIS = false
  const appliquerReglages = groupeCree || FORCE_APPLIQUER_PARAMETRES_UNE_FOIS;

  if (appliquerReglages) {
    verifierServiceAdminGroupsSettings_();

    const nomAfficheReglages = estCommun
      ? (CONFIG.NOM_GROUPE_COMMUN || 'Adhérents')
      : String(groupe.mission || groupe.nomMission || nomSouhaite).trim();

    resultat.erreursReglages = configurerParametresGroupeDiffusion_(
      groupe.adresse,
      nomAfficheReglages,
      groupeCree ? CONFIG.TENTATIVES_REGLAGES_APRES_CREATION : 0
    );
  }

  // Propriétaire configuré.
  const erreurProprietaire = assurerProprietaireGroupeAdministration_(
    cleGroupe,
    groupeCree
  );

  if (erreurProprietaire) {
    resultat.erreursReglages.push(erreurProprietaire);
  }

  resultat.reglagesAppliques =
    appliquerReglages && resultat.erreursReglages.length === 0;

  // Membres.
  const membresActuels = listerMembresGroupeAdministration_(
    cleGroupe,
    groupeCree ? 4 : 0
  );

  const membresAttendus = new Set(
    groupe.membres.map(function (email) {
      return String(email).trim().toLowerCase();
    })
  );

  const membresPresents = new Map();

  membresActuels.forEach(function (membre) {
    const email = String(membre.email || '').trim().toLowerCase();
    if (email) membresPresents.set(email, membre);
  });

  membresAttendus.forEach(function (email) {
    if (membresPresents.has(email)) {
      resultat.dejaConformes++;
      return;
    }

    try {
      AdminDirectory.Members.insert(
        { email: email, role: 'MEMBER' },
        cleGroupe
      );
      resultat.ajoutes++;
    } catch (erreurAjout) {
      const message = administrationMessageErreur_(erreurAjout);

      if (/already exists|duplicate|déjà exist/i.test(message)) {
        resultat.dejaConformes++;
      } else {
        throw new Error(
          'Impossible d’ajouter "' + email + '" : ' + message
        );
      }
    }
  });

  // Retrait des membres non attendus (propriétaires/gestionnaires conservés).
  membresPresents.forEach(function (membre, email) {
    if (membresAttendus.has(email)) return;

    const role = String(membre.role || '').toUpperCase();

    if (role === 'OWNER' || role === 'MANAGER') {
      resultat.proprietairesGestionnairesProteges++;
      return;
    }

    try {
      AdminDirectory.Members.remove(cleGroupe, email);
      resultat.retires++;
    } catch (erreurRetrait) {
      if (estErreurRessourceAbsenteAdministration_(erreurRetrait)) return;

      throw new Error(
        'Impossible de retirer "' + email + '" : ' +
        administrationMessageErreur_(erreurRetrait)
      );
    }
  });

  return resultat;
}

/**
 * Garantit que le propriétaire configuré est OWNER du groupe
 * (abonnement "aucun e-mail"). Retourne un message d'erreur ou ''.
 * Sur un groupe tout neuf, quelques nouvelles tentatives sont faites.
 */
function assurerProprietaireGroupeAdministration_(cleGroupe, groupeCree) {
  if (!CONFIG.EMAIL_PROPRIETAIRE_GROUPES) return '';

  const email = String(CONFIG.EMAIL_PROPRIETAIRE_GROUPES)
    .trim()
    .toLowerCase();

  const tentatives = groupeCree ? 3 : 0;
  let derniereErreur = null;

  for (let i = 0; i <= tentatives; i++) {
    try {
      const role = obtenirRoleMembreAdministration_(cleGroupe, email);

      if (!role) {
        AdminDirectory.Members.insert(
          { email: email, role: 'OWNER', delivery_settings: 'NONE' },
          cleGroupe
        );
      } else if (role !== 'OWNER') {
        AdminDirectory.Members.update(
          { role: 'OWNER', delivery_settings: 'NONE' },
          cleGroupe,
          email
        );
      }

      return '';
    } catch (erreur) {
      derniereErreur = erreur;

      if (
        i < tentatives &&
        estErreurRessourceAbsenteAdministration_(erreur)
      ) {
        Utilities.sleep(1000 * (i + 1));
        continue;
      }

      break;
    }
  }

  return 'Propriétaire du groupe : ' +
    administrationMessageErreur_(derniereErreur);
}

/** Retourne le rôle du membre ou null si absent. */
function obtenirRoleMembreAdministration_(cleGroupe, email) {
  try {
    const membre = AdminDirectory.Members.get(cleGroupe, email);
    return String(membre.role || '').toUpperCase() || null;
  } catch (erreur) {
    if (estErreurRessourceAbsenteAdministration_(erreur)) return null;
    throw erreur;
  }
}

function listerMembresGroupeAdministration_(
  cleGroupe,
  tentativesSupplementaires
) {
  const tentatives = Math.max(0, Number(tentativesSupplementaires) || 0);
  let derniereErreur;

  for (let tentative = 0; tentative <= tentatives; tentative++) {
    try {
      return listerToutesLesPagesMembresAdministration_(cleGroupe);
    } catch (erreur) {
      derniereErreur = erreur;

      const peutReessayer =
        tentative < tentatives &&
        estErreurRessourceAbsenteAdministration_(erreur);

      if (!peutReessayer) throw erreur;

      Utilities.sleep(1000 * (tentative + 1));
    }
  }

  throw derniereErreur;
}

function listerToutesLesPagesMembresAdministration_(cleGroupe) {
  const membres = [];
  let pageToken;

  do {
    const options = { maxResults: 200 };
    if (pageToken) options.pageToken = pageToken;

    const reponse = AdminDirectory.Members.list(cleGroupe, options);

    if (reponse && Array.isArray(reponse.members)) {
      membres.push.apply(membres, reponse.members);
    }

    pageToken = reponse && reponse.nextPageToken
      ? reponse.nextPageToken
      : null;
  } while (pageToken);

  return membres;
}


/* ============================================================
 * 5. NOM DES GROUPES
 * ============================================================ */

/**
 * Groupe commun : "Adhérents".
 * Mission : PREFIXE_NOM_GROUPE + FORMAT_NOM_GROUPE_PAR_DEFAUT
 *           ({Mission}, {Nom du groupe}), limité à 73 caractères.
 */
function construireNomGroupeAdministration_(groupe) {
  if (estGroupeCommunAdministration_(groupe)) {
    return CONFIG.NOM_GROUPE_COMMUN || 'Adhérents';
  }

  const parametres = lireParametresNomGroupeAdministration_();

  const mission = String(
    groupe.mission || groupe.nomMission || 'Mission'
  ).trim();

  const nomGroupe = String(
    parametres.nomGroupe ||
    parametres.codeGroupe ||
    CONFIG.NOM_GROUPE_PAR_DEFAUT ||
    ''
  ).trim();

  const prefixe = CONFIG.PREFIXE_NOM_GROUPE || 'Groupe Diffusion - ';
  const format =
    CONFIG.FORMAT_NOM_GROUPE_PAR_DEFAUT || '{Mission} - {Nom du groupe}';
  const limite = CONFIG.LONGUEUR_MAX_NOM_GROUPE || 73;

  const assembler = function (valeurMission) {
    let corps = format
      .split('{Mission}').join(valeurMission)
      .split('{Nom du groupe}').join(nomGroupe);

    if (!nomGroupe) {
      corps = corps.replace(/\s*[-–]\s*$/, '');
    }

    return prefixe + corps;
  };

  const longueurMissionMax = limite - assembler('').length;

  if (longueurMissionMax < 1) {
    throw new Error(
      'Le paramètre NomGroupe est trop long pour créer un nom valide : ' +
      nomGroupe
    );
  }

  const missionCourte = mission.substring(0, longueurMissionMax).trim();

  return assembler(missionCourte).trim().substring(0, limite);
}

/**
 * Lit NomGroupe, CodeGroupe et AdresseGroupeAdherents dans Config.
 * NomGroupe est prioritaire ; CodeGroupe sert de recours.
 * Ne modifie pas la feuille Config.
 */
function lireParametresNomGroupeAdministration_() {
  const resultat = {
    nomGroupe: '',
    codeGroupe: '',
    adresseAdherents: ''
  };

  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = classeur.getSheetByName(CONFIG.ONGLET_CONFIG);

  if (!feuille || feuille.getLastRow() < 1) return resultat;

  feuille.getDataRange().getDisplayValues().forEach(function (ligne) {
    if (ligne.length < 2) return;

    const cle = String(ligne[0] || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');

    const valeur = String(ligne[1] || '').trim();

    if (cle === 'nomgroupe') resultat.nomGroupe = valeur;
    if (cle === 'codegroupe') resultat.codeGroupe = valeur;
    if (cle === 'adressegroupeadherents') {
      resultat.adresseAdherents = valeur;
    }
  });

  return resultat;
}


/* ============================================================
 * 6. RÉGLAGES GROUPS SETTINGS
 * ============================================================ */

/**
 * Construit les réglages à appliquer, en deux lots.
 * Toutes les valeurs sont des chaînes (format attendu par l'API).
 */
function construireReglagesGroupeDiffusion_(groupeEmail, nomAffiche) {
  const parties = String(groupeEmail).split('@');
  const nom = String(nomAffiche || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  const footer =
    '👋 Bienvenue sur le groupe de diffusion ' + nom + '.\n' +
    'Ce territoire a créé cette adresse de diffusion pour vous ' +
    'communiquer des informations.\n' +
    '🗑️ Vous pouvez vous désinscrire en envoyant un e-mail à ' +
    'l\'adresse "' + parties[0] + '+unsubscribe@' + parties[1] + '".';

  return {
    lot1: {
      whoCanJoin: 'INVITED_CAN_JOIN',
      allowExternalMembers: 'true',
      whoCanViewGroup: CONFIG.VISIBILITE_CONVERSATIONS || 'ANYONE_CAN_VIEW',
      whoCanPostMessage: 'ALL_IN_DOMAIN_CAN_POST',     // dérogation n°1
      whoCanViewMembership: 'ALL_MANAGERS_CAN_VIEW',
      allowWebPosting: 'true',
      isArchived: 'true',
      messageModerationLevel: 'MODERATE_NONE',          // dérogation n°2
      sendMessageDenyNotification: 'false',
      whoCanLeaveGroup: 'ALL_MEMBERS_CAN_LEAVE',        // garantit le +unsubscribe
      includeCustomFooter: 'true',
      customFooterText: footer,
      primaryLanguage: 'fr'
    },
    lot2: {
      whoCanContactOwner: 'ALL_MANAGERS_CAN_CONTACT',
      whoCanModerateMembers: 'OWNERS_AND_MANAGERS',
      spamModerationLevel: 'REJECT',
      replyTo: 'REPLY_TO_MANAGERS',
      enableCollaborativeInbox: 'false',
      whoCanDiscoverGroup: 'ALL_IN_DOMAIN_CAN_DISCOVER',
      membersCanPostAsTheGroup: 'true',
      defaultSender: 'GROUP',
      whoCanModerateContent: 'OWNERS_AND_MANAGERS',
      whoCanAssistContent: 'MANAGERS_ONLY'
    }
  };
}

/**
 * Applique un lot de réglages, avec nouvelles tentatives si le groupe
 * n'est pas encore connu de Groups Settings (404 juste après création).
 */
function patcherReglagesAvecRetryAdministration_(
  groupeEmail,
  reglages,
  tentatives
) {
  const maxTentatives = Math.max(0, Number(tentatives) || 0);
  let derniereErreur;

  for (let i = 0; i <= maxTentatives; i++) {
    try {
      const objet = AdminGroupsSettings.newGroups();

      Object.keys(reglages).forEach(function (cle) {
        objet[cle] = reglages[cle];
      });

      AdminGroupsSettings.Groups.patch(objet, groupeEmail);
      return;
    } catch (erreur) {
      derniereErreur = erreur;

      if (
        i < maxTentatives &&
        estErreurRessourceAbsenteAdministration_(erreur)
      ) {
        // DELAS DE 3 SECONDES ENTRE LES TENTATIVES (au lieu de 2)
        Utilities.sleep(3000 * (i + 1));
        continue;
      }

      throw erreur;
    }
  }

  throw derniereErreur;
}

/**
 * Applique un lot. Si le lot est rejeté (une valeur invalide fait échouer
 * tout le patch), chaque réglage est réessayé séparément pour isoler
 * précisément celui qui pose problème.
 * Retourne la liste des échecs (vide si tout est passé).
 */
function appliquerLotReglagesAdministration_(
  groupeEmail,
  libelle,
  reglages,
  tentatives
) {
  const echecs = [];

  try {
    patcherReglagesAvecRetryAdministration_(
      groupeEmail,
      reglages,
      tentatives
    );
    return echecs;
  } catch (erreurLot) {
    if (estErreurRessourceAbsenteAdministration_(erreurLot)) {
      echecs.push(
        libelle + ' : ' + administrationMessageErreur_(erreurLot)
      );
      return echecs;
    }
  }

  Object.keys(reglages).forEach(function (cle, index) {
    try {
      const un = {};
      un[cle] = reglages[cle];
      patcherReglagesAvecRetryAdministration_(groupeEmail, un, 0);
      
      // DELAS DE 1 SECONDE ENTRE CHAQUE PARAMETRE POUR ÉVITER LE QUOTA
      if (index < Object.keys(reglages).length - 1) {
        Utilities.sleep(1000);
      }
    } catch (erreurUnitaire) {
      echecs.push(
        libelle + ' — ' + cle + ' : ' +
        administrationMessageErreur_(erreurUnitaire)
      );
    }
  });

  return echecs;
}

/**
 * Applique les réglages "Groupe Diffusion" puis relit le groupe pour
 * vérifier que TOUS les champs contrôlables ont bien été pris en compte
 * (l'API peut accepter un patch que la politique de l'organisation
 * neutralise ensuite, p. ex. les membres externes).
 * Retourne la liste des échecs.
 */
function configurerParametresGroupeDiffusion_(
  groupeEmail,
  nomAffiche,
  tentatives
) {
  verifierServiceAdminGroupsSettings_();

  const reglages = construireReglagesGroupeDiffusion_(
    groupeEmail,
    nomAffiche
  );

  const echecs = []
    .concat(
      appliquerLotReglagesAdministration_(
        groupeEmail, 'Lot 1 (réglages principaux)',
        reglages.lot1, tentatives
      )
    );

  // DELAS DE 2 SECONDES ENTRE LOT1 ET LOT2 POUR ÉVITER LE QUOTA
  Utilities.sleep(2000);

  echecs.concat(
    appliquerLotReglagesAdministration_(
      groupeEmail, 'Lot 2 (réglages secondaires)',
      reglages.lot2, tentatives
    )
  );

  // Relecture complète (hors texte du pied de page et langue).
  try {
    const relu = AdminGroupsSettings.Groups.get(groupeEmail);
    const attendus = Object.assign({}, reglages.lot1, reglages.lot2);

    delete attendus.customFooterText;
    delete attendus.primaryLanguage;

    Object.keys(attendus).forEach(function (cle) {
      const dejaEnEchec = echecs.some(function (message) {
        return message.indexOf(' — ' + cle + ' :') !== -1;
      });

      if (dejaEnEchec) return;

      if (String(relu[cle]) !== String(attendus[cle])) {
        echecs.push(
          'Non confirmé après relecture — ' + cle +
          ' : attendu "' + attendus[cle] +
          '", actuel "' + relu[cle] + '"'
        );
      }
    });
  } catch (erreurRelecture) {
    echecs.push(
      'Vérification des réglages impossible : ' +
      administrationMessageErreur_(erreurRelecture)
    );
  }

  return echecs;
}

/**
 * Réglages à terminer À LA MAIN dans l'Admin Console (absents de l'API).
 */
function checklistManuelleDiffusion_(groupeEmail, prefixeObjet) {
  return [
    'Message de bienvenue (texte fourni dans le document de référence)',
    'Préfixe d\'objet : "' +
      (prefixeObjet || CONFIG.PREFIXE_OBJET_DIFFUSION) + '"',
    'Mode Conversation : Activé',
    'Identification requise pour les nouveaux membres : ' +
      'Profil d\'organisation uniquement',
    'Qui peut afficher l\'adresse e-mail des membres : Gestionnaires de groupe',
    'Qui peut modifier les rôles personnalisés : Gestionnaire de groupe',
    'Libellés partagés : Activer les libellés partagés pour ce groupe',
    'Qui peut répondre aux auteurs en mode privé : Toute l\'organisation'
  ].map(function (item) {
    return '  ⚙️ À FAIRE MANUELLEMENT sur ' + groupeEmail + ' : ' + item;
  });
}


/* ============================================================
 * 7. MENU : RÉAPPLIQUER LES RÉGLAGES
 * ============================================================ */

/**
 * Cherche dans Mapping la mission associée à une adresse de groupe.
 */
function trouverMissionParAdresseAdministration_(email) {
  try {
    const feuille = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(CONFIG.ONGLET_MAPPING);

    if (!feuille || feuille.getLastRow() < 2) return '';

    const donnees = feuille.getDataRange().getDisplayValues();
    const entetes = donnees[0].map(function (texte) {
      return String(texte || '').trim().toLowerCase().replace(/\s+/g, '');
    });

    const colonneMission = entetes.indexOf('mission');
    const colonneAdresse = entetes.indexOf('adressegroupe');

    if (colonneMission < 0 || colonneAdresse < 0) return '';

    for (let i = 1; i < donnees.length; i++) {
      const adresse = String(donnees[i][colonneAdresse] || '')
        .trim()
        .toLowerCase();

      if (adresse === email) {
        return String(donnees[i][colonneMission] || '').trim();
      }
    }
  } catch (erreur) {
    // Repli sur le nom du groupe.
  }

  return '';
}

/**
 * Détermine le nom à afficher dans le pied de page, de façon cohérente
 * avec la synchronisation normale.
 */
function determinerNomAfficheReglagesAdministration_(email, nomGroupeGoogle) {
  if (estGroupeCommunAdministration_({ adresse: email })) {
    return CONFIG.NOM_GROUPE_COMMUN || 'Adhérents';
  }

  const mission = trouverMissionParAdresseAdministration_(email);
  if (mission) return mission;

  const prefixe = CONFIG.PREFIXE_NOM_GROUPE || 'Groupe Diffusion - ';
  let nom = String(nomGroupeGoogle || email).trim();

  if (nom.indexOf(prefixe) === 0) nom = nom.substring(prefixe.length);

  const suffixe = ' - ' + lireParametresNomGroupeAdministration_().nomGroupe;
  if (suffixe.length > 3 && nom.slice(-suffixe.length) === suffixe) {
    nom = nom.slice(0, -suffixe.length);
  }

  return nom.trim() || email;
}

/**
 * Menu : réapplique les réglages de diffusion à un groupe existant du domaine.
 */
function reappliquerReglagesMenu() {
  const action = 'Réappliquer les réglages Diffusion';

  // Fonctionne que verifierUtilisateurAutorise_ lève une exception
  // (refus) ou retourne false.
  if (verifierUtilisateurAutorise_(action) === false) return;

  const ui = SpreadsheetApp.getUi();

  const reponse = ui.prompt(
    action,
    'Adresse du groupe existant (@' + CONFIG.DOMAINE + ') :',
    ui.ButtonSet.OK_CANCEL
  );

  if (reponse.getSelectedButton() !== ui.Button.OK) return;

  const email = reponse.getResponseText().trim().toLowerCase();
  if (!email) return;

  const suffixeDomaine = '@' + String(CONFIG.DOMAINE).toLowerCase();

  if (
    !CONFIG.REGEX_EMAIL.test(email) ||
    email.slice(-suffixeDomaine.length) !== suffixeDomaine
  ) {
    ui.alert(
      'Adresse refusée : le groupe doit appartenir au domaine ' +
      CONFIG.DOMAINE + '.'
    );
    return;
  }

  try {
    verifierServiceAdminDirectory_();
    verifierServiceAdminGroupsSettings_();

    let groupe;

    try {
      groupe = AdminDirectory.Groups.get(email);
    } catch (erreurLecture) {
      if (estErreurRessourceAbsenteAdministration_(erreurLecture)) {
        ui.alert('Groupe introuvable : ' + email);
        return;
      }
      throw erreurLecture;
    }

    const nomAffiche = determinerNomAfficheReglagesAdministration_(
      email,
      groupe.name
    );

    const erreurs = configurerParametresGroupeDiffusion_(
      email,
      nomAffiche,
      0
    );

    ui.alert(
      erreurs.length
        ? 'Réglages réappliqués sur ' + email +
          ', mais avec des échecs :\n\n' + erreurs.join('\n')
        : '✅ Réglages Groupe Diffusion réappliqués avec succès sur ' + email
    );

    if (typeof ecrireActionJournal_ === 'function') {
      ecrireActionJournal_(
        action,
        erreurs.length
          ? [email].concat(erreurs.map(function (e) { return '⚠ ' + e; }))
          : [email + ' : succès']
      );
    }
  } catch (erreur) {
    ui.alert(
      'Impossible de configurer le groupe :\n\n' +
      administrationMessageErreur_(erreur)
    );
  }
}


/* ============================================================
 * 8. OUTILS
 * ============================================================ */

function estErreurRessourceAbsenteAdministration_(erreur) {
  const message = administrationMessageErreur_(erreur);

  return (
    /\b404\b/.test(message) ||
    /not found/i.test(message) ||
    /resource not found/i.test(message) ||
    /introuvable/i.test(message) ||
    /ressource absente/i.test(message)
  );
}

function administrationMessageErreur_(erreur) {
  if (erreur === null || erreur === undefined) {
    return 'Erreur inconnue.';
  }

  if (typeof erreur === 'string') return erreur;

  return String(erreur.message || erreur);
}

function construireResumeAdministration_(bilan) {
  const succes = bilan.erreurs.length === 0 && bilan.erreursParametres.length === 0;

  const lignes = [
    'Bilan de synchronisation Google Groups',
    'Résultat : ' + (succes ? 'Succès' : 'Échec ou résultat partiel'),
    'Groupes prévus : ' + bilan.groupesPrevus,
    'Groupes traités : ' + bilan.groupesTraites,
    'Groupes créés : ' + bilan.groupesCrees,
    'Groupes renommés : ' + bilan.groupesRenommes,
    'Membres ajoutés : ' + bilan.membresAjoutes,
    'Membres retirés : ' + bilan.membresRetires,
    'Membres déjà conformes : ' + bilan.membresDejaConformes,
    'Propriétaires/gestionnaires protégés : ' +
      bilan.proprietairesGestionnairesProteges,
    'Groupes avec réglages appliqués sans erreur : ' +
      (bilan.reglagesAppliques || 0)
  ];

  // MODIFICATION: Ajouter les échecs de paramètres dans le résumé
  if (bilan.reglagesEchoues > 0) {
    lignes.push(
      '',
      'Échecs d\'application des paramètres : ' + bilan.reglagesEchoues + ' groupe(s)',
      ''
    );
    bilan.erreursParametres.forEach(function(erreur) {
      lignes.push('- ' + erreur);
    });
  }

  if (bilan.erreurs.length > 0) {
    lignes.push('', 'ERREURS :');

    bilan.erreurs.forEach(function (erreur) {
      lignes.push('- ' + erreur);
    });
  }

  return lignes.join('\n');
}

function journaliserAdministrationSecurise_(resultat, details) {
  try {
    const classeur = SpreadsheetApp.getActiveSpreadsheet();
    const feuille = classeur.getSheetByName(CONFIG.ONGLET_JOURNAL);

    if (!feuille) {
      console.log(resultat + '\n' + details);
      return;
    }

    feuille.appendRow([
      new Date(),
      'Synchronisation Google Groups',
      resultat,
      details
    ]);
  } catch (erreur) {
    console.error(
      'Impossible d’écrire dans le journal : ' +
      administrationMessageErreur_(erreur)
    );

    console.log(resultat + '\n' + details);
  }
}

/**
 * Teste l'accès et prépare les données sans modifier les groupes.
 */
function testerAccesDonneesAdministration() {
  try {
    verifierServiceAdminDirectory_();

    const contexte = obtenirContexteSDK_();
    const groupes = preparerGroupesAdministration_(contexte);

    const lignes = [
      'Test de préparation réussi.',
      'Nombre de groupes préparés : ' + groupes.length,
      '',
      'Groupes détectés :'
    ];

    groupes.forEach(function (groupe) {
      lignes.push(
        '- ' + groupe.adresse +
        ' (' + groupe.membres.length + ' membre(s) attendu(s))'
      );
    });

    SpreadsheetApp.getUi().alert(lignes.join('\n'));
  } catch (erreur) {
    SpreadsheetApp.getUi().alert(
      'Le test a échoué.\n\n' + administrationMessageErreur_(erreur)
    );

    throw erreur;
  }
}


/* ============================================================
 * NOUVELLE FONCTION : APPLIQUER LES PARAMÈTRES SUR TOUS LES GROUPES
 * ============================================================ */

/**
 * Applique les paramètres sur TOUS les groupes existants (une seule fois)
 * À exécuter manuellement pour initialiser les paramètres sur des groupes déjà créés
 */
function appliquerParametresTousGroupes_() {
  const verrou = LockService.getScriptLock();

  if (!verrou.tryLock(30000)) {
    throw new Error('Une autre opération est déjà en cours. Réessayez plus tard.');
  }

  try {
    verifierServiceAdminDirectory_();
    verifierServiceAdminGroupsSettings_();

    const contexte = preparerSynchronisation_({ autoriserMissionsInvalides: false });
    const groupes = [contexte.groupeAdherents].concat(contexte.groupes);

    let successes = 0;
    let failures = 0;
    const errorDetails = [];

    const ui = SpreadsheetApp.getUi();
    const progressBar = ui.createProgressBar(
      'Application des paramètres...',
      0,
      groupes.length
    );

    groupes.forEach(function(groupe, index) {
      progressBar.setProgress(index);

      // DELAS DE 3 SECONDES ENTRE CHAQUE GROUPE POUR ÉVITER LE QUOTA
      if (index > 0) {
        Utilities.sleep(3000);
      }

      try {
        const nomAffiche = estGroupeCommunAdministration_(groupe)
          ? (CONFIG.NOM_GROUPE_COMMUN || 'Adhérents')
          : String(groupe.mission || groupe.nomMission || groupe.adresse).trim();

        const erreurs = configurerParametresGroupeDiffusion_(
          groupe.adresse,
          nomAffiche,
          4
        );

        if (erreurs.length === 0) {
          successes++;
        } else {
          failures++;
          errorDetails.push(...erreurs.map(e => `❌ ${groupe.adresse} — ${e}`));
        }
      } catch (e) {
        failures++;
        errorDetails.push(`❌ ${groupe.adresse} — ${administrationMessageErreur_(e)}`);
      }
    });

    progressBar.dismiss();

    const message = [
      `✅ Paramètres appliqués sur ${successes} groupe(s)`,
      `❌ Échecs: ${failures} groupe(s)`
    ];

    if (errorDetails.length > 0) {
      message.push('', 'Détails des échecs:', ...errorDetails);
    }

    journaliserAdministrationSecurise_(
      failures > 0 ? 'AVERTISSEMENT' : 'SUCCÈS',
      message.join('\n')
    );

    SpreadsheetApp.getUi().alert(
      'Application des paramètres terminée',
      message.join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return {
      successes: successes,
      failures: failures,
      errorDetails: errorDetails
    };

  } catch (e) {
    journaliserAdministrationSecurise_(
      'ERREUR',
      `Échec application paramètres: ${administrationMessageErreur_(e)}`
    );
    SpreadsheetApp.getUi().alert(
      'Erreur',
      `Impossible d'appliquer les paramètres: ${administrationMessageErreur_(e)}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw e;
  } finally {
    verrou.releaseLock();
  }
}
