export const hasMainMenuSelected = (items = []) => {
  const list = Array.isArray(items) ? items : []
  return list.some(item => {
    const name = (item?.name || '').toString().toLowerCase()
    return (
      name.includes('menú principal') ||
      name.includes('menu principal') ||
      name.includes('plato principal')
    )
  })
}

export const mapOrderItemsToSelection = (items = [], menuItems = []) => {
  const selectedMap = {}
  items.forEach(it => {
    const byId = menuItems.find(m => m.id === it.id)
    if (byId) {
      selectedMap[byId.id] = true
      return
    }
    const byName = menuItems.find(m => m.name?.toLowerCase() === (it.name || '').toLowerCase())
    if (byName) {
      selectedMap[byName.id] = true
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
