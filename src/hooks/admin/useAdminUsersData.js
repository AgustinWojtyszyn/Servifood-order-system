import { useCallback, useState } from 'react'
import { db } from '../../supabaseClient'
import { mapAdminPeople } from '../../domain/admin/adminMappers'

const useAdminUsersData = () => {
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const [peopleResult, accountsResult] = await Promise.all([
        db.getAdminPeopleUnified(),
        db.getUsers()
      ])

      if (peopleResult.error) {
        console.error('Error fetching admin people:', peopleResult.error)
        return
      }

      const accountRows = Array.isArray(accountsResult?.data) ? accountsResult.data : []
      const mapped = mapAdminPeople(peopleResult.data || [], accountRows)
      setUsers(mapped)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  return {
    users,
    usersLoading,
    refreshUsers
  }
}

export { useAdminUsersData }
