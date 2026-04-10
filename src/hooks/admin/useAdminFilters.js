import { useDeferredValue, useMemo, useState, useEffect } from 'react'
import { buildUserSearchIndex, filterAndSortUsers } from '../../domain/admin/adminUserSearch'

const useAdminFilters = ({ users }) => {
  const pageSize = 40
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name_asc')
  const [page, setPage] = useState(1)
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const userSearchIndex = useMemo(
    () => buildUserSearchIndex(users),
    [users]
  )

  const filteredUsers = useMemo(
    () => filterAndSortUsers(userSearchIndex, deferredSearchTerm, roleFilter, sortBy),
    [userSearchIndex, deferredSearchTerm, roleFilter, sortBy]
  )

  useEffect(() => {
    setPage(1)
  }, [deferredSearchTerm, roleFilter, sortBy, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, safePage])

  return {
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    sortBy,
    setSortBy,
    filteredUsers,
    pagedUsers,
    page,
    setPage,
    totalPages,
    pageSize
  }
}

export { useAdminFilters }
