const MEAL_SERVICES = new Set(['lunch', 'dinner'])

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeService = (service = 'lunch') => String(service || 'lunch').trim().toLowerCase()

const isMealService = (service) => MEAL_SERVICES.has(normalizeService(service))

const normalizeOrderItemsForService = (service = 'lunch', items = []) => {
  const sourceItems = safeArray(items)

  if (!isMealService(service)) {
    return sourceItems.map((item) => ({ ...item }))
  }

  return sourceItems.slice(0, 1).map((item) => ({
    ...item,
    quantity: 1
  }))
}

const normalizeOrderPayloadForService = (payload = {}) => {
  const service = normalizeService(payload?.service)
  const items = normalizeOrderItemsForService(service, payload?.items)
  const itemCount = isMealService(service)
    ? items.length
    : items.reduce((sum, item) => {
        const quantity = Number(item?.quantity ?? item?.qty ?? 1)
        return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1)
      }, 0)

  return {
    ...payload,
    service,
    items,
    total_items: itemCount,
    ...(Object.prototype.hasOwnProperty.call(payload, 'items_length') ? { items_length: items.length } : {})
  }
}

const hasMultipleMealItems = (service = 'lunch', items = []) =>
  isMealService(service) && safeArray(items).length > 1

export {
  hasMultipleMealItems,
  isMealService,
  normalizeOrderItemsForService,
  normalizeOrderPayloadForService,
  normalizeService,
  safeArray as safeOrderItemsArray
}
