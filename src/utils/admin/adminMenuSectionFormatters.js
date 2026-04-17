const DATE_TIMEZONE_SUFFIX = 'T00:00:00'

const normalizeDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const parsed = new Date(`${value}${DATE_TIMEZONE_SUFFIX}`)
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const toISODate = (date) => {
  if (!(date instanceof Date)) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekDays = (startDate) => {
  const start = normalizeDate(startDate) || normalizeDate(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

const formatDateLabel = (dateISO) => {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${dateISO}${DATE_TIMEZONE_SUFFIX}`))
  } catch {
    return dateISO
  }
}

const formatDayLabel = (date) => {
  try {
    return new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase()
  } catch {
    return toISODate(date)
  }
}

const formatDayNumber = (date) => {
  try {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(date)
  } catch {
    return String(date.getDate()).padStart(2, '0')
  }
}

const formatMonthLabel = (date) => {
  try {
    return new Intl.DateTimeFormat('es-AR', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase()
  } catch {
    return ''
  }
}

const formatMonthFull = (date) => {
  try {
    const raw = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date)
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  } catch {
    return ''
  }
}

export {
  normalizeDate,
  toISODate,
  getWeekDays,
  formatDateLabel,
  formatDayLabel,
  formatDayNumber,
  formatMonthLabel,
  formatMonthFull
}
