import { ORDER_TIMEZONE } from '../constants/orderRules'

const getDatePartsInTimeZone = (date, timeZone = ORDER_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day
  }
}

const formatISODateFromParts = ({ year, month, day } = {}) => {
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

const getTodayISOInTimeZone = (timeZone = ORDER_TIMEZONE) => {
  return formatISODateFromParts(getDatePartsInTimeZone(new Date(), timeZone))
}

const addDaysToISO = (isoDate = '', delta = 0) => {
  const [y, m, d] = (isoDate || '').split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(Date.UTC(y, m - 1, d + delta))
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getTomorrowISOInTimeZone = (timeZone = ORDER_TIMEZONE) => {
  return addDaysToISO(getTodayISOInTimeZone(timeZone), 1)
}

export {
  getTodayISOInTimeZone,
  getTomorrowISOInTimeZone,
  addDaysToISO,
  formatISODateFromParts,
  getDatePartsInTimeZone
}
