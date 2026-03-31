const normalizeText = (value = '') => {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
}

const isMainMenuOption = (name = '') => {
  const normalized = normalizeText(name)
  return normalized === 'menú principal' || normalized === 'menu principal' || normalized === 'plato principal'
}

const isOptionFive = (value) => {
  if (value === 5 || value === '5') return true
  const text = normalizeText(value)
  if (!text) return false
  if (text.includes('opción 5') || text.includes('opcion 5')) return true
  return /\b0?5\b/.test(text)
}

const isOptionSix = (value) => {
  if (value === 6 || value === '6') return true
  const text = normalizeText(value)
  if (!text) return false
  if (text.includes('opción 6') || text.includes('opcion 6')) return true
  return /\b0?6\b/.test(text)
}

const isCeliacOption = (value) => {
  const text = normalizeText(value)
  if (!text) return false
  return text.includes('celiac') || text.includes('celiaco') || text.includes('celíaco')
}

const isSaladOption = (name = '', optionLabelOrCode, description = '') => {
  const nameText = normalizeText(name)
  const descText = normalizeText(description)
  return (
    nameText.includes('ensalada') ||
    descText.includes('ensalada') ||
    isOptionFive(optionLabelOrCode) ||
    isOptionSix(optionLabelOrCode) ||
    isCeliacOption(optionLabelOrCode) ||
    isCeliacOption(nameText) ||
    isCeliacOption(descText) ||
    isOptionFive(nameText) ||
    isOptionFive(descText)
  )
}

const canChooseCustomSide = (name = '', optionLabelOrCode, description = '') => {
  return !isMainMenuOption(name) && !isSaladOption(name, optionLabelOrCode, description)
}

export {
  isMainMenuOption,
  isSaladOption,
  canChooseCustomSide
}
