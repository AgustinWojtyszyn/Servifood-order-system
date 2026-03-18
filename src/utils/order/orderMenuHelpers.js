export const extractNumber = (name = '') => {
  const match = name.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : Infinity
}

export const isMainMenu = (name = '') => {
  const normalized = name.toLowerCase()
  return normalized.includes('menú principal') || normalized.includes('menu principal') || normalized.includes('plato principal')
}

export const sortMenuItems = (items) => {
  return [...items].sort((a, b) => {
    const aMain = isMainMenu(a.name)
    const bMain = isMainMenu(b.name)
    if (aMain !== bMain) return aMain ? -1 : 1

    const aNum = extractNumber(a.name)
    const bNum = extractNumber(b.name)
    const aHasNum = Number.isFinite(aNum) && aNum !== Infinity
    const bHasNum = Number.isFinite(bNum) && bNum !== Infinity

    if (aHasNum && bHasNum) return aNum - bNum
    if (aHasNum !== bHasNum) return aHasNum ? -1 : 1

    return (a.name || '').localeCompare(b.name || '')
  })
}
