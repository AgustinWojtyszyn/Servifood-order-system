import { useCallback, useEffect, useState } from 'react'
import { db } from '../../supabaseClient'

const useAdminCleanupData = ({ active = false } = {}) => {
  const [archivedOrdersCount, setArchivedOrdersCount] = useState(0)

  const refreshArchivedOrdersCount = useCallback(async () => {
    try {
      const { count, error } = await db.getArchivedOrdersCount()
      if (!error) {
        setArchivedOrdersCount(count || 0)
      }
    } catch (err) {
      console.error('Error fetching archived orders count:', err)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    refreshArchivedOrdersCount()
  }, [active, refreshArchivedOrdersCount])

  const clearArchivedOrdersCount = useCallback(() => {
    setArchivedOrdersCount(0)
  }, [])

  return {
    archivedOrdersCount,
    refreshArchivedOrdersCount,
    clearArchivedOrdersCount
  }
}

export { useAdminCleanupData }
