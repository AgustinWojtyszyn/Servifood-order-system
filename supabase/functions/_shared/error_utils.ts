export const safeError = (error: unknown, maxLength = 500) => {
  const limit = Math.max(1, Number(maxLength) || 500)

  if (error instanceof Error) {
    return (error.message || error.name || 'Error desconocido').slice(0, limit)
  }

  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    const fields = [
      ['code', value.code],
      ['message', value.message],
      ['details', value.details],
      ['hint', value.hint],
      ['status', value.status]
    ]
      .filter(([, field]) => field !== null && field !== undefined && String(field).trim())
      .map(([label, field]) => `${label}=${String(field).trim()}`)

    if (fields.length) return fields.join(' | ').slice(0, limit)

    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') return serialized.slice(0, limit)
    } catch {
      // Fall through to the generic representation.
    }
  }

  return String(error || 'Error desconocido').slice(0, limit)
}
