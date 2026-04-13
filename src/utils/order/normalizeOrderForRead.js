const safeParseArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeOrderForRead = (order = {}) => {
  const normalizedItems = safeParseArray(order?.items)
  const normalizedCustomResponses = safeParseArray(order?.custom_responses)
  return {
    ...order,
    normalizedItems,
    normalizedCustomResponses
  }
}

export { normalizeOrderForRead }
