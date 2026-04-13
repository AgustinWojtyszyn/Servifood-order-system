// Read-only helper.
// Do not use in submit, update, edit payload builders, or idempotency logic.
// Keeps raw order.items and order.custom_responses untouched.
// normalizedItems / normalizedCustomResponses must not be mutated in place.
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

const normalizeOrderForReadOnly = (order = {}) => {
  const normalizedItems = safeParseArray(order?.items)
  const normalizedCustomResponses = safeParseArray(order?.custom_responses)
  return {
    ...order,
    normalizedItems,
    normalizedCustomResponses
  }
}

export { normalizeOrderForReadOnly }
