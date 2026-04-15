export const clearDinnerOverrideResponses = ({ prevResponses, isDinnerOverrideValue }) => {
  const next = {}
  Object.entries(prevResponses || {}).forEach(([k, v]) => {
    if (!isDinnerOverrideValue(v)) next[k] = v
  })
  return next
}

export const getDinnerOverrideChoice = ({
  dinnerSpecialChoice,
  customResponsesDinner,
  visibleDinnerOptions,
  matchesOverrideKeyword
}) => {
  if (dinnerSpecialChoice) return dinnerSpecialChoice

  // 1) Detectar por respuestas (valor)
  const responses = customResponsesDinner || {}
  for (const value of Object.values(responses)) {
    if (Array.isArray(value)) {
      const match = value.find(v => matchesOverrideKeyword(v))
      if (match) return match
    } else if (matchesOverrideKeyword(value)) {
      return value
    }
  }

  // 2) Detectar por título de la pregunta (por si la opción es Sí/No)
  if (Array.isArray(visibleDinnerOptions)) {
    for (const opt of visibleDinnerOptions) {
      if (!opt || !opt.id) continue
      if (!matchesOverrideKeyword(opt.title || '')) continue

      const resp = responses[opt.id]
      if (Array.isArray(resp) && resp.length > 0) return resp[0]
      if (typeof resp === 'string' && resp.trim() !== '') return resp
    }
  }

  return null
}

export const validateDinnerExclusivity = ({ itemsCount, overrideChoice }) => {
  if (itemsCount > 0 && overrideChoice) {
    return 'Para cena elegí menú o la opción de cena, no ambas.'
  }
  if (itemsCount > 1) {
    return 'Solo un menú por persona en cena.'
  }
  return null
}

