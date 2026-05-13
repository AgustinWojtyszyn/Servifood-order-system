import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../supabaseClient'
import { usersService } from '../services/users'
import { Sound } from '../utils/Sound'
import { calculateStats } from '../utils/daily/dailyOrderCalculations'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notice'
import { confirmAction } from '../utils/confirm'

export const useDailyOrdersData = (user) => {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availableDishes, setAvailableDishes] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byLocation: {},
    byDish: {},
    totalItems: 0,
    archived: 0,
    pending: 0
  })
  const isFetchingRef = useRef(false)

  const checkIfAdmin = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }
    try {
      const { data, error } = await usersService.getUserById(user.id)
      if (!error && data) {
        setIsAdmin(data?.role === 'admin')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      setIsAdmin(false)
    }
  }, [user])

  const fetchDailyOrders = useCallback(async (silent = false) => {
    if (!user?.id) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      if (!silent) {
        setOrdersLoading(true)
      }

      const { data: ordersData, error } = await db.getOrdersWithPersonKey()

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        const { data: peopleData } = await db.getAdminPeopleUnified()
        const personById = new Map(
          (Array.isArray(peopleData) ? peopleData : []).map(person => [person.person_id, person])
        )

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const dishesSet = new Set()

        const todayOrders = Array.isArray(ordersData) ? ordersData.filter(order => {
          if (!order || !order.created_at) return false
          const orderDate = new Date(order.created_at)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() === today.getTime()
        }).map(order => {
          const personId = order.person_key || (order.user_id ? String(order.user_id) : null)
          const person = personId ? personById.get(personId) : null
          const emails = Array.isArray(person?.emails) ? person.emails.filter(Boolean) : []
          let userName = 'Usuario'
          if (person) {
            userName = (person.display_name !== undefined ? person.display_name : null)
              || (emails[0] ? emails[0].split('@')[0] : null)
              || (order.customer_name !== undefined ? order.customer_name : null)
              || 'Usuario'
          } else if (order.customer_name !== undefined) {
            userName = order.customer_name
          }

          if (Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item && typeof item === 'object' && item.name !== undefined) {
                dishesSet.add(item.name)
              }
            })
          }
          return {
            ...order,
            user_name: userName,
            user_email: (order.customer_email ? order.customer_email : (emails[0] ? emails[0] : ''))
          }
        }) : []

        setOrders(todayOrders)
        setAvailableDishes(Array.from(dishesSet).sort())
        setStats(calculateStats(todayOrders))
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      isFetchingRef.current = false
      if (!silent) {
        setOrdersLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    checkIfAdmin()
  }, [user, checkIfAdmin])

  useEffect(() => {
    if (!user?.id || isAdmin !== true) return
    if (isAdmin === true) {
      fetchDailyOrders()

      const interval = setInterval(() => {
        fetchDailyOrders(true)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [isAdmin, user, fetchDailyOrders])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchDailyOrders()
    setRefreshing(false)
  }, [fetchDailyOrders])

  const handleArchiveOrder = useCallback(async (order) => {
    if (!order?.id || order.status === 'archived') return
    const confirmArchive = await confirmAction({
      title: 'Archivar pedido',
      message: `¿Archivar el pedido de ${order.user_name || 'cliente'}?`,
      confirmText: 'Archivar'
    })
    if (!confirmArchive) return

    const { error } = await db.updateOrderStatus(order.id, 'archived')
    if (error) {
      notifyError(`Error al archivar el pedido: ${error.message}`)
      return
    }
    Sound.playSuccess()
    setOrders((prev) => {
      if (!Array.isArray(prev)) return prev
      const next = prev.map((item) =>
        item?.id === order.id ? { ...item, status: 'archived' } : item
      )
      setStats(calculateStats(next))
      return next
    })
    handleRefresh()
  }, [handleRefresh])

  const handleArchiveAllPending = useCallback(async () => {
    const confirmed = await confirmAction({
      title: 'Archivar todos los pedidos pendientes',
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Archivar todos'
    })
    if (confirmed) {
      const { data, error } = await db.archiveAllPendingOrders()
      if (!error) {
        const affected = Array.isArray(data) ? data.length : 0
        if (affected === 0) {
          notifyInfo('No hay pedidos pendientes para archivar.')
        } else {
          notifySuccess(`Pedidos archivados correctamente: ${affected}`)
        }
        Sound.playSuccess()
        setOrders((prev) => {
          if (!Array.isArray(prev)) return prev
          const next = prev.map((item) =>
            item?.status === 'pending' ? { ...item, status: 'archived' } : item
          )
          setStats(calculateStats(next))
          return next
        })
        handleRefresh()
      } else {
        notifyError(`Error al archivar pedidos: ${error.message}`)
      }
    }
  }, [handleRefresh])

  return {
    orders,
    ordersLoading,
    isAdmin,
    availableDishes,
    refreshing,
    stats,
    handleRefresh,
    handleArchiveOrder,
    handleArchiveAllPending
  }
}
