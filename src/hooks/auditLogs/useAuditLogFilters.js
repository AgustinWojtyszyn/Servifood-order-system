import { useCallback, useState } from 'react'

export const useAuditLogFilters = () => {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState([])
  const [actorFilter, setActorFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const toggleFilter = useCallback((actions) => {
    const actionsKey = actions.join(',')
    setActiveFilters((prev) =>
      prev.includes(actionsKey)
        ? prev.filter((f) => f !== actionsKey)
        : [...prev, actionsKey]
    )
  }, [])

  const clearLogFilters = useCallback(() => {
    setSearch('')
    setActiveFilters([])
    setActorFilter('all')
    setActionFilter('all')
    setDateFrom('')
    setDateTo('')
  }, [])

  return {
    search,
    setSearch,
    activeFilters,
    actorFilter,
    setActorFilter,
    actionFilter,
    setActionFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    toggleFilter,
    clearLogFilters
  }
}

