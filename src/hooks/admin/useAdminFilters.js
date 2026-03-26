import { useDeferredValue, useMemo, useState } from 'react'
import { buildUserSearchIndex, filterAndSortUsers } from '../../domain/admin/adminUserSearch'

const useAdminFilters = ({ users }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name_asc')
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const userSearchIndex = useMemo(
    () => buildUserSearchIndex(users),
    [users]
  )

  const filteredUsers = useMemo(
    () => filterAndSortUsers(userSearchIndex, deferredSearchTerm, roleFilter, sortBy),
    [userSearchIndex, deferredSearchTerm, roleFilter, sortBy]
  )

  return {
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    sortBy,
    setSortBy,
    filteredUsers
  }
}

export { useAdminFilters }
