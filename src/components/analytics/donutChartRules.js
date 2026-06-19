const shouldUseDonut = (items) => {
  if (!items || items.length === 0) return false
  if (items.length > 8) return false
  return true
}

export { shouldUseDonut }
