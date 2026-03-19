import { ORDER_START_HOUR, ORDER_CUTOFF_HOUR, ORDER_TIMEZONE } from '../../constants/orderRules'

const isGenneiaPostreOption = (isGenneia, option = {}) => {
  return isGenneia && (option.title || '').toLowerCase().includes('postre')
}

const matchesOverrideKeyword = (val = '') => {
  const t = (val || '').toString().toLowerCase()
  return (
    t.includes('mp') ||
    t.includes('mp cena') ||
    t.includes('menú principal') ||
    t.includes('menu principal') ||
    t.includes('menú cena') ||
    t.includes('menu cena') ||
    t.includes('menu de cena') ||
    t.includes('menú de cena') ||
    t.includes('opción cena') ||
    t.includes('veggie') ||
    t.includes('veg') ||
    t.includes('vegetar')
  )
}

const isDinnerOverrideValue = (val) => {
  if (Array.isArray(val)) return val.some(v => matchesOverrideKeyword(v))
  return matchesOverrideKeyword(val)
}

const hasDinnerOverrideInResponses = (responses = []) => {
  if (!Array.isArray(responses)) return false
  return responses.some(r => {
    if (!r) return false
    const resp = r.response
    if (isDinnerOverrideValue(resp)) return true
    if (matchesOverrideKeyword(r.title || '')) return true
    return false
  })
}

const isOutsideWindow = () => {
  try {
    const nowBA = new Date(new Date().toLocaleString('en-US', { timeZone: ORDER_TIMEZONE }))
    const hour = nowBA.getHours()
    return hour < ORDER_START_HOUR || hour >= ORDER_CUTOFF_HOUR
  } catch (err) {
    console.error('Error checking cutoff time', err)
    return false
  }
}

export {
  isGenneiaPostreOption,
  matchesOverrideKeyword,
  isDinnerOverrideValue,
  hasDinnerOverrideInResponses,
  isOutsideWindow
}
