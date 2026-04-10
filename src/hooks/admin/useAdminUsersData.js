import { useCallback, useState } from 'react'
import { db } from '../../supabaseClient'
import { usersService } from '../../services/users'
import { mapAdminPeople } from '../../domain/admin/adminMappers'

const useAdminUsersData = () => {
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const [peopleResult, accountsResult] = await Promise.all([
        db.getAdminPeopleUnified(),
        usersService.getUsers({ force: true })
      ])

      if (peopleResult.error) {
        console.error('Error fetching admin people:', peopleResult.error)
        setUsersError('No se pudo cargar la lista de personas.')
        return
      }

      const accountRows = Array.isArray(accountsResult?.data) ? accountsResult.data : []
      const mapped = mapAdminPeople(peopleResult.data || [], accountRows)
      setUsers(mapped)
    } catch (err) {
      console.error('Error fetching users:', err)
      setUsersError('No se pudo cargar la lista de usuarios.')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  return {
    users,
    usersLoading,
    usersError,
    refreshUsers
  }
}

export { useAdminUsersData }
