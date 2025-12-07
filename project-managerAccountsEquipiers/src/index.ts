import { getPeriodMandatCurrent } from "./adapters/dayjs.adapter.js";
import { findSharedFolderByName } from "./sdk/drive/sharedFolder.js";
import { getNommageDriveByPeriodMandat } from "./sdk/drive/temporality.js";

export const main = (): void => {
  // Logique de la fonction
  const periodMandat = getPeriodMandatCurrent()

  const nameDrivePartagerByMandat = getNommageDriveByPeriodMandat(periodMandat)
  const drivePartager = findSharedFolderByName(nameDrivePartagerByMandat)

  console.log('drivePartager:', drivePartager)
};