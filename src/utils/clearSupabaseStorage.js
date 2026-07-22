// Limpia cualquier rastro de sesión de Supabase en storages
export const clearSupabaseStorage = () => {
  const patterns = ['sb-', 'supabase', 'gotrue']
  ;[window.localStorage, window.sessionStorage].forEach(store => {
    if (!store) return
    const keysToRemove = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (patterns.some(p => key?.toLowerCase().includes(p))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => store.removeItem(k))
  })
}
