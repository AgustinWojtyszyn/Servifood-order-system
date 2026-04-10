const normalizeName = (value) => {
  const raw = (value || '').toString().trim().toLowerCase()
  const withoutDiacritics = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const withoutDomainTail = withoutDiacritics.replace(/\.[a-z0-9].*$/, '')
  return withoutDomainTail.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase()

const toDateMs = (value) => {
  const ms = value ? new Date(value).getTime() : NaN
  return Number.isFinite(ms) ? ms : null
}

const mapAdminPeople = (people = [], accounts = []) => {
  const accountRows = Array.isArray(accounts) ? accounts : []
  const accountById = new Map(accountRows.map(acc => [acc.id, acc]))
  const accountByEmail = new Map()
  for (const acc of accountRows) {
    const key = normalizeEmail(acc.email)
    if (!key || accountByEmail.has(key)) continue
    accountByEmail.set(key, acc)
  }

  const resolveAccountsForPerson = (person) => {
    const accountsList = []
    const seen = new Set()
    const userIds = Array.isArray(person.user_ids) ? person.user_ids.filter(Boolean) : []
    const emails = Array.isArray(person.emails) ? person.emails.filter(Boolean) : []

    for (const id of userIds) {
      const acc = accountById.get(id)
      if (acc && !seen.has(acc.id)) {
        accountsList.push(acc)
        seen.add(acc.id)
      }
    }

    for (const email of emails) {
      const acc = accountByEmail.get(normalizeEmail(email))
      if (acc && !seen.has(acc.id)) {
        accountsList.push(acc)
        seen.add(acc.id)
      }
    }

    return accountsList
  }

  const mappedPeople = (people || []).map(person => {
    const primaryUserId = Array.isArray(person.user_ids) ? person.user_ids[0] : null
    const emails = Array.isArray(person.emails) ? person.emails.filter(Boolean) : []
    const accountsList = resolveAccountsForPerson(person)
    const primaryAccount = primaryUserId ? accountById.get(primaryUserId) : accountsList[0] || null
    const primaryAccountId = primaryAccount?.id || primaryUserId || null
    const normalizedMembersCount = Math.max(
      person.members_count || 1,
      accountsList.length || 0,
      Array.isArray(person.user_ids) ? person.user_ids.length : 0,
      emails.length
    )
    return {
      id: person.person_id,
      person_id: person.person_id,
      group_id: person.group_id,
      full_name: person.display_name || emails[0] || 'Sin nombre',
      email: emails[0] || '',
      emails,
      user_ids: Array.isArray(person.user_ids) ? person.user_ids : [],
      primary_user_id: primaryAccountId,
      members_count: normalizedMembersCount,
      is_grouped: !!person.is_grouped || accountsList.length > 1 || normalizedMembersCount > 1,
      created_at: person.first_created || person.last_created || primaryAccount?.created_at || null,
      role: primaryAccount?.role || 'user',
      accounts: accountsList
    }
  })

  const dedupedPeople = []
  for (const person of mappedPeople) {
    const personEmails = new Set((person.emails || []).map(normalizeEmail).filter(Boolean))
    const personUserIds = new Set((person.user_ids || []).filter(Boolean))
    const personAccounts = Array.isArray(person.accounts) ? person.accounts : []

    const existing = dedupedPeople.find(p => {
      const existingEmails = new Set((p.emails || []).map(normalizeEmail).filter(Boolean))
      const existingUserIds = new Set((p.user_ids || []).filter(Boolean))

      const hasSharedUserId = [...personUserIds].some(id => existingUserIds.has(id))
      const hasSharedEmail = [...personEmails].some(email => existingEmails.has(email))

      return hasSharedUserId || hasSharedEmail
    })

    if (!existing) {
      dedupedPeople.push(person)
      continue
    }

    const mergedAccounts = []
    const mergedAccountIds = new Set()
    for (const acc of [...(existing.accounts || []), ...personAccounts]) {
      if (!acc?.id || mergedAccountIds.has(acc.id)) continue
      mergedAccountIds.add(acc.id)
      mergedAccounts.push(acc)
    }
    const mergedEmails = [...new Set([...(existing.emails || []), ...(person.emails || [])])]
    const mergedUserIds = [...new Set([...(existing.user_ids || []), ...(person.user_ids || [])])]
    const existingCreatedMs = toDateMs(existing.created_at)
    const personCreatedMs = toDateMs(person.created_at)
    const earliestMs = [existingCreatedMs, personCreatedMs].filter(v => v !== null).sort((a, b) => a - b)[0]

    existing.accounts = mergedAccounts
    existing.emails = mergedEmails
    existing.user_ids = mergedUserIds
    existing.email = mergedEmails[0] || existing.email || person.email || ''
    existing.full_name = existing.full_name || person.full_name
    existing.members_count = Math.max(
      existing.members_count || 1,
      person.members_count || 1,
      mergedUserIds.length,
      mergedEmails.length,
      mergedAccounts.length
    )
    existing.is_grouped = existing.is_grouped || person.is_grouped || mergedUserIds.length > 1 || mergedEmails.length > 1 || mergedAccounts.length > 1
    existing.role = existing.role === 'admin' || person.role === 'admin' ? 'admin' : 'user'
    existing.primary_user_id = existing.primary_user_id || person.primary_user_id || mergedUserIds[0] || mergedAccounts[0]?.id || null
    if (earliestMs) {
      existing.created_at = new Date(earliestMs).toISOString()
    }
  }

  return dedupedPeople
}

export {
  normalizeName,
  normalizeEmail,
  toDateMs,
  mapAdminPeople
}
