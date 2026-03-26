const buildUserSearchIndex = (users = []) => {
  return users.map(user => {
    const allEmails = Array.isArray(user.emails)
      ? user.emails.filter(Boolean).map(e => e.toLowerCase())
      : (user.email ? [user.email.toLowerCase()] : [])
    const emailUsernames = allEmails.map(e => e.split('@')[0]).filter(Boolean)
    const searchableText = [
      user.full_name || '',
      user.email || '',
      ...allEmails,
      ...emailUsernames
    ].join(' ').toLowerCase()
    return { user, searchableText }
  })
}

const filterAndSortUsers = (index = [], searchTerm = '', roleFilter = 'all', sortBy = 'name_asc') => {
  const normalizedSearch = (searchTerm || '').trim().toLowerCase()

  const filtered = index.filter(({ user, searchableText }) => {
    const matchesSearch = normalizedSearch === '' || searchableText.includes(normalizedSearch)
    const matchesRole = roleFilter === 'all' ||
      (roleFilter === 'admin' && user.role === 'admin') ||
      (roleFilter === 'user' && user.role === 'user')
    return matchesSearch && matchesRole
  }).map(entry => entry.user)

  const normalizedName = (user) => (user.full_name || user.email || '').toLowerCase()
  const createdAtMs = (user) => (user.created_at ? new Date(user.created_at).getTime() : 0)

  return [...filtered].sort((a, b) => {
    if (sortBy === 'name_asc') return normalizedName(a).localeCompare(normalizedName(b), 'es')
    if (sortBy === 'name_desc') return normalizedName(b).localeCompare(normalizedName(a), 'es')
    if (sortBy === 'created_asc') return createdAtMs(a) - createdAtMs(b)
    return createdAtMs(b) - createdAtMs(a)
  })
}

export { buildUserSearchIndex, filterAndSortUsers }
