/**
 * ============================================================
 * 01_Menu.gs
 * Menu principal Group Sync
 * ============================================================
 */

/**
 * Crée le menu principal à l'ouverture du classeur.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  const menuSynchronisation = ui.createMenu('🔄 Synchronisation')
    .addItem('▶️ Synchroniser maintenant', 'syncGroups')
    .addItem('🧪 Simuler la synchronisation', 'syncGroupsDryRun');

  const menuAdresses = ui.createMenu('📧 Gestion des groupes')
    .addItem(
      '✨ Calculer les adresses des missions',
      'genererAdressesGroupes'
    )
    .addItem(
      '🏷️ Afficher les préfixes e-mail',
      'ouvrirMappingAdressesGroupes_'
    )
    .addItem(
      '⚙️ Afficher les paramètres de diffusion',
      'ouvrirConfigAdressesGroupes_'
    )
    .addSeparator()
    .addItem(
      '📋 Actualiser les listes de missions',
      'actualiserListesMissionsAdherents'
    );

  const menuConfiguration = ui.createMenu('⚙️ Configuration')
    .addItem('🛠️ Initialiser les onglets', 'initSheets')
    .addSeparator()
    .addItem('👁️ Afficher Config', 'afficherOngletConfig')
    .addItem('🙈 Masquer Config', 'masquerOngletConfig')
    .addSeparator()
    .addItem('📖 Actualiser le guide', 'rafraichirInfosConfiguration')
    .addItem('👁️ Afficher le guide', 'afficherOngletInfos')
    .addItem('🙈 Masquer le guide', 'masquerOngletInfos');

  const menuOutils = ui.createMenu('🧰 Outils')
    .addItem(
      '🎨 Réappliquer la mise en forme',
      'mettreEnFormeOnglets'
    )
    .addItem(
      '🔧 Réafficher le menu',
      'reappliquerReglagesMenu'
    )
    .addSeparator()
    .addItem(
      '📅 Vérifier la détection de saison',
      'debugDetectionSaison'
    );

  ui.createMenu('Group Sync')
    .addSubMenu(menuSynchronisation)
    .addSubMenu(menuAdresses)
    .addSubMenu(menuConfiguration)
    .addSubMenu(menuOutils)
    .addToUi();
}

/**
 * Réaffiche le menu sans recharger le classeur.
 */
function reappliquerReglagesMenu() {
  onOpen();
}

/**
 * Ouvre Config et sélectionne la valeur du paramètre PrefixeObjet.
 */
function ouvrirConfigAdressesGroupes_() {
  ouvrirOngletEtSelectionnerParametre_(
    CONFIG.ONGLET_CONFIG,
    'PrefixeObjet'
  );
}

/**
 * Ouvre Mapping pour gérer les préfixes des missions.
 */
function ouvrirMappingAdressesGroupes_() {
  afficherOngletMenu_(CONFIG.ONGLET_MAPPING);
}

/**
 * Ouvre un onglet et sélectionne la cellule de valeur du paramètre
 * recherché dans la première colonne.
 *
 * La recherche ignore la casse et les espaces superflus.
 */
function ouvrirOngletEtSelectionnerParametre_(nomOnglet, parametre) {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const feuille = classeur.getSheetByName(nomOnglet);

  if (!feuille) {
    ui.alert(
      'Onglet introuvable : « ' + nomOnglet + ' ».\n\n' +
      'Vérifie le nom de l’onglet ou initialise les onglets ' +
      'si cela est nécessaire.'
    );
    return;
  }

  feuille.showSheet();
  classeur.setActiveSheet(feuille);

  const derniereLigne = feuille.getLastRow();

  if (derniereLigne < 1 || feuille.getLastColumn() < 1) {
    ui.alert(
      'L’onglet « ' + nomOnglet + ' » est vide.'
    );
    return;
  }

  const valeurs = feuille
    .getRange(1, 1, derniereLigne, Math.min(2, feuille.getMaxColumns()))
    .getDisplayValues();

  const parametreRecherche = normaliserTexteMenu_(parametre);

  const index = valeurs.findIndex(function(ligne, i) {
    return i > 0 &&
      normaliserTexteMenu_(ligne[0]) === parametreRecherche;
  });

  if (index < 0) {
    ui.alert(
      'Paramètre introuvable : « ' + parametre + ' » dans l’onglet « ' +
      nomOnglet + ' ».\n\n' +
      'Vérifie le nom du paramètre dans la première colonne.'
    );
    return;
  }

  if (valeurs[index].length < 2) {
    ui.alert(
      'La colonne contenant la valeur du paramètre est introuvable.'
    );
    return;
  }

  feuille.setActiveRange(feuille.getRange(index + 1, 2));
}

/**
 * Normalise un texte pour les comparaisons dans le menu.
 */
function normaliserTexteMenu_(valeur) {
  return String(valeur == null ? '' : valeur)
    .trim()
    .toLocaleLowerCase('fr');
}

/**
 * Affiche un onglet à partir de son nom.
 */
function afficherOngletMenu_(nomOnglet) {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const feuille = classeur.getSheetByName(nomOnglet);

  if (!feuille) {
    ui.alert(
      'Onglet introuvable : « ' + nomOnglet + ' ».\n\n' +
      'Vérifie le nom de l’onglet dans la configuration.'
    );
    return;
  }

  feuille.showSheet();
  classeur.setActiveSheet(feuille);
}

/**
 * Masque un onglet sans masquer le dernier onglet visible.
 */
function masquerOngletMenu_(nomOnglet) {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const feuille = classeur.getSheetByName(nomOnglet);

  if (!feuille) {
    ui.alert(
      'Onglet introuvable : « ' + nomOnglet + ' ».'
    );
    return;
  }

  if (feuille.isSheetHidden()) {
    ui.alert(
      'L’onglet « ' + nomOnglet + ' » est déjà masqué.'
    );
    return;
  }

  const nombreOngletsVisibles = classeur.getSheets().filter(
    function(onglet) {
      return !onglet.isSheetHidden();
    }
  ).length;

  if (nombreOngletsVisibles <= 1) {
    ui.alert(
      'Impossible de masquer cet onglet : le classeur doit conserver ' +
      'au moins un onglet visible.'
    );
    return;
  }

  const feuilleActive = classeur.getActiveSheet();

  feuille.hideSheet();

  // Si l'onglet masqué était actif, activer un onglet restant visible.
  if (feuilleActive.getSheetId() === feuille.getSheetId()) {
    const autreFeuilleVisible = classeur.getSheets().find(
      function(onglet) {
        return !onglet.isSheetHidden();
      }
    );

    if (autreFeuilleVisible) {
      classeur.setActiveSheet(autreFeuilleVisible);
    }
  }
}

/**
 * Affiche l’onglet Config.
 */
function afficherOngletConfig() {
  afficherOngletMenu_(CONFIG.ONGLET_CONFIG);
}

/**
 * Masque l’onglet Config.
 */
function masquerOngletConfig() {
  masquerOngletMenu_(CONFIG.ONGLET_CONFIG);
}

/**
 * Affiche le guide de configuration.
 */
function afficherOngletInfos() {
  afficherOngletMenu_(CONFIG.ONGLET_INFOS);
}

/**
 * Masque le guide de configuration.
 */
function masquerOngletInfos() {
  masquerOngletMenu_(CONFIG.ONGLET_INFOS);
}