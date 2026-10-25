// ==================== MISSIONS PAR DÉFAUT (D'APRÈS LE DOCUMENT DE RÉFÉRENCE) ====================
/**
 * Liste des 25 missions du document "Paramétrage des paramètres des Groupes", section
 * "Pour SAINT VINCENT DE CROIX ROUSSE" (le modèle par groupe local, applicable à n'importe
 * quel groupe SGDF en changeant juste CONFIG.CODE_GROUPE).
 *
 * CodeMission est laissé VIDE : le document ne fournit pas les codes à 3 chiffres de
 * l'intranet SGDF. À compléter manuellement au fur et à mesure, ou lors de l'import
 * automatique prévu en Phase 2.
 *
 * AdresseGroupe est laissée VIDE volontairement : elle sera générée automatiquement
 * ({PrefixeEmail}.{CONFIG.CODE_GROUPE}@{CONFIG.DOMAINE}) au premier "Générer les adresses
 * de groupe" ou à la première synchronisation — voir 09_AdressesGroupe.gs.
 */
const MISSIONS_PAR_DEFAUT = [
  // [CodeMission, Mission, PrefixeEmail]
  // [CodeMission, Mission, PrefixeEmail]
  ['', 'Directeurs de camps du groupe', 'directeur'],
  ['', 'Secrétaires du groupe', 'secretaire'],
  ['', 'Responsables du groupe', 'rg'],
  ['', 'Responsables matériels du groupe', 'responsable.matos'],
  ['', 'Trésoriers du groupe', 'tresorier'],
  ['', 'Cléophas', 'cleopha'],
  ['', 'Responsables adultes farfadets du groupe', 'responsable.adulte.farfa'],
  ['', 'Chefs louveteaux et jeannettes du groupe', 'chef.lj'],
  ['', 'Chefs scouts et guides du groupe', 'chef.sg'],
  ['', 'Chefs pionniers et caravelles du groupe', 'chef.pc'],
  ['', 'Compagnons du groupe', 'compagnon'],
  ['', 'Compagnons en première année du groupe', 'compagnon.a1'],
  ['', 'Compagnons en deuxième année du groupe', 'compagnon.a2'],
  ['', 'Compagnons en troisième année du groupe', 'compagnon.a3'],
  ['', 'Soutien Adultes', 'soutien.adulte']
];

/**
 * Écrit MISSIONS_PAR_DEFAUT dans l'onglet Mapping, à la suite des en-têtes.
 * N'écrase jamais des lignes existantes : n'ajoute que si l'onglet est vide (hors en-tête),
 * pour ne jamais dupliquer ou écraser du travail déjà fait.
 */
function remplirMappingAvecMissionsParDefaut_(mapping) {
  if (mapping.getLastRow() > 1) return 0; // déjà des données au-delà de l'en-tête : on ne touche à rien

  const lignes = MISSIONS_PAR_DEFAUT.map(([codeMission, mission, prefixe]) => [codeMission, mission, prefixe, '']);
  mapping.getRange(2, 1, lignes.length, HEADERS_MAPPING.length).setValues(lignes);
  return lignes.length;
}

/** Appelable depuis le menu : pré-remplit Mapping sans passer par une réinitialisation complète. */
function preremplirMissionsMenu() {
  if (!verifierUtilisateurAutorise_('Pré-remplir les missions par défaut')) return;

  const ui = SpreadsheetApp.getUi();
  const mapping = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ONGLET_MAPPING);
  if (!mapping) {
    ui.alert(`Onglet "${CONFIG.ONGLET_MAPPING}" introuvable. Lance d'abord "Initialiser les onglets".`);
    return;
  }
  const nb = remplirMappingAvecMissionsParDefaut_(mapping);
  if (nb === 0) {
    ui.alert(`L'onglet "${CONFIG.ONGLET_MAPPING}" contient déjà des données : rien n'a été ajouté (pour ne rien écraser).`);
    ecrireActionJournal_('Pré-remplir les missions par défaut', ['Rien ajouté (Mapping déjà rempli)']);
  } else {
    mettreEnFormeMapping_();
    ui.alert(`${nb} mission(s) pré-remplie(s) dans l'onglet "${CONFIG.ONGLET_MAPPING}".`);
    ecrireActionJournal_('Pré-remplir les missions par défaut', [`${nb} mission(s) ajoutée(s)`]);
  }
}