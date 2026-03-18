export const getLatestOrder = (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return null
  const valid = orders.filter(o => (o?.status || '').toLowerCase() !== 'cancelled')
  if (valid.length === 0) return null
  return [...valid].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

export const findRepeatCandidate = (orders = [], buildOrderSignature) => {
  if (!Array.isArray(orders) || orders.length === 0) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 2)

  const recent = orders.filter(order => {
    if (!order?.created_at) return false
    if ((order?.status || '').toLowerCase() === 'cancelled') return false
    const date = new Date(order.created_at)
    date.setHours(0, 0, 0, 0)
    return date >= start && date <= today
  })

  if (recent.length < 3) return null

  const groups = new Map()
  recent.forEach(order => {
    const sig = buildOrderSignature(order)
    if (!sig) return
    const dayKey = new Date(order.created_at).toISOString().split('T')[0]
    if (!groups.has(sig)) {
      groups.set(sig, { days: new Set(), latest: order })
    }
    const entry = groups.get(sig)
    entry.days.add(dayKey)
    if (new Date(order.created_at) > new Date(entry.latest.created_at)) {
      entry.latest = order
    }
  })

  const candidate = Array.from(groups.values())
    .filter(entry => entry.days.size >= 3)
    .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))[0]

  return candidate ? candidate.latest : null
}
