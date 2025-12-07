import { getPeriodMandatCurrent } from "./adapters/dayjs.adapter.js";
import { findSharedFolderByName } from "./sdk/drive/sharedFolder.js";
import { getNommageDriveByPeriodMandat } from "./sdk/drive/temporality.js";


// Etendre globalThis pour App Script
declare global {
  var excutor: () => void
}

// Définition de la fonction d'exécution
globalThis.excutor = () => {
  // Logique de la fonction
  const periodMandat = getPeriodMandatCurrent()

  const nameDrivePartagerByMandat = getNommageDriveByPeriodMandat(periodMandat)
  const drivePartager = findSharedFolderByName(nameDrivePartagerByMandat)

  console.log('drivePartager:', drivePartager)
};