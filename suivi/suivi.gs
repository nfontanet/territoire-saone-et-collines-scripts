const NAME_ONGLET_ADMIN = 'Admin';
const NAME_ONGLET_GUIDE = 'Guide';
const NAME_ONGLET_GLOBAL = 'Global';

const RANGE_TYPE_CAMP_IN_GUIDE = 'D13';
const RANGE_GROUPE_IN_GUIDE = 'D14';
const RANGE_TYPE_CAMP_IN_ADMIN = 'A2:A20';

const RANGE_TEMPLATE_6_TO_6_ANS = 'I2';
const RANGE_TEMPLATE_8_TO_11_ANS = 'I3';
const RANGE_TEMPLATE_11_TO_17_ANS = 'I4';
const RANGE_TEMPLATE_COMPA_T2 = 'I5';
const RANGE_TEMPLATE_COMPA = 'I6';

class Suivi {
  constructor(sheetCurrent) {
    this.sheetCurrent = sheetCurrent;
    this.nameOngletAdmin = NAME_ONGLET_ADMIN;
    this.nameOngletGuide = NAME_ONGLET_GUIDE;
    this.nameOngletGlobal = NAME_ONGLET_GLOBAL;
    this.assetSheet();
  }

  assetSheet() {
    const ongletAdmin = this.getOngletAdmin();
    if (!ongletAdmin)
      throw new Error(
        `L'onglet ${this.nameOngletAdmin} doit être present sur l'excel. `
      );

    const ongletGuide = this.getOngletGuide();
    if (!ongletGuide)
      throw new Error(
        `L'onglet ${this.nameOngletGuide} doit être present sur l'excel. `
      );

    const ongletGlobal = this.getOngletGlobal();
    if (!ongletGlobal)
      throw new Error(
        `L'onglet ${this.nameOngletGlobal} doit être present sur l'excel. `
      );
  }

  static bySheet(sheetCurrent) {
    const suivi = new Suivi(sheetCurrent);
    return suivi;
  }

  //! Onglet
  getOnglet(nameOnglet) {
    const onglet = this.sheetCurrent.getSheetByName(nameOnglet);
    if (!onglet) return null;
    return onglet;
  }

  getOngletAdmin() {
    const nameOnglet = this.nameOngletAdmin;
    return this.getOnglet(nameOnglet);
  }

  getOngletGuide() {
    const nameOnglet = this.nameOngletGuide;
    return this.getOnglet(nameOnglet);
  }

  getOngletGlobal() {
    const nameOnglet = this.nameOngletGlobal;
    return this.getOnglet(nameOnglet);
  }

  getOngletTemplate(nameTemplate) {
    return this.getOnglet(nameTemplate);
  }

  //! Cell
  getValueOfTypeName() {
    const onglet = this.getOngletGuide();
    if (!onglet) return null;

    const range = RANGE_TYPE_CAMP_IN_GUIDE;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueOfGroupe() {
    const onglet = this.getOngletGuide();
    if (!onglet) return null;

    const range = RANGE_GROUPE_IN_GUIDE;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueTemplate6to8ans() {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const range = RANGE_TEMPLATE_6_TO_6_ANS;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueTemplate8to11ans() {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const range = RANGE_TEMPLATE_8_TO_11_ANS;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueTemplate11to17ans() {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const range = RANGE_TEMPLATE_11_TO_17_ANS;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueTemplateCompaT2() {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const range = RANGE_TEMPLATE_COMPA_T2;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  getValueTemplateCompa() {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const range = RANGE_TEMPLATE_COMPA;
    const cell = onglet.getRange(range);
    if (!cell) return null;

    const value = cell.getValue();
    return value.trim();
  }

  //! Create
  create() {
    const typeCamp = this.getValueOfTypeName();
    if (!typeCamp) throw new Error(`Nous n'avons pas trouvé le type de camp.`);

    const groupe = this.getValueOfGroupe();
    if (!groupe) throw new Error(`Nous n'avons pas trouvé le groupe`);

    SpreadsheetApp.getUi().alert(
      `Création d'un onglet de suivi pour le groupe (${groupe}) sur le type de camp (${typeCamp}) .`
    );

    const newOnglet = this.createOngletByTypeCamp(typeCamp, groupe);
    this.sheetCurrent.setActiveSheet();
  }

  //! Onglet
  createOngletByTypeCamp(typeCamp, groupe) {
    const nommageOfOnglet = this.getNommageTemplate(typeCamp);

    if (!nommageOfOnglet)
      throw new Error(
        `Nous n'avons pas trouvé le nommage pour le template de type camp (${typeCamp})`
      );

    const nameNewOnglet = this.getNameOfNewOnglet(nommageOfOnglet, groupe);

    SpreadsheetApp.getUi().alert(`TypeCamp : ${typeCamp}`);
    const nameOngletTemplate = this.getNameOngletTemplate(typeCamp);

    if (!nameOngletTemplate)
      throw new Error(
        `Nous n'avons pas trouvé le nom du template associé au ${typeCamp}`
      );

    const newOnglet = this.duplicateOnglet(nameOngletTemplate, nameNewOnglet);
    if (!newOnglet)
      throw new Error(
        `Nous n'arrivons pas à dupliquer le template ${nameOngletTemplate} avec le nom suivant ${nameNewOnglet}`
      );

    return newOnglet;
  }

  duplicateOnglet(nameOngletOrigin, nameOngletWant) {
    const ongletOrigin = this.sheetCurrent.getSheetByName(nameOngletOrigin);
    if (!ongletOrigin) return null;

    const newOnglet = ongletOrigin
      .copyTo(this.sheetCurrent)
      .setName(nameOngletWant);

    this.sheetCurrent.setActiveSheet(newOnglet);
    this.sheetCurrent.moveActiveSheet(3);
    return newOnglet;
  }

  getNameOfNewOnglet(nommageOfOnglet, groupe) {
    return nommageOfOnglet.replace('${groupe}', groupe);
  }

  getNommageTemplate(typeCamp) {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    const rangeTypeCamp = RANGE_TYPE_CAMP_IN_ADMIN;
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp).getValues();

    let rowIndexTypeCamp = cellsInRangeTypeCamp.findIndex(
      (cell) => cell[0].trim() === typeCamp
    );

    if (rowIndexTypeCamp === -1) return null;

    rowIndexTypeCamp = rowIndexTypeCamp + 2; // Ajouter 2 car A2 correspond à l'index 0

    const rangeTemplate = `D${rowIndexTypeCamp}`;
    const cell = onglet.getRange(rangeTemplate);
    if (!cell) return null;

    const value = cell.getValue().trim();
    return value;
  }

  // Template
  getNameOngletTemplate(typeCamp) {
    const onglet = this.getOngletAdmin();
    if (!onglet) return null;

    if (this.isTemplate6to8ans(onglet, typeCamp)) {
      return this.getValueTemplate6to8ans();
    }

    if (this.isTemplate8to11ans(onglet, typeCamp)) {
      return this.getValueTemplate8to11ans();
    }

    if (this.isTemplate11to17ans(onglet, typeCamp)) {
      return this.getValueTemplate11to17ans();
    }

    if (this.isTemplateCompT2(onglet, typeCamp)) {
      return this.getValueTemplateCompaT2();
    }

    if (this.isTemplateCompa(onglet, typeCamp)) {
      return this.getValueTemplateCompa();
    }

    return null;
  }

  isTemplate6to8ans(onglet, typeCamp) {
    const rangeTypeCamp = 'J2';
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp);
    if (!cellsInRangeTypeCamp) return false;

    const valueTypesCampAssociatiedInTemplate = cellsInRangeTypeCamp.getValue();
    const typesCampAssociatedInTemplate = valueTypesCampAssociatiedInTemplate
      .split(',')
      .map((value) => value.trim());

    const isTemplate = typesCampAssociatedInTemplate.some(
      (value) => value === typeCamp
    );

    return isTemplate;
  }

  isTemplate8to11ans(onglet, typeCamp) {
    const rangeTypeCamp = 'J3';
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp);
    if (!cellsInRangeTypeCamp) return false;

    const valueTypesCampAssociatiedInTemplate = cellsInRangeTypeCamp.getValue();
    const typesCampAssociatedInTemplate = valueTypesCampAssociatiedInTemplate
      .split(',')
      .map((value) => value.trim());

    const isTemplate = typesCampAssociatedInTemplate.some(
      (value) => value === typeCamp
    );

    return isTemplate;
  }

  isTemplate11to17ans(onglet, typeCamp) {
    const rangeTypeCamp = 'J4';
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp);
    if (!cellsInRangeTypeCamp) return false;

    const valueTypesCampAssociatiedInTemplate = cellsInRangeTypeCamp.getValue();
    const typesCampAssociatedInTemplate = valueTypesCampAssociatiedInTemplate
      .split(',')
      .map((value) => value.trim());

    const isTemplate = typesCampAssociatedInTemplate.some(
      (value) => value === typeCamp
    );

    return isTemplate;
  }

  isTemplateCompT2(onglet, typeCamp) {
    const rangeTypeCamp = 'J5';
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp);
    if (!cellsInRangeTypeCamp) return false;

    const valueTypesCampAssociatiedInTemplate = cellsInRangeTypeCamp.getValue();
    const typesCampAssociatedInTemplate =
      valueTypesCampAssociatiedInTemplate.split(',');

    const isTemplate = typesCampAssociatedInTemplate.some(
      (value) => value === typeCamp
    );

    return isTemplate;
  }

  isTemplateCompa(onglet, typeCamp) {
    const rangeTypeCamp = 'J6';
    const cellsInRangeTypeCamp = onglet.getRange(rangeTypeCamp);
    if (!cellsInRangeTypeCamp) return false;

    const valueTypesCampAssociatiedInTemplate = cellsInRangeTypeCamp.getValue();
    const typesCampAssociatedInTemplate =
      valueTypesCampAssociatiedInTemplate.split(',');

    const isTemplate = typesCampAssociatedInTemplate.some(
      (value) => value === typeCamp
    );

    return isTemplate;
  }
}
