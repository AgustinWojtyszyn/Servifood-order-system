const normalizeText = (value) => String(value ?? '').trim()

const getNested = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== null && value !== undefined) return value
  }
  return ''
}

export const isValidCustomerName = (value) => {
  const text = normalizeText(value)
  if (!text) return false
  if (/^\d+$/.test(text)) return false
  return /[a-zA-ZÀ-ÿ]/.test(text)
}

export const resolveCustomerName = ({ formData = {}, user = {} } = {}) => {
  const candidates = [
    formData.name,
    getNested(user.profile, ['full_name', 'name', 'display_name']),
    getNested(user.person, ['full_name', 'name', 'display_name']),
    getNested(user, ['full_name', 'name', 'display_name']),
    getNested(user.user_metadata, ['full_name', 'name', 'display_name'])
  ]

  return candidates.map(normalizeText).find(isValidCustomerName) || ''
}
