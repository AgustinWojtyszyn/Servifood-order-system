import { useCallback, useEffect, useState } from 'react'
import { db } from '../supabaseClient'
import { getCafeteriaOperationalDate } from '../cafeteria/cafeteriaTime'

const matchesUser = (order, user) => {
  if (!order || !user) return false
  if (order.user_id && user.id) return order.user_id === user.id
  if (order.admin_email && user.email) return order.admin_email === user.email
  return false
}

const matchesOperationalDate = (order, operationalDate) => {
  if (!order?.delivery_date) return true
  return String(order.delivery_date).slice(0, 10) === operationalDate
}

const isPendingOrder = (order) => {
  const status = String(order?.status || 'pending').toLowerCase()
  return status === 'pending'
}

export const useCafeteriaPendingOrder = (user) => {
  const [pendingOrder, setPendingOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPending = useCallback(async () => {
    if (!user?.id) {
      setPendingOrder(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const operationalDate = getCafeteriaOperationalDate()
      const { data, error: fetchError } = await db.getCafeteriaOrders({
        userId: user.id,
        adminEmail: user.email || null
      })
      if (fetchError) {
        setError('No se pudo cargar el pedido de cafetería.')
        setPendingOrder(null)
        return
      }
      const scoped = (Array.isArray(data) ? data : [])
        .filter((order) => isPendingOrder(order) && matchesUser(order, user) && matchesOperationalDate(order, operationalDate))
      const sorted = scoped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setPendingOrder(sorted[0] || null)
    } catch (_err) {
      setError('No se pudo cargar el pedido de cafetería.')
      setPendingOrder(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  return { pendingOrder, loading, error, refresh: fetchPending }
}
