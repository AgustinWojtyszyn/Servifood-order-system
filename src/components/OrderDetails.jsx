import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { COMPANY_LIST } from '../constants/companyConfig'
import RequireUser from './RequireUser'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChefHat,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Phone,
  RefreshCw,
  Sun,
  User
} from 'lucide-react'

const normalizeList = (value) => {
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

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateOnly = (value) => {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const statusMeta = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  archived: { label: 'Archivado', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' }
}

const REPEAT_ORDER_STORAGE_KEY = 'repeat-order-draft'

const OrderDetails = ({ user, loading }) => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [error, setError] = useState('')

  const companyByLocation = useMemo(() => {
    const map = new Map()
    COMPANY_LIST.forEach((company) => {
      ;(company.locations || []).forEach((location) => {
        map.set(String(location || '').toLowerCase(), company)
      })
    })
    return map
  }, [])

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user?.id) return
      setLocalLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (fetchError) {
          setError('No se pudo cargar el pedido. Puede que no exista o no tengas permisos.')
          setOrder(null)
          return
        }

        setOrder(data)
      } catch (err) {
        setError('No se pudo cargar el pedido. Intenta nuevamente.')
        setOrder(null)
      } finally {
        setLocalLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, user?.id])

  const items = normalizeList(order?.items)
  const rawCustomResponses = normalizeList(order?.custom_responses)
  const customResponses = rawCustomResponses.filter((resp) => {
    const value = resp?.response ?? resp?.answer ?? resp?.options ?? resp?.value
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim().length > 0
    return Boolean(value)
  })

  const service = (order?.service || 'lunch').toLowerCase()
  const serviceLabel = service === 'dinner' ? 'Cena' : 'Almuerzo'
  const serviceIcon = service === 'dinner' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />

  const status = order?.displayStatus || order?.status || 'pending'
  const statusInfo = statusMeta[status] || { label: status, className: 'bg-blue-100 text-blue-800 border-blue-200' }

  const company = companyByLocation.get(String(order?.location || '').toLowerCase())

  const handleRepeatOrder = () => {
    if (!order) return

    const payload = {
      order_id: order.id,
      location: order.location || '',
      service: order.service || 'lunch',
      items: items,
      custom_responses: rawCustomResponses,
      comments: order.comments || ''
    }

    try {
      sessionStorage.setItem(REPEAT_ORDER_STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      // ignore storage errors
    }

    const target = company?.slug ? `/order/${company.slug}?repeat=1` : '/order?repeat=1'
    navigate(target)
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="text-white">
            <p className="text-sm font-semibold text-white/80">Detalle del pedido</p>
          <h1 className="text-3xl sm:text-4xl font-black drop-shadow">
              Pedido #{orderId ? String(orderId).slice(-8) : '-'}
            </h1>
          </div>
        </div>

        {localLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {!localLoading && error && (
          <div className="card bg-red-50 border-2 border-red-200 text-red-800">
            <div className="space-y-2">
              <p className="text-lg font-bold">No se pudo cargar el pedido</p>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        {!localLoading && !error && order && (
          <>
            <div className="card bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-white/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Resumen del pedido</h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-900 font-bold">
                    Empresa: {company?.name || 'No definida'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {serviceIcon}
                    {serviceLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <Package className="h-4 w-4" />
                    {order.total_items || items.length || 0} item(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleRepeatOrder}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Repetir pedido
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary-600" />
                  <h3 className="text-xl font-black text-gray-900">Destino y fechas</h3>
                </div>
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Destino</p>
                      <p className="text-gray-900 font-bold">{order.location || company?.name || 'No definida'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Fecha del pedido</p>
                      <p className="text-gray-900 font-bold">{formatDateTime(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Fecha de entrega</p>
                      <p className="text-gray-900 font-bold">{formatDateOnly(order.delivery_date)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary-600" />
                  <h3 className="text-xl font-black text-gray-900">Datos del cliente</h3>
                </div>
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Nombre</p>
                      <p className="text-gray-900 font-bold">{order.customer_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Email</p>
                      <p className="text-gray-900 font-bold">{order.customer_email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-600 font-semibold">Telefono</p>
                      <p className="text-gray-900 font-bold">{order.customer_phone || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 space-y-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-black text-gray-900">Platos del pedido</h3>
              </div>
              <div className="space-y-3">
                {items.length === 0 && (
                    <p className="text-sm text-gray-600">No hay platos registrados.</p>
                )}
                {items.map((item, index) => (
                  <div key={`${item.id || index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-base font-bold text-gray-900">
                      {item.name || 'Plato sin nombre'}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      Cantidad: {item.quantity || 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-black text-gray-900">Extras y notas</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">Opciones adicionales</p>
                  {customResponses.length === 0 ? (
                    <p className="text-sm text-gray-600">Sin opciones adicionales.</p>
                  ) : (
                    <div className="space-y-3">
                      {customResponses.map((resp, index) => {
                        const rawValue = resp?.response ?? resp?.answer ?? resp?.options ?? resp?.value
                        const value = Array.isArray(rawValue)
                          ? rawValue.join(', ')
                          : typeof rawValue === 'string'
                            ? rawValue
                            : JSON.stringify(rawValue)
                        return (
                          <div key={`${resp?.id || index}`} className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                          <p className="text-sm font-bold text-gray-900">{resp?.title || 'Opcion'}</p>
                          <p className="text-sm text-gray-700 mt-1">{value || '-'}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">Notas del pedido</p>
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-gray-800">
                    {order.comments && order.comments.trim().length > 0 ? order.comments : 'Sin notas adicionales.'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RequireUser>
  )
}

export default OrderDetails
