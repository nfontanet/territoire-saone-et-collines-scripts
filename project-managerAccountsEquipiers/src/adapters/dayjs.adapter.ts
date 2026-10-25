import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import { PeriodMandat } from '../types/temporality.js'
export type { Dayjs } from 'dayjs'

dayjs.extend(utc)

const dayjsWithUtc: typeof dayjs.utc = dayjs.utc

export { dayjsWithUtc as dayjs }
export default dayjsWithUtc

export const getPeriodMandatCurrent = (): PeriodMandat => {
  const now = dayjsWithUtc()

  return {
    start: now.startOf('year').year(),
    end: now.endOf('year').add(1, 'year').year()
  }
}
