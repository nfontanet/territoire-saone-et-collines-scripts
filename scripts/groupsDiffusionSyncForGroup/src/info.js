
/**
 * ============================================================
 * 09_Infos.gs
 * Documentation et informations de configuration de Group Sync
 * ============================================================
 *
 * Rôle :
 * - Afficher les informations utiles dans l'onglet Infos.
 * - Documenter la configuration nécessaire à Group Sync.
 * - Expliquer le fonctionnement des groupes Google.
 * - Rappeler les règles de validation et de synchronisation.
 *
 * IMPORTANT :
 * Ce fichier ne crée, ne renomme et ne synchronise aucun groupe
 * Google. Il sert uniquement à afficher la documentation.
 */


/* ============================================================
 * 1. ACTUALISATION DE L'ONGLET INFOS
 * ============================================================ */

/**
 * Actualise le contenu de l'onglet Infos.
 *
 * Cette fonction peut être lancée depuis Apps Script.
 */
function rafraichirInfosConfiguration() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const nomOnglet = 'Infos';

  let feuille = classeur.getSheetByName(nomOnglet);

  if (!feuille) {
    feuille = classeur.insertSheet(nomOnglet);
  }

  const informations = construireInformationsConfiguration_();

  feuille.clear();

  feuille.getRange(1, 1, informations.length, 2)
    .setValues(informations);

  feuille.setFrozenRows(1);
  feuille.setColumnWidth(1, 230);
  feuille.setColumnWidth(2, 700);

  feuille.getRange(1, 1, 1, 2)
    .merge()
    .setValue('GROUP SYNC — INFORMATIONS ET CONFIGURATION')
    .setFontWeight('bold')
    .setFontSize(14);

  feuille.getRange(1, 1, 1, 2)
    .setWrap(true);

  if (informations.length > 1) {
    feuille.getRange(2, 1, informations.length - 1, 2)
      .setWrap(true)
      .setVerticalAlignment('top');

    feuille.getRange(2, 1, informations.length - 1, 1)
      .setFontWeight('bold');
  }

  feuille.setRowHeight(1, 42);
  feuille.autoResizeRows(2, Math.max(informations.length - 1, 1));

  SpreadsheetApp.flush();

  classeur.toast(
    'Les informations de Group Sync ont été actualisées.',
    'Group Sync',
    5
  );
}


/* ============================================================
 * 2. CONSTRUCTION DU CONTENU
 * ============================================================ */

/**
 * Prépare les informations affichées dans l'onglet Infos.
 *
 * Chaque ligne contient :
 * [Rubrique, Description]
 */
function construireInformationsConfiguration_() {
  const configuration = lireConfigurationInfos_();

  return [
    [
      'Rubrique',
      'GROUP SYNC — INFORMATIONS ET CONFIGURATION'
    ],
    [
      'Présentation',
      'Group Sync synchronise les membres des groupes Google à partir ' +
      'des données de l’onglet Adhérents et des correspondances définies ' +
      'dans l’onglet Mapping.'
    ],
    [
      'Onglet Adhérents',
      'La colonne Mission peut contenir plusieurs missions, séparées ' +
      'par des virgules. Chaque membre peut ainsi être affecté à plusieurs ' +
      'groupes de mission.'
    ],
    [
      'Statut de diffusion',
      'Seuls les adhérents dont le statut de diffusion est Actif et qui ' +
      'possèdent une adresse email valide sont ajoutés aux groupes.'
    ],
    [
      'Groupe commun',
      'Le groupe commun rassemble tous les adhérents actifs ayant une ' +
      'adresse email valide, indépendamment de leur mission.'
    ],
    [
      'Nom du groupe commun',
      'Le nom d’affichage du groupe commun est Adhérents.'
    ],
    [
      'Adresse du groupe commun',
      'Le paramètre AdresseGroupeAdherents dans Config définit l’adresse ' +
      'du groupe commun. Vérifiez que cette adresse correspond au groupe ' +
      'Google réellement utilisé.'
    ],
    [
      'Onglet Mapping',
      'Mapping contient les missions autorisées, leur préfixe email et ' +
      'l’adresse du groupe correspondant.'
    ],
    [
      'Colonne Mission',
      'Nom de la mission utilisé pour affecter les adhérents au groupe.'
    ],
    [
      'Colonne PrefixeEmail',
      'Préfixe servant à construire l’adresse du groupe de mission. ' +
      'Les préfixes sont conservés et ne doivent pas être écrasés ' +
      'automatiquement.'
    ],
    [
      'Colonne AdresseGroupe',
      'Adresse calculée à partir du préfixe, de CodeGroupe et du domaine ' +
      'configuré dans le projet.'
    ],
    [
      'Paramètre CodeGroupe',
      'Valeur utilisée pour construire les adresses des groupes de mission.'
    ],
    [
      'Paramètre NomGroupe',
      'Texte ajouté à la fin du nom d’affichage des groupes de mission.'
    ],
    [
      'Format des adresses',
      'PrefixeEmail-CodeGroupe@domaine configuré dans le projet.'
    ],
    [
      'Format des noms',
      'Groupe Diffusion - Mission - NomGroupe. Exemple : Groupe Diffusion ' +
      '- Compagnons - SVCR.'
    ],
    [
      'Limite des noms',
      'Le nom d’affichage d’un groupe Google ne doit pas dépasser 73 ' +
      'caractères. Si nécessaire, la partie correspondant à la mission ' +
      'doit être raccourcie.'
    ],
    [
      'Missions inconnues',
      'Une mission saisie dans Adhérents mais absente de Mapping doit être ' +
      'corrigée. Group Sync ne doit pas ajouter automatiquement une ' +
      'mission inconnue à Mapping.'
    ],
    [
      'Validation des missions',
      'Les missions manquantes ou inconnues sont signalées dans Adhérents. ' +
      'La synchronisation réelle est bloquée tant que ces erreurs ne ' +
      'sont pas corrigées.'
    ],
    [
      'Simulation',
      'La simulation analyse les données et présente un bilan sans ' +
      'modifier les groupes Google.'
    ],
    [
      'Synchronisation réelle',
      'La synchronisation réelle peut créer les groupes manquants, ' +
      'mettre à jour leurs noms et ajuster leurs membres selon les ' +
      'données préparées par Group Sync.'
    ],
    [
      'Fin de synchronisation',
      'Une fenêtre récapitulative de réussite est affichée lorsque ' +
      'la fonction de synchronisation se termine sans erreur.'
    ],
    [
      'Erreurs',
      'En cas d’erreur, consultez le message affiché et le journal ' +
      'd’exécution avant de relancer la synchronisation.'
    ],
    [
      'Sécurité',
      'Vérifiez les autorisations du compte exécutant le script et ' +
      'les droits d’administration Google Groups avant toute ' +
      'synchronisation réelle.'
    ],
    [
      'SynchroAutomatique',
      'Ce paramètre indique si la synchronisation automatique est ' +
      'souhaitée. Son effet dépend du mécanisme de déclenchement ' +
      'installé dans le projet.'
    ],
    [
      'Configuration actuelle',
      construireResumeConfigurationInfos_(configuration)
    ],
    [
      'Domaine',
      configuration.domaine || 'À vérifier dans 00_Config.gs'
    ],
    [
      'CodeGroupe',
      configuration.codeGroupe || 'Non renseigné dans Config'
    ],
    [
      'NomGroupe',
      configuration.nomGroupe || 'Non renseigné dans Config'
    ],
    [
      'AdresseGroupeAdherents',
      configuration.adresseGroupeAdherents ||
      'Non renseignée dans Config'
    ],
    [
      'SynchroAutomatique',
      configuration.synchroAutomatique || 'Non renseigné dans Config'
    ],
    [
      'Dernière actualisation',
      new Date()
    ]
  ];
}


/* ============================================================
 * 3. LECTURE DE CONFIG
 * ============================================================ */

/**
 * Lit les paramètres connus de l'onglet Config.
 *
 * Format attendu :
 * Colonne A : nom du paramètre
 * Colonne B : valeur du paramètre
 *
 * Cette fonction ne modifie pas Config.
 */
function lireConfigurationInfos_() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();

  const nomOngletConfig =
    typeof CONFIG !== 'undefined' &&
    CONFIG.ONGLET_CONFIG
      ? CONFIG.ONGLET_CONFIG
      : 'Config';

  const feuille = classeur.getSheetByName(nomOngletConfig);

  const resultat = {
    domaine: '',
    codeGroupe: '',
    nomGroupe: '',
    adresseGroupeAdherents: '',
    synchroAutomatique: ''
  };

  if (!feuille || feuille.getLastRow() < 2) {
    return resultat;
  }

  const valeurs = feuille.getRange(
    2,
    1,
    feuille.getLastRow() - 1,
    2
  ).getDisplayValues();

  const parametres = {};

  valeurs.forEach(function(ligne) {
    const cle = String(ligne[0] || '').trim();
    const valeur = String(ligne[1] || '').trim();

    if (cle) {
      parametres[cle] = valeur;
    }
  });

  resultat.codeGroupe =
    parametres.CodeGroupe || '';

  resultat.nomGroupe =
    parametres.NomGroupe || '';

  resultat.adresseGroupeAdherents =
    parametres.AdresseGroupeAdherents || '';

  resultat.synchroAutomatique =
    parametres.SynchroAutomatique || '';

  if (
    typeof CONFIG !== 'undefined' &&
    CONFIG.DOMAINE
  ) {
    resultat.domaine = String(CONFIG.DOMAINE);
  }

  return resultat;
}


/* ============================================================
 * 4. RÉSUMÉ DE LA CONFIGURATION
 * ============================================================ */

/**
 * Construit un résumé lisible de la configuration.
 */
function construireResumeConfigurationInfos_(configuration) {
  const elements = [];

  elements.push(
    'Domaine : ' +
    (configuration.domaine || 'à vérifier')
  );

  elements.push(
    'CodeGroupe : ' +
    (configuration.codeGroupe || 'non renseigné')
  );

  elements.push(
    'NomGroupe : ' +
    (configuration.nomGroupe || 'non renseigné')
  );

  elements.push(
    'AdresseGroupeAdherents : ' +
    (configuration.adresseGroupeAdherents || 'non renseignée')
  );

  elements.push(
    'SynchroAutomatique : ' +
    (configuration.synchroAutomatique || 'non renseigné')
  );

  return elements.join(' | ');
}
