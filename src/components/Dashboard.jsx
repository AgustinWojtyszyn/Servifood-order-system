import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ShoppingCart, Clock, CheckCircle, Plus, Package, Eye, X, MessageCircle, Phone, RefreshCw, Edit, Trash2, Moon, Sun, Archive } from 'lucide-react'
import foodDeliveryImg from '../assets/food-delivery (1).png'
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png'
import { isOrderEditable } from '../utils'
import RequireUser from './RequireUser'
import { useOverlayLock } from '../contexts/OverlayLockContext'

const EDIT_WINDOW_MINUTES = 15
const ORDER_START_HOUR = 9
const ORDER_CUTOFF_HOUR = 22
const ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'

const ensureArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// Helper para detectar guarnición principal desde custom_responses
const getCustomSideFromResponses = (responses = []) => {
  const list = ensureArray(responses)
  if (list.length === 0) return null
  for (const r of list) {
    const title = r?.title?.toLowerCase() || ''
    if (title.includes('guarn')) {
      return r?.answer ?? r?.response ?? null
    }
  }
  return null
}

// Resumen legible de items del pedido (similar a DailyOrders)
const summarizeOrderItems = (items = []) => {
  const itemsList = ensureArray(items)
  if (itemsList.length === 0) {
    return { principalCount: 0, principal: [], principalRemaining: 0, others: [], remaining: 0, title: '' }
  }

  const principalRaw = itemsList.filter(
    item => item && item.name && item.name.toLowerCase().includes('menú principal')
  )
  const principal = principalRaw.map(item => ({ name: item.name, qty: item.quantity || 1 }))
  const others = itemsList
    .filter(item => item && item.name && !item.name.toLowerCase().includes('menú principal'))
    .map(item => ({ name: item.name, qty: item.quantity || 1 }))

  const principalCount = principal.reduce((sum, item) => sum + (item.qty || 1), 0)
  const displayedPrincipal = principal.slice(0, 2)
  const principalRemaining = Math.max(principal.length - displayedPrincipal.length, 0)
  const displayedOthers = others.slice(0, 3)
  const remaining = Math.max(others.length - displayedOthers.length, 0)

  const titleParts = []
  titleParts.push(...principal.map(p => `${p.name} (x${p.qty})`))
  titleParts.push(...others.map(o => `${o.name} (x${o.qty})`))

  return {
    principalCount,
    principal: displayedPrincipal,
    principalRemaining,
    others: displayedOthers,
    remaining,
    title: titleParts.join('; ')
  }
}

const serviceBadge = (service = 'lunch') => {
  const normalized = (service || 'lunch').toLowerCase()
  const isDinner = normalized === 'dinner'
  const label = isDinner ? 'Cena' : 'Almuerzo'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold rounded-full border ${
        isDinner
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-sky-100 text-sky-800 border-sky-200'
      }`}
      title={`Servicio: ${label}`}
    >
      {isDinner ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

const parseDeliveryDate = (value) => {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getStartOfWeek = (date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  return start
}

const formatWeeklyDate = (value) => {
  const date = parseDeliveryDate(value)
  if (!date) return 'Fecha sin definir'
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

const getServiceLabel = (service = 'lunch') => {
  return (service || 'lunch').toLowerCase() === 'dinner' ? 'Cena' : 'Almuerzo'
}

const getStatusLabel = (status = 'pending') => {
  if (status === 'archived') return 'Archivado'
  if (status === 'cancelled') return 'Cancelado'
  return 'Pendiente'
}

const getMainMenuLabel = (order) => {
  const items = ensureArray(order?.items)
  const mainItem = items.find((item) => {
    const name = (item?.name || '').toLowerCase()
    return name.includes('menú principal') || name.includes('menu principal') || name.includes('plato principal')
  })

  if (mainItem) {
    return (mainItem.description || mainItem.name || '').trim() || 'Menú no disponible'
  }

  const summary = summarizeOrderItems(items)
  return summary.principal[0]?.name || summary.others[0]?.name || 'Menú no disponible'
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
    if (confirm('¿Archivar este pedido?')) {
      try {
        const { error } = await db.updateOrderStatus(orderId, 'archived')
        if (error) {
          alert('Error al actualizar el pedido')
        } else {
          fetchOrders() // Recargar pedidos
        }
      } catch (err) {
        console.error('Error:', err)
        alert('Error al actualizar el pedido')
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
    
    if (confirm(`¿Cambiar estado a "${statusNames[newStatus]}"?`)) {
      try {
        const { error } = await db.updateOrderStatus(orderId, newStatus)
        if (error) {
          alert('Error al actualizar el pedido')
        } else {
          fetchOrders() // Recargar pedidos
        }
      } catch (err) {
        console.error('Error:', err)
        alert('Error al actualizar el pedido')
      }
    }
  }

  const handleArchiveAllPending = async () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')

    if (pendingOrders.length === 0) {
      alert('No hay pedidos pendientes para archivar')
      return
    }

    if (confirm(`¿Archivar todos los ${pendingOrders.length} pedidos pendientes?`)) {
      try {
        const promises = pendingOrders.map(order =>
          db.updateOrderStatus(order.id, 'archived')
        )

        const results = await Promise.all(promises)
        const errors = results.filter(r => r.error)

        if (errors.length > 0) {
          alert(`Se actualizaron ${pendingOrders.length - errors.length} pedidos. ${errors.length} fallaron.`)
        } else {
          alert(`✓ ${pendingOrders.length} pedidos archivados`)
        }

        fetchOrders() // Recargar pedidos
      } catch (err) {
        console.error('Error:', err)
        alert('Error al actualizar los pedidos')
      }
    }
  }

  const handleEditOrder = (order) => {
    if (!isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)) {
      alert(`Solo puedes editar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos.`)
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

  const DeleteConfirmModal = ({ order, onConfirm, onClose, submitting }) => {
    if (!order) return null

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-linear-to-br from-blue-800 to-blue-900 text-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Eliminar pedido</h3>
                <p className="text-sm text-white/90 mt-1">
                  ¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 text-sm text-white/90">
              <div className="font-semibold">Pedido #{order.id.slice(-8)}</div>
              <div className="mt-1">{order.user_name || order.customer_name || 'Usuario'}</div>
              {order.customer_email && (
                <div className="mt-1">{order.customer_email}</div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/40 bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Eliminando...' : 'Eliminar pedido'}
            </button>
          </div>
        </div>
      </div>
    )
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

  return (
    <RequireUser user={user} loading={loading}>
      <div className="p-6 space-y-6 pb-8">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
          <div
            className={`rounded-2xl shadow-2xl px-4 py-3 text-sm sm:text-base font-semibold text-white border border-white/20 ${
              toast.variant === 'error'
                ? 'bg-linear-to-r from-rose-600 to-red-700'
                : 'bg-linear-to-r from-blue-800 to-blue-900'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-2xl mb-2">Panel Principal</h1>
          <p className="mt-2 text-xl sm:text-2xl text-white font-semibold drop-shadow-lg">
            ¡Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </p>
          <p className="text-base sm:text-lg text-white/90 mt-1">Aquí está el resumen de tus pedidos</p>
          <div
            className={`mt-3 inline-flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border-2 shadow-lg ${
              countdownTone === 'urgent'
                ? 'bg-red-500/25 border-red-200/70 text-red-50'
                : countdownTone === 'warn'
                ? 'bg-orange-500/25 border-orange-200/70 text-orange-50'
                : 'bg-white/15 border-white/30 text-white'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-base sm:text-lg font-bold">Horario pedidos: 09:00 a 22:00</span>
            <span className="text-base sm:text-lg font-bold">• {countdownLabel} {countdownValue}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`inline-flex items-center justify-center font-bold py-3 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
              refreshing
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            }`}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <Link to="/order" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto bg-linear-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
            Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="card bg-linear-to-br from-white to-blue-50 shadow-2xl border-2 border-primary-200 transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-primary-500 to-primary-700 shadow-lg">
              <div className="relative">
                <div className="flex items-center justify-center">
                  <img
                    src={foodDeliveryImg}
                    alt="Entrega de comida"
                    className="h-10 w-10 sm:h-12 sm:w-12 shadow-lg mx-auto shrink-0 object-contain"
                    style={{ display: 'block', margin: '0 auto' }}
                  />
                </div>
              </div>
            </div>
            <div className="ml-4 sm:ml-5">
              <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">PEDIDOS HOY</p>
              <p className="text-4xl sm:text-5xl font-black text-gray-900 drop-shadow">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card bg-linear-to-br from-white to-yellow-50 shadow-2xl border-2 border-yellow-200 transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-yellow-400 to-yellow-600 shadow-lg">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="ml-4 sm:ml-5">
              <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">PENDIENTES</p>
              <p className="text-4xl sm:text-5xl font-black text-yellow-700 drop-shadow">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card bg-linear-to-br from-white to-green-50 shadow-2xl border-2 border-green-200 transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-green-500 to-green-700 shadow-lg">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="ml-4 sm:ml-5">
              <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">ARCHIVADOS</p>
              <p className="text-4xl sm:text-5xl font-black text-green-600 drop-shadow">{stats.archived}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 drop-shadow">Tus pedidos de esta semana</h2>
        </div>

        {weeklyOrders.length === 0 ? (
          <div className="space-y-4">
            <p className="text-gray-600 font-semibold">Sin pedidos esta semana.</p>
            <Link to="/order" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              Hacer pedido
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {weeklyOrders.map((order) => {
              const status = order.displayStatus || order.status
              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border-2 border-gray-200 rounded-xl bg-white/95"
                >
                  <p className="text-sm sm:text-base text-gray-900 font-semibold wrap-break-word">
                    {formatWeeklyDate(order.delivery_date)} · {getServiceLabel(order.service)} · {getMainMenuLabel(order)}
                  </p>
                  <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap self-start sm:self-auto ${
                    status === 'archived' ? 'bg-green-100 text-green-800' :
                    status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Support Card - Para usuarios normales */}
      {!isAdmin && (
        <div className="card bg-linear-to-br from-green-50 to-emerald-50 shadow-xl border-2 border-green-300">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-linear-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
              <MessageCircle className="h-10 w-10" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
              <p className="text-gray-700 mb-4">Estamos aquí para ayudarte. ¡Hablemos por WhatsApp! 😊</p>
              <a
                  href="https://wa.me/2644405294?text=¡Hola!%20Necesito%20ayuda%20con%20ServiFood%20Catering%20🍽️"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                <Phone className="h-5 w-5" />
                Contactar por WhatsApp
              </a>
              <p className="text-sm text-gray-600 mt-3 font-semibold">
                📱 +54 264 440 5294
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Archived Orders - Solo para admins */}
      {isAdmin && orders.filter(o => (o.displayStatus || o.status) === 'archived').length > 0 && (
        <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900 drop-shadow">Pedidos Archivados</h2>
            <span className="text-sm text-gray-600 font-semibold">
              {orders.filter(o => (o.displayStatus || o.status) === 'archived').length} archivado(s)
            </span>
          </div>

          <div className="space-y-4">
            {orders.filter(o => (o.displayStatus || o.status) === 'archived').slice(0, 10).map((order) => {
              const status = order.displayStatus || order.status
              return (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-2 border-green-200 bg-green-50 rounded-xl transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-green-100 shrink-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {isAdmin ? `${order.user_name} - ` : ''}Pedido #{order.id.slice(-8)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {order.location} • {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 justify-end sm:justify-start mt-2 sm:mt-0">
                  {isAdmin && (
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="flex items-center gap-1 p-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                      title="Ver pedido"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs font-semibold">Ver pedido</span>
                    </button>
                  )}
                  <span className="inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                    Archivado
                  </span>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Historial de pedidos (días anteriores) para todos los usuarios */}
      {(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const pastOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() < today.getTime()
        })
        if (pastOrders.length === 0) return null
        return (
          <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 drop-shadow">
                Historial de pedidos (días anteriores)
              </h2>
              <span className="text-sm text-gray-600 font-semibold">
                {pastOrders.length} pedido(s)
              </span>
            </div>

            <div className="space-y-3">
              {pastOrders.slice(0, 20).map(order => {
                const summary = summarizeOrderItems(order.items)
                const customSide = getCustomSideFromResponses(order.custom_responses)
                const service = (order.service || 'lunch').toLowerCase()
                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2 p-3 sm:p-4 border-2 border-gray-200 rounded-xl bg-white/95"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            Pedido #{order.id.slice(-8)}
                          </p>
                          {serviceBadge(service)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 truncate flex items-center gap-2">
                          {order.location} • {formatDate(order.created_at)} • {service === 'dinner' ? 'Cena' : 'Almuerzo'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const status = order.displayStatus || order.status
                          return (
                            <span className="inline-flex px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                              {status === 'archived' ? 'Archivado' :
                               status === 'pending' ? 'Pendiente' :
                               'Cancelado'}
                            </span>
                          )
                        })()}
                        <span className="inline-flex px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                          {order.total_items || (order.items?.length || 0)} items
                        </span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-900 space-y-1" title={summary.title}>
                      {summary.principal.map((item, idx) => (
                        <div key={`${order.id}-history-principal-${idx}`} className="font-semibold wrap-break-word">
                          {item.name} (x{item.qty})
                        </div>
                      ))}
                      {summary.principalRemaining > 0 && (
                        <div className="text-[11px] sm:text-xs font-semibold text-gray-700">
                          +{summary.principalRemaining} menú(es) principal(es) más
                        </div>
                      )}
                      {summary.others.map((o, idx) => (
                        <div key={idx} className="wrap-break-word">
                          {o.name} (x{o.qty})
                        </div>
                      ))}
                      {summary.remaining > 0 && (
                        <div className="text-[11px] sm:text-xs font-semibold text-gray-700">
                          +{summary.remaining} más...
                        </div>
                      )}
                      {customSide && (
                        <div className="text-[11px] sm:text-xs italic font-semibold mt-1">
                          Guarnición: {customSide}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

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
