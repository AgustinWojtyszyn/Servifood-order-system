const STORAGE_KEY = 'cafeteria_last_order'

export const loadCafeteriaOrder = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    return null
  }
}

export const saveCafeteriaOrder = (order) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch (err) {
    // ignore
  }
}

export const buildEmptyQuantities = (plans = []) => {
  return plans.reduce((acc, plan) => {
    acc[plan.id] = 0
    return acc
  }, {})
}

export const normalizeQuantities = (plans = [], items = []) => {
  const base = buildEmptyQuantities(plans)
  ;(items || []).forEach((item) => {
    if (!item?.planId) return
    base[item.planId] = Math.max(0, Number(item.quantity || 0))
  })
  return base
}

export const buildOrderFromQuantities = (quantities = {}) => {
  const items = Object.entries(quantities)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([planId, qty]) => ({ planId, quantity: Number(qty) }))
  const totalItems = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0)

  return {
    items,
    totalItems,
    updatedAt: new Date().toISOString()
  }
}
