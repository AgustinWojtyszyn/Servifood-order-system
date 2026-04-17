const buildVisibleDates = (loadedDates = [], selectedDates = []) =>
  Array.from(new Set([...(loadedDates || []), ...(selectedDates || [])])).sort()

export {
  buildVisibleDates
}
