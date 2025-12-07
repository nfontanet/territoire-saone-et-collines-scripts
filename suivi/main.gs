/** @OnlyCurrentDoc */

function createSuivi() {
  // Récupère la feuille active.
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const suivi = new Suivi(sheet);
  suivi.create();
}
