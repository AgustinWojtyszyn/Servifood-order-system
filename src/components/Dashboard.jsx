import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ShoppingCart, Clock, CheckCircle, Package, Eye, RefreshCw, Edit, Trash2, Archive } from 'lucide-react'
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png'
import { isOrderEditable } from '../utils'
import { EDIT_WINDOW_MINUTES } from '../constants/orderRules'
import RequireUser from './RequireUser'
import { useOverlayLock } from '../contexts/OverlayLockContext'
import OrderHistorySection from './dashboard/OrderHistorySection'
import ArchivedOrdersSection from './dashboard/ArchivedOrdersSection'
import DeleteConfirmModal from './dashboard/DeleteConfirmModal'
import SupportCard from './dashboard/SupportCard'
import WeeklyOrdersSection from './dashboard/WeeklyOrdersSection'
import DashboardHeader from './dashboard/DashboardHeader'
import StatsCards from './dashboard/StatsCards'
import ToastBanner from './dashboard/ToastBanner'
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../utils/notice'
import { confirmAction } from '../utils/confirm'
import {
  ensureArray,
  getCustomSideFromResponses,
  summarizeOrderItems,
  serviceBadge,
  parseDeliveryDate,
  getStartOfWeek,
  formatWeeklyDate,
  getServiceLabel,
  getStatusLabel,
  getMainMenuLabel
} from '../utils/dashboard/dashboardHelpers.jsx'

const ORDER_START_HOUR = 9
const ORDER_CUTOFF_HOUR = 22
const ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'

const formatHeaderStatus = (status = 'pending') => {
  if (status === 'archived') return 'Confirmado'
  if (status === 'cancelled') return 'Cancelado'
  return 'Pendiente'
}

const buildItemsSummary = (items) => {
  const list = ensureArray(items)
  if (list.length === 0) return 'Sin items'
  const displayItems = list.slice(0, 4).map((item) => {
    const name = item?.name || 'Item'
    const qty = item?.quantity || 1
    return `${name} x${qty}`
  })
  const remaining = list.length - displayItems.length
  return remaining > 0 ? `${displayItems.join(', ')}, +${remaining} más` : displayItems.join(', ')
}


const Dashboard = ({ user, loading }) => {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    archived: 0
  })
  const [countdownLabel, setCountdownLabel] = useState('Cierra en')
  const [countdownValue, setCountdownValue] = useState('--:--:--')
  const [countdownTone, setCountdownTone] = useState('normal')
  const navigate = useNavigate()
  useOverlayLock(!!deleteConfirmOrder)

  useEffect(() => {
    if (!user?.id) return
    checkIfAdmin()
  }, [user])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const formatCountdown = (ms) => {
      const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    }

    const updateCountdown = () => {
      try {
        const nowBA = new Date(new Date().toLocaleString('en-US', { timeZone: ORDER_TIMEZONE }))
        const openTime = new Date(nowBA)
        openTime.setHours(ORDER_START_HOUR, 0, 0, 0)
        const closeTime = new Date(nowBA)
        closeTime.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0)

        let label = 'Cierra en'
        let target = closeTime

        if (nowBA < openTime) {
          label = 'Abre en'
          target = openTime
        } else if (nowBA >= closeTime) {
          label = 'Abre en'
          const nextOpen = new Date(openTime)
          nextOpen.setDate(nextOpen.getDate() + 1)
          target = nextOpen
        }

        const remainingMs = target - nowBA
        let tone = 'normal'
        if (label === 'Cierra en') {
          if (remainingMs <= 15 * 60 * 1000) {
            tone = 'urgent'
          } else if (remainingMs < 60 * 60 * 1000) {
            tone = 'warn'
          }
        }

        setCountdownLabel(label)
        setCountdownValue(formatCountdown(remainingMs))
        setCountdownTone(tone)
      } catch (err) {
        console.error('Error updating countdown', err)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.id || isAdmin === null) return
    if (isAdmin !== null) {
      fetchOrders()
      
      // Auto-refresh cada 30 segundos
      const interval = setInterval(() => {
        fetchOrders(true) // true = silent refresh
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [isAdmin, user])

  const checkIfAdmin = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await db.getUsers()
      if (!error && data) {
        const currentUser = data.find(u => u.id === user.id)
        setIsAdmin(currentUser?.role === 'admin')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
    }
  }

  const fetchOrders = async (silent = false) => {
    if (!user?.id) return
    try {
      if (!silent) {
        setOrdersLoading(true)
      }
      
      // TODOS (admins y usuarios) solo ven sus propios pedidos en el Dashboard
      const { data, error } = await db.getOrdersWithPersonKey({ userId: user.id })

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        // Resolver nombre/email por persona unificada (grupo o usuario suelto)
        const { data: peopleData } = await db.getAdminPeopleUnified()
        const personById = new Map(
          (Array.isArray(peopleData) ? peopleData : []).map(person => [person.person_id, person])
        )
        
        // Obtener fecha de hoy
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        let ordersWithUserNames = (data || []).map(order => {
          const displayStatus = order.status
          const personId = order.person_key || (order.user_id ? String(order.user_id) : null)
          const person = personId ? personById.get(personId) : null
          const emails = Array.isArray(person?.emails) ? person.emails.filter(Boolean) : []
          // Intentar obtener el nombre de diferentes fuentes
          let userName = 'Usuario'
          if (person) {
            userName = person.display_name ||
                      emails[0]?.split('@')[0] ||
                      order.customer_name ||
                      'Usuario'
          } else if (order.customer_name) {
            userName = order.customer_name
          }
          
          return {
            ...order,
            displayStatus,
            user_name: userName,
            user_email: order.customer_email || emails[0] || ''
          }
        })
        
        setOrders(ordersWithUserNames)
        calculateStats(ordersWithUserNames)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      if (!silent) {
        setOrdersLoading(false)
      }
    }
  }

  // Función para refrescar manualmente
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const calculateStats = (ordersData) => {
    // Obtener fecha de hoy a las 00:00:00
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Filtrar solo pedidos de hoy
    const todayOrders = ordersData.filter(order => {
      const orderDate = new Date(order.created_at)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === today.getTime()
    })
    
    const total = todayOrders.length
    const pending = todayOrders.filter(order => (order.displayStatus || order.status) === 'pending').length
    const archived = todayOrders.filter(order => 
      (order.displayStatus || order.status) === 'archived'
    ).length

    setStats({ total, pending, archived })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleMarkAsArchived = async (orderId) => {
    const confirmed = await confirmAction({
      title: 'Archivar pedido',
      message: 'Este pedido pasará a estado archivado y no se podrá modificar.',
      confirmText: 'Archivar'
    })
    if (confirmed) {
      try {
        const { error } = await db.updateOrderStatus(orderId, 'archived')
        if (error) {
          notifyError('Error al actualizar el pedido')
        } else {
          setOrders((prev) => {
            if (!Array.isArray(prev)) return prev
            const next = prev.map((order) =>
              order?.id === orderId ? { ...order, status: 'archived', displayStatus: 'archived' } : order
            )
            calculateStats(next)
            return next
          })
          setTimeout(() => fetchOrders(true), 1500)
        }
      } catch (err) {
        console.error('Error:', err)
        notifyError('Error al actualizar el pedido')
      }
    }
  }

  const handleStatusChange = async (orderId, newStatus, currentStatus) => {
    if (currentStatus === newStatus) return // No hacer nada si es el mismo estado
    
    const statusNames = {
      'pending': 'Pendiente',
      'archived': 'Archivado',
      'cancelled': 'Cancelado'
    }
    
    const confirmed = await confirmAction({
      title: 'Cambiar estado del pedido',
      message: `¿Querés cambiar el estado a "${statusNames[newStatus]}"?`,
      confirmText: 'Cambiar estado'
    })
    if (confirmed) {
      try {
        const { error } = await db.updateOrderStatus(orderId, newStatus)
        if (error) {
          notifyError('Error al actualizar el pedido')
        } else {
          setOrders((prev) => {
            if (!Array.isArray(prev)) return prev
            const next = prev.map((order) =>
              order?.id === orderId ? { ...order, status: newStatus, displayStatus: newStatus } : order
            )
            calculateStats(next)
            return next
          })
          setTimeout(() => fetchOrders(true), 1500)
        }
      } catch (err) {
        console.error('Error:', err)
        notifyError('Error al actualizar el pedido')
      }
    }
  }

  const handleArchiveAllPending = async () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')

    if (pendingOrders.length === 0) {
      notifyInfo('No hay pedidos pendientes para archivar')
      return
    }

    const confirmed = await confirmAction({
      title: 'Archivar pedidos pendientes',
      message: `Se archivarán ${pendingOrders.length} pedidos pendientes.`,
      confirmText: 'Archivar todos'
    })
    if (confirmed) {
      try {
        const promises = pendingOrders.map(order =>
          db.updateOrderStatus(order.id, 'archived')
        )

        const results = await Promise.all(promises)
        const errors = results.filter(r => r.error)

        if (errors.length > 0) {
          notifyWarning(`Se actualizaron ${pendingOrders.length - errors.length} pedidos. ${errors.length} fallaron.`)
        } else {
          notifySuccess(`✓ ${pendingOrders.length} pedidos archivados`)
        }

        setOrders((prev) => {
          if (!Array.isArray(prev)) return prev
          const next = prev.map((order) =>
            order?.status === 'pending' ? { ...order, status: 'archived', displayStatus: 'archived' } : order
          )
          calculateStats(next)
          return next
        })
        setTimeout(() => fetchOrders(true), 1500)
      } catch (err) {
        console.error('Error:', err)
        notifyError('Error al actualizar los pedidos')
      }
    }
  }

  const handleEditOrder = (order) => {
    if (!isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)) {
      notifyInfo(`Solo puedes editar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos.`)
      return
    }
    // Navigate to edit order page with order data
    navigate('/edit-order', { state: { order } })
  }

  const handleDeleteOrder = async (order) => {
    if (!isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)) {
      showToast(`Solo puedes eliminar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos.`)
      return
    }

    setDeleteConfirmOrder(order)
  }

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return
    setDeleteSubmitting(true)
    try {
      const { error } = await db.deleteOrder(deleteConfirmOrder.id)
      if (error) {
        showToast('Error al eliminar el pedido: ' + error.message, 'error')
        return
      }
      showToast('Pedido eliminado exitosamente')
      fetchOrders() // Recargar pedidos
      setDeleteConfirmOrder(null)
    } catch (err) {
      console.error('Error:', err)
      showToast('Error al eliminar el pedido', 'error')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const closeDeleteConfirm = () => {
    if (deleteSubmitting) return
    setDeleteConfirmOrder(null)
  }

  const showToast = (message, variant = 'info') => {
    setToast({ message, variant })
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  const handleViewOrder = (orderId) => {
    if (!orderId) return
    navigate(`/orders/${orderId}`)
  }

  if (ordersLoading) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </RequireUser>
    )
  }

  const startOfWeek = getStartOfWeek(new Date())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)
  const weeklyOrders = orders
    .filter((order) => {
      const deliveryDate = parseDeliveryDate(order.delivery_date)
      return deliveryDate && deliveryDate >= startOfWeek && deliveryDate < endOfWeek
    })
    .sort(
      (a, b) =>
        parseDeliveryDate(b.delivery_date) -
        parseDeliveryDate(a.delivery_date)
    )

  const sortedOrders = (Array.isArray(orders) ? [...orders] : []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  const pendingOrder = sortedOrders.find(
    (order) => (order.displayStatus || order.status) === 'pending'
  )
  const headerOrder = pendingOrder || sortedOrders[0] || null
  const headerStatus = headerOrder ? formatHeaderStatus(headerOrder.displayStatus || headerOrder.status) : 'Sin pedido'
  const headerSummary = headerOrder ? buildItemsSummary(headerOrder.items) : 'Sin pedido activo'

  return (
    <RequireUser user={user} loading={loading}>
      <div className="p-6 space-y-6 pb-8">
      <ToastBanner toast={toast} />
      <DashboardHeader
        user={user}
        countdownLabel={countdownLabel}
        countdownValue={countdownValue}
        countdownTone={countdownTone}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        headerOrder={headerOrder}
        headerStatus={headerStatus}
        headerSummary={headerSummary}
        canEditOrder={(order) => isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
      />

      <StatsCards stats={stats} />

      <WeeklyOrdersSection
        weeklyOrders={weeklyOrders}
        formatWeeklyDate={formatWeeklyDate}
        getServiceLabel={getServiceLabel}
        getMainMenuLabel={getMainMenuLabel}
        getStatusLabel={getStatusLabel}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
        canEditOrder={(order) => isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)}
      />

      {/* Support Card - Para usuarios normales */}
      {!isAdmin && <SupportCard />}

      <ArchivedOrdersSection
        isAdmin={isAdmin}
        orders={orders}
        formatDate={formatDate}
        onViewOrder={handleViewOrder}
      />

      <OrderHistorySection
        orders={orders}
        formatDate={formatDate}
        summarizeOrderItems={summarizeOrderItems}
        getCustomSideFromResponses={getCustomSideFromResponses}
        serviceBadge={serviceBadge}
      />

      {deleteConfirmOrder && (
        <DeleteConfirmModal
          order={deleteConfirmOrder}
          onConfirm={confirmDeleteOrder}
          onClose={closeDeleteConfirm}
          submitting={deleteSubmitting}
        />
      )}

      </div>
    </RequireUser>
  )
}

export default Dashboard
