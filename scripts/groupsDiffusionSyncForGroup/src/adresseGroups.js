// ==================== GÉNÉRATION DES ADRESSES DE GROUPE (MAPPING) ====================
/**
 * Un classeur = un groupe SGDF (ex: "SAINT VINCENT DE CROIX ROUSSE"). CONFIG.CODE_GROUPE
 * contient l'abréviation courte de CE groupe (ex: 'svcr'), utilisée pour construire
 * automatiquement les adresses e-mail des groupes Google Diffusion, sur le modèle
 * observé dans le document de référence : {PrefixeEmail}.{CodeGroupe}@{Domaine}
 * (ex: rg.svcr@sgdf-lyon-saone-et-collines.fr).
 *
 * Le champ "CodeMission" (3 chiffres) sert de référence avec l'intranet SGDF, où chaque
 * mission est identifiée par un code numérique à 3 chiffres — utile pour l'import
 * automatique prévu en Phase 2, même s'il n'est pas utilisé pour construire l'adresse.
 */

/**
 * Construit l'adresse e-mail d'un groupe à partir de son préfixe et du code du groupe SGDF.
 * Retourne null si les informations nécessaires manquent.
 */
function construireAdresseGroupe_(prefixeEmail) {
  if (!prefixeEmail || !CONFIG.CODE_GROUPE) return null;
  return `${prefixeEmail}.${CONFIG.CODE_GROUPE}@${CONFIG.DOMAINE}`.toLowerCase();
}

/**
 * Parcourt l'onglet Mapping et complète RÉELLEMENT la colonne AdresseGroupe pour chaque
 * ligne où PrefixeEmail est rempli et AdresseGroupe est vide. Une adresse déjà saisie
 * manuellement n'est JAMAIS écrasée — utile pour les exceptions type adresses "Générales"
 * sans suffixe de groupe (ex: newsletters@domaine.fr, sans ".svcr").
 * Retourne le nombre de cellules complétées.
 */
function appliquerAdressesGroupeMapping_() {
  if (!CONFIG.CODE_GROUPE) return 0;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ONGLET_MAPPING);
  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxPrefixe = headers.indexOf('PrefixeEmail');
  const idxAdresse = headers.indexOf('AdresseGroupe');
  if (idxPrefixe === -1 || idxAdresse === -1) return 0;

  let compteur = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const prefixe = String(row[idxPrefixe] || '').trim();
    const adresseActuelle = String(row[idxAdresse] || '').trim();
    if (!prefixe || adresseActuelle) continue; // rien à générer, ou déjà rempli manuellement

    const adresse = construireAdresseGroupe_(prefixe);
    if (adresse) {
      sheet.getRange(i + 1, idxAdresse + 1).setValue(adresse);
      compteur++;
    }
  }
  return compteur;
}

/** Appelable depuis le menu : génère les adresses sans lancer de synchro complète. */
function genererAdressesGroupeMenu() {
  if (!verifierUtilisateurAutorise_('Générer les adresses de groupe')) return;

  const ui = SpreadsheetApp.getUi();
  if (!CONFIG.CODE_GROUPE) {
    ui.alert(
      'CONFIG.CODE_GROUPE n\'est pas défini dans 00_Config.gs.\n' +
      'Renseigne l\'abréviation de ce groupe SGDF (ex: "svcr") avant de générer les adresses.'
    );
    return;
  }
  const nb = appliquerAdressesGroupeMapping_();
  ui.alert(
    `${nb} adresse(s) de groupe générée(s) dans l'onglet "${CONFIG.ONGLET_MAPPING}" ` +
    `(code groupe : "${CONFIG.CODE_GROUPE}").`
  );
  ecrireActionJournal_('Générer les adresses de groupe', [`${nb} adresse(s) générée(s)`, `code groupe: ${CONFIG.CODE_GROUPE}`]);
}