/**
 * ============================================================
 * autorisation.gs
 * Gestion des autorisations du projet Group Sync
 * ============================================================
 *
 * Les actions listées dans CONFIG.ACTIONS_RESTREINTES sont réservées
 * aux comptes présents dans CONFIG.UTILISATEURS_AUTORISES.
 *
 * Important :
 * Cette protection s'applique aux fonctions qui appellent explicitement
 * verifierUtilisateurAutorise_() ou exigerAdministrateur_().
 * Elle ne remplace pas les contrôles d'accès du classeur Google Sheets
 * ni les autorisations Google Workspace.
 */


/**
 * Retourne l'adresse e-mail de l'utilisateur actif.
 *
 * Selon les paramètres du compte et du domaine Google Workspace,
 * Google peut ne pas communiquer cette adresse au script.
 *
 * @return {string} Adresse normalisée ou chaîne vide.
 */
function obtenirEmailUtilisateurActif_() {
  try {
    return String(
      Session.getActiveUser().getEmail() || ''
    ).trim().toLowerCase();
  } catch (erreur) {
    console.warn(
      'Impossible de récupérer l’adresse de l’utilisateur actif.'
    );
    return '';
  }
}


/**
 * Normalise une adresse e-mail pour la comparer.
 */
function normaliserEmailAutorisation_(adresse) {
  return String(adresse == null ? '' : adresse)
    .trim()
    .toLowerCase();
}


/**
 * Normalise un nom d'action pour la comparer.
 */
function normaliserActionAutorisation_(nomAction) {
  return String(nomAction == null ? '' : nomAction)
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr');
}


/**
 * Indique si l'utilisateur actuel figure dans la liste des administrateurs.
 *
 * Si Google ne fournit pas son adresse, l'accès est refusé.
 *
 * @return {boolean}
 */
function utilisateurEstAdministrateur_() {
  const email = obtenirEmailUtilisateurActif_();

  if (!email) {
    return false;
  }

  const utilisateursAutorises = Array.isArray(
    CONFIG.UTILISATEURS_AUTORISES
  )
    ? CONFIG.UTILISATEURS_AUTORISES
    : [];

  return utilisateursAutorises.some(function(adresse) {
    const emailAutorise = normaliserEmailAutorisation_(adresse);

    return emailAutorise !== '' && emailAutorise === email;
  });
}


/**
 * Vérifie l'autorisation pour une action restreinte.
 *
 * Les actions non déclarées dans CONFIG.ACTIONS_RESTREINTES
 * ne sont pas bloquées par cette fonction.
 *
 * @param {string} nomAction Nom de l'action à vérifier.
 * @return {boolean}
 * @throws {Error} Si l'utilisateur n'est pas autorisé.
 */
function verifierUtilisateurAutorise_(nomAction) {
  verifierConfigurationAutorisation();

  const action = String(nomAction == null ? '' : nomAction).trim();

  if (!action) {
    throw new Error(
      'Le nom de l’action à autoriser est vide.'
    );
  }

  const actionNormalisee = normaliserActionAutorisation_(action);
  const actionsRestreintes = CONFIG.ACTIONS_RESTREINTES;

  const actionRestreinte = actionsRestreintes.some(function(nom) {
    return normaliserActionAutorisation_(nom) === actionNormalisee;
  });

  // Les actions non déclarées comme restreintes restent accessibles
  // au regard de ce contrôle uniquement.
  if (!actionRestreinte) {
    return true;
  }

  const email = obtenirEmailUtilisateurActif_();

  if (!email) {
    throw new Error(
      'Google ne permet pas d’identifier le compte utilisateur actuel. ' +
      'Impossible d’autoriser cette action. Vérifie les paramètres ' +
      'du compte et de Google Workspace.'
    );
  }

  if (!utilisateurEstAdministrateur_()) {
    throw new Error(
      'Accès refusé à l’action « ' + action + ' » pour le compte ' +
      email + '. Contacte un administrateur du projet.'
    );
  }

  return true;
}


/**
 * Exige que l'utilisateur actuel soit administrateur.
 *
 * Contrairement à verifierUtilisateurAutorise_(), cette fonction
 * exige systématiquement un compte administrateur.
 *
 * @return {boolean}
 * @throws {Error} Si l'utilisateur n'est pas administrateur.
 */
function exigerAdministrateur_() {
  verifierConfigurationAutorisation();

  const email = obtenirEmailUtilisateurActif_();

  if (!email) {
    throw new Error(
      'Impossible d’identifier le compte Google actuel. ' +
      'L’accès administrateur est refusé par sécurité.'
    );
  }

  if (!utilisateurEstAdministrateur_()) {
    throw new Error(
      'Accès administrateur refusé pour ' + email + '.'
    );
  }

  return true;
}


/**
 * Vérifie que la configuration des autorisations est valide.
 *
 * @return {boolean}
 * @throws {Error} Si la configuration est invalide.
 */
function verifierConfigurationAutorisation() {
  const erreurs = [];

  if (typeof CONFIG === 'undefined' || !CONFIG) {
    throw new Error(
      'La constante CONFIG est introuvable.'
    );
  }

  if (
    !Array.isArray(CONFIG.UTILISATEURS_AUTORISES) ||
    CONFIG.UTILISATEURS_AUTORISES.length === 0
  ) {
    erreurs.push(
      'CONFIG.UTILISATEURS_AUTORISES doit contenir au moins une adresse e-mail.'
    );
  } else {
    const adressesValides = CONFIG.UTILISATEURS_AUTORISES.filter(
      function(adresse) {
        const email = normaliserEmailAutorisation_(adresse);

        return email !== '' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      }
    );

    if (adressesValides.length === 0) {
      erreurs.push(
        'Aucune adresse valide n’est présente dans CONFIG.UTILISATEURS_AUTORISES.'
      );
    }
  }

  if (!Array.isArray(CONFIG.ACTIONS_RESTREINTES)) {
    erreurs.push(
      'CONFIG.ACTIONS_RESTREINTES doit être un tableau.'
    );
  }

  if (erreurs.length > 0) {
    throw new Error(erreurs.join('\n'));
  }

  return true;
}