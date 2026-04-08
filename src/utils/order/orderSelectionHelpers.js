export const hasMainMenuSelected = (items = []) => {
  const list = Array.isArray(items) ? items : []
  return list.some(item => (Number.isFinite(item?.slotIndex) ? item.slotIndex === 0 : item?.isMainMenu === true))
}

export const mapOrderItemsToSelection = (items = [], menuItems = []) => {
  const selectedMap = {}
  items.forEach(it => {
    if (Number.isFinite(it?.slotIndex)) {
      const bySlot = menuItems.find(m => m?.slotIndex === it.slotIndex)
      if (bySlot) {
        selectedMap[bySlot.id] = true
        return
      }
    }
    const byId = menuItems.find(m => m.id === it.id)
    if (byId) {
      selectedMap[byId.id] = true
      return
    }
  })
  return selectedMap
}

export const buildResponsesMap = (responses = []) => {
  const map = {}
  responses.forEach((resp) => {
    if (!resp) return
    const key = resp.id || resp.option_id || resp.optionId
    if (!key) return
    const value = resp.response ?? resp.answer ?? resp.value ?? resp.options
    map[key] = value
  })
  return map
}
