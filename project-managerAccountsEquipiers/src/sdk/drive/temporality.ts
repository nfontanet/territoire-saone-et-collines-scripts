import { PeriodMandat } from "../../types/temporality.js"

export const getNommageDriveByPeriodMandat = (period: PeriodMandat): string => {
  return `Année ${period.start} - ${period.end}`
}