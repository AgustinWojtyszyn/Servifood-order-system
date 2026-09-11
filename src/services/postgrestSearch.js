export const buildSafeIlikeOrFilter = (searchTerm, columns = []) => {
  const normalizedTerm = String(searchTerm ?? '').trim()
  const normalizedColumns = (Array.isArray(columns) ? columns : [])
    .map((column) => String(column || '').trim())
    .filter(Boolean)

  if (!normalizedTerm || normalizedColumns.length === 0) return ''

  const escapedTerm = normalizedTerm
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  const quotedPattern = `"%${escapedTerm}%"`

  return normalizedColumns
    .map((column) => `${column}.ilike.${quotedPattern}`)
    .join(',')
}
