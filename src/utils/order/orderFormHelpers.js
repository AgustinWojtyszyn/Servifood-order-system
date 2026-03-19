const isMainMenuItem = (item) => {
  const name = (item?.name || '').toLowerCase()
  return name.includes('menú principal') || name.includes('menu principal') || name.includes('plato principal')
}

const buildSelectedItemsList = (menuItems = [], selectedMap = {}) => {
  const selected = (menuItems || []).filter(item => selectedMap?.[item.id] === true)
  const principal = selected.filter(isMainMenuItem)
  const others = selected.filter(item => !isMainMenuItem(item))
  return [...principal, ...others]
}

const countSelectedItems = (items = []) => items.length

const getMissingRequiredOptions = (options = [], responses = {}, isRequiredOption = (opt) => !!opt?.required) => {
  return (options || [])
    .filter(opt => isRequiredOption(opt) && !responses?.[opt.id])
    .map(opt => opt.title)
}

const buildResponsesArray = (options = [], responses = {}) => {
  return (options || [])
    .filter(opt => {
      const response = responses?.[opt.id]
      if (!response) return false
      if (Array.isArray(response) && response.length === 0) return false
      if (typeof response === 'string' && response.trim() === '') return false
      return true
    })
    .map(opt => ({
      id: opt.id,
      title: opt.title,
      response: responses[opt.id]
    }))
}

export {
  buildSelectedItemsList,
  countSelectedItems,
  getMissingRequiredOptions,
  buildResponsesArray
}
