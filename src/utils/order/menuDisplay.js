const normalizeText = (value = '') => (value || '').toString().trim()

const getMenuLabelByIndex = (index = 0) => (index === 0 ? 'Menú principal' : `Opción ${index}`)

const getMenuDish = (item = {}) => {
  const description = normalizeText(item.description)
  if (description) return description
  return normalizeText(item.name)
}

const getMenuDisplay = (item = {}, index = 0) => {
  const slotIndex = Number.isFinite(item?.slotIndex) ? item.slotIndex : index
  const label = getMenuLabelByIndex(slotIndex)
  const dish = getMenuDish(item)
  return {
    label,
    dish,
    slotIndex,
    isMainMenu: slotIndex === 0
  }
}

const withMenuSlotIndex = (items = []) => {
  return (items || []).map((item, index) => ({
    ...item,
    slotIndex: Number.isFinite(item?.slotIndex) ? item.slotIndex : index
  }))
}

const isMainMenuSlot = (item = {}) => (Number.isFinite(item?.slotIndex) ? item.slotIndex === 0 : item?.isMainMenu === true)

export {
  getMenuLabelByIndex,
  getMenuDish,
  getMenuDisplay,
  withMenuSlotIndex,
  isMainMenuSlot
}
