const CAFETERIA_TZ = 'America/Argentina/Buenos_Aires'
const START_HOUR = 7
const END_HOUR = 14

export const getBuenosAiresHour = () => {
  try {
    const formatter = new Intl.DateTimeFormat('es-AR', {
      hour: 'numeric',
      hour12: false,
      timeZone: CAFETERIA_TZ
    })
    const hour = Number(formatter.format(new Date()))
    return Number.isFinite(hour) ? hour : null
  } catch (_err) {
    return new Date().getHours()
  }
}

export const isCafeteriaWithinWindow = () => {
  const hour = getBuenosAiresHour()
  if (hour === null) return true
  return hour >= START_HOUR && hour < END_HOUR
}

export const getCafeteriaWindowLabel = () => '07:00 a 14:00 (hora Buenos Aires)'
