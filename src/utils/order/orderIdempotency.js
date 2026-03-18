export const computePayloadSignature = (
  items = [],
  responses = [],
  comments = '',
  deliveryDate = '',
  location = '',
  service = 'lunch'
) => {
  const sortedItems = [...(items || [])]
    .map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity || 1
    }))
    .sort((a, b) => (a.id || '').toString().localeCompare((b.id || '').toString()))

  const sortedResponses = [...(responses || [])]
    .map(r => ({
      id: r.id,
      title: r.title,
      response: r.response
    }))
    .sort((a, b) => (a.id || '').toString().localeCompare((b.id || '').toString()))

  const normalized = {
    location: (location || '').trim().toLowerCase(),
    items: sortedItems,
    responses: sortedResponses,
    comments: comments || '',
    deliveryDate: deliveryDate || '',
    service: (service || '').toLowerCase()
  }

  const json = JSON.stringify(normalized)
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

export const buildIdempotencyStorageKey = (
  items = [],
  location = '',
  signature = '',
  service = 'lunch',
  userId = 'anon'
) => {
  const userPart = userId || 'anon'
  const itemsPart = (items || []).map(item => item.id).filter(Boolean).sort().join('-') || 'no-items'
  const locationPart = (location || 'no-location').toString().trim().toLowerCase().replace(/\s+/g, '-')
  const servicePart = (service || 'lunch').toLowerCase()
  const signaturePart = signature || 'no-signature'
  return `order-idempotency-${userPart}-${locationPart}-${servicePart}-${itemsPart}-${signaturePart}`
}

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const normalizeValueForSignature = (value) => {
  if (Array.isArray(value)) {
    return value.map(v => `${v}`.trim().toLowerCase()).sort().join(',')
  }
  if (value === null || value === undefined) return ''
  return `${value}`.trim().toLowerCase()
}

export const buildOrderSignature = (order = {}) => {
  const normalizedItems = (Array.isArray(order.items) ? order.items : [])
    .map(i => ({
      id: i?.id || '',
      name: (i?.name || '').toString().trim().toLowerCase(),
      quantity: i?.quantity || 1
    }))
    .sort((a, b) => `${a.id}-${a.name}`.localeCompare(`${b.id}-${b.name}`))

  const normalizedResponses = (Array.isArray(order.custom_responses) ? order.custom_responses : [])
    .map(r => ({
      title: (r?.title || '').toString().trim().toLowerCase(),
      response: normalizeValueForSignature(r?.response ?? r?.answer ?? r?.value ?? r?.options)
    }))
    .sort((a, b) => `${a.title}-${a.response}`.localeCompare(`${b.title}-${b.response}`))

  const normalized = {
    items: normalizedItems,
    responses: normalizedResponses,
    service: (order.service || 'lunch').toString().trim().toLowerCase(),
    location: (order.location || '').toString().trim().toLowerCase()
  }

  const json = JSON.stringify(normalized)
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}
