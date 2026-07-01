import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../supabaseClient'
import { usersService } from '../services/users'
import { Sound } from '../utils/Sound'
import { calculateStats } from '../utils/daily/dailyOrderCalculations'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notice'
import { confirmAction } from '../utils/confirm'
import { getTomorrowISOInTimeZone } from '../utils/dateUtils'

export const useDailyOrdersData = (user) => {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availableDishes, setAvailableDishes] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [reportRun, setReportRun] = useState(null)
  const [reportRunError, setReportRunError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState('')
  const [operationalDate, setOperationalDate] = useState(() => getTomorrowISOInTimeZone())
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

  const fetchDailyReportRunStatus = useCallback(async (reportDate) => {
    if (!reportDate) return

    try {
      setReportRunError('')
      const { data, error } = await db.getDailyReportRunStatus({ reportDate })
      if (error) {
        console.error('Error fetching daily report run status:', error)
        setReportRun(null)
        setReportRunError('No se pudo consultar el estado del reporte automático.')
        return
      }
      setReportRun(data || null)
    } catch (err) {
      console.error('Error fetching daily report run status:', err)
      setReportRun(null)
      setReportRunError('No se pudo consultar el estado del reporte automático.')
    }
  }, [])

  const fetchDailyOrders = useCallback(async (silent = false, deliveryDate = operationalDate) => {
    if (!user?.id) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      if (!silent) {
        setOrdersLoading(true)
      }

      const nextOperationalDate = deliveryDate || getTomorrowISOInTimeZone()

      const { data: ordersData, error } = await db.getOrdersWithPersonKeyByDate({
        deliveryDate: nextOperationalDate,
        statuses: ['pending', 'archived']
      })

      if (error) {
        console.error('Error fetching orders:', error)
        if (!silent) {
          setOrders([])
          setAvailableDishes([])
          setStats(calculateStats([]))
        }
        setOrdersError('No se pudieron cargar los pedidos diarios. Usá Actualizar para reintentar.')
      } else {
        setOrdersError('')
        const { data: peopleData } = await db.getAdminPeopleUnified()
        const personById = new Map(
          (Array.isArray(peopleData) ? peopleData : []).map(person => [person.person_id, person])
        )

        const dishesSet = new Set()

        const todayOrders = Array.isArray(ordersData) ? ordersData.map(order => {
          if (!order) return false
          const personId = order.person_key || (order.user_id ? String(order.user_id) : null)
          const person = personId ? personById.get(personId) : null
          const emails = Array.isArray(person?.emails) ? person.emails.filter(Boolean) : []
          const orderEmail = order.customer_email || order.user_email || ''
          const orderName = order.customer_name || order.user_name || order.user_full_name || order.full_name || ''
          let userName = orderName || (orderEmail ? orderEmail.split('@')[0] : '') || 'Usuario'
          if (person) {
            userName = (person.display_name !== undefined ? person.display_name : null)
              || (emails[0] ? emails[0].split('@')[0] : null)
              || orderName
              || 'Usuario'
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
            user_email: orderEmail || emails[0] || ''
          }
        }).filter(Boolean) : []

        setOrders(todayOrders)
        setAvailableDishes(Array.from(dishesSet).sort())
        setStats(calculateStats(todayOrders))
        setLastUpdatedAt(new Date().toISOString())
        await fetchDailyReportRunStatus(nextOperationalDate)
      }
    } catch (err) {
      console.error('Error:', err)
      if (!silent) {
        setOrders([])
        setAvailableDishes([])
        setStats(calculateStats([]))
      }
      setOrdersError('No se pudieron cargar los pedidos diarios. Usá Actualizar para reintentar.')
    } finally {
      isFetchingRef.current = false
      if (!silent) {
        setOrdersLoading(false)
      }
    }
  }, [fetchDailyReportRunStatus, operationalDate, user])

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
    await fetchDailyOrders(false, operationalDate)
    setRefreshing(false)
  }, [fetchDailyOrders, operationalDate])

  const handleDeliveryDateChange = useCallback((nextDate) => {
    if (!nextDate || nextDate === operationalDate) return
    setOperationalDate(nextDate)
  }, [operationalDate])

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
    const pendingCount = (Array.isArray(orders) ? orders : []).filter((order) =>
      String(order?.status || '').toLowerCase() === 'pending' &&
      String(order?.delivery_date || '') === operationalDate
    ).length

    if (pendingCount === 0) {
      notifyInfo('No hay pedidos pendientes para archivar.')
      return
    }

    const confirmed = await confirmAction({
      title: 'Archivar todos los pedidos pendientes',
      message: `Se archivarán ${pendingCount} pedido${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'} con fecha de entrega ${operationalDate}. Esta acción no se puede deshacer.`,
      confirmText: 'Archivar todos'
    })
    if (confirmed) {
      const { data, error } = await db.archivePendingOrdersByDeliveryDate({
        deliveryDate: operationalDate,
        statuses: ['pending']
      })
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
            item?.status === 'pending' && String(item?.delivery_date || '') === operationalDate
              ? { ...item, status: 'archived' }
              : item
          )
          setStats(calculateStats(next))
          return next
        })
        handleRefresh()
      } else {
        notifyError(`Error al archivar pedidos: ${error.message}`)
      }
    }
  }, [handleRefresh, operationalDate, orders])

  return {
    orders,
    ordersLoading,
    isAdmin,
    availableDishes,
    refreshing,
    ordersError,
    reportRun,
    reportRunError,
    lastUpdatedAt,
    operationalDate,
    stats,
    handleRefresh,
    handleDeliveryDateChange,
    handleArchiveOrder,
    handleArchiveAllPending
  }
}
