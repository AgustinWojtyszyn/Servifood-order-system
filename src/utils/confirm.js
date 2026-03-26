export const confirmAction = (options) => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const detail = typeof options === 'string'
      ? { message: options }
      : (options || {})
    const event = new CustomEvent('app-confirm', {
      detail: {
        ...detail,
        resolve
      }
    })
    window.dispatchEvent(event)
  })
}
