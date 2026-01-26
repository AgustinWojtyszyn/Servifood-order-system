const InternalLoader = () => (
  <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

// import { useRef } from 'react' // Ya está importado arriba
import { useState, useEffect, useRef } from 'react'
import { db } from '../supabaseClient'
import { Calendar, MapPin, Clock, User, MessageCircle, Package, TrendingUp, Filter, CheckCircle, XCircle, Download, FileSpreadsheet, Shield, Mail, Send, RefreshCw, Archive as ArchiveIcon, AlertTriangle as AlertIcon } from 'lucide-react'
import * as XLSX from 'xlsx'
import RequireUser from './RequireUser'

const DailyOrders = ({ user, loading }) => {
  const emailLoadingRef = useRef(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [exportCompany, setExportCompany] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDish, setSelectedDish] = useState('all')
  const [selectedSide, setSelectedSide] = useState('all')
  const [sortBy, setSortBy] = useState('time') // time, location, status
  const [availableDishes, setAvailableDishes] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byLocation: {},
    byDish: {},
    totalItems: 0,
    completed: 0,
    pending: 0,
    cancelled: 0
  })

  const locations = ['Los Berros', 'La Laja', 'Padre Bueno', 'Genneia']

  // Función robusta para detectar y extraer guarniciones personalizadas
  const getCustomSideFromResponses = (responses = []) => {
    if (!Array.isArray(responses) || responses.length === 0) return null;
    for (const r of responses) {
      if (r?.title?.toLowerCase().includes('guarn')) {
        return r?.answer ?? r?.response ?? null;
      }
    }
    return null;
  }

  // Función helper para obtener otras opciones (sin guarniciones)
  const getOtherCustomResponses = (customResponses) => {
    if (!customResponses || !Array.isArray(customResponses)) return []

    return customResponses.filter(r =>
      r.response &&
      !r.title?.toLowerCase().includes('guarnición') &&
      !r.title?.toLowerCase().includes('guarnicion')
    )
  }

  useEffect(() => {
    if (!user?.id) return
    checkIfAdmin()
  }, [user])

  useEffect(() => {
    if (!user?.id || isAdmin !== true) return
    if (isAdmin === true) {
      fetchDailyOrders()
      
      // Auto-refresh cada 30 segundos
      const interval = setInterval(() => {
        fetchDailyOrders(true) // true = silent refresh (sin loading)
      }, 30000) // 30 segundos

      return () => clearInterval(interval)
    }
  }, [isAdmin, user])

  const checkIfAdmin = async () => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }
    try {
      const { data, error } = await db.getUsers()
      if (!error && data) {
        const currentUser = data.find(u => u.id === user.id)
        setIsAdmin(currentUser?.role === 'admin')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      setIsAdmin(false)
    }
  }

  const fetchDailyOrders = async (silent = false) => {
    if (!user?.id) return
    try {
      if (!silent) {
        setOrdersLoading(true)
      }
      
      const { data: ordersData, error } = await db.getOrders()

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        // Obtener información de usuarios para mostrar nombres
        const { data: usersData } = await db.getUsers()
        
        // Obtener fecha de hoy
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Set para almacenar platillos únicos
        const dishesSet = new Set()
        
        // Filtrar solo pedidos de hoy
        const todayOrders = Array.isArray(ordersData) ? ordersData.filter(order => {
          if (!order || !order.created_at) return false;
          const orderDate = new Date(order.created_at)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() === today.getTime()
        }).map(order => {
          // Evitar destructuración directa y acceso antes de inicialización
          const orderUser = Array.isArray(usersData) ? usersData.find(u => u && u.id === order.user_id) : null;
          let userName = 'Usuario';
          if (orderUser) {
            userName = (orderUser.full_name !== undefined ? orderUser.full_name : null)
              || (orderUser.user_metadata?.full_name ? orderUser.user_metadata.full_name : null)
              || (orderUser.email ? orderUser.email.split('@')[0] : null)
              || (order.customer_name !== undefined ? order.customer_name : null)
              || 'Usuario';
          } else if (order.customer_name !== undefined) {
            userName = order.customer_name;
          }
          // Recopilar platillos únicos
          if (Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item && typeof item === 'object' && item.name !== undefined) {
                dishesSet.add(item.name);
              }
            });
          }
          return {
            ...order,
            user_name: userName,
            user_email: (orderUser?.email ? orderUser.email : (order.customer_email !== undefined ? order.customer_email : ''))
          };
        }) : [];

        // Ocultar pedidos ya archivados
        const visibleTodayOrders = todayOrders.filter(order => order.status !== 'archived')
        
        setOrders(visibleTodayOrders)
        setAvailableDishes(Array.from(dishesSet).sort())
        calculateStats(visibleTodayOrders)
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
    await fetchDailyOrders()
    setRefreshing(false)
  }

  // Función para normalizar nombres de platillos
  const normalizeDishName = (dishName) => {
    if (!dishName) return dishName
    // Convertir "Menú Principal" a "Plato Principal" para consistencia
    return dishName.replace(/Menú Principal/gi, 'Plato Principal')
  }

  const calculateStats = (ordersData) => {
    const byLocation = {}
    const byDish = {}
    let totalItems = 0
    let completed = 0
    let pending = 0
    let cancelled = 0

    Array.isArray(ordersData) && ordersData.forEach(order => {
      // Contar por ubicación
      if (!byLocation[order.location]) {
        byLocation[order.location] = 0
      }
      byLocation[order.location]++

      // Contar por platillo (con normalización de nombres)
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item?.name) {
            const normalizedName = normalizeDishName(item.name)
            if (!byDish[normalizedName]) {
              byDish[normalizedName] = 0
            }
            byDish[normalizedName] += item.quantity || 1
          }
        })
      }

      // Contar items totales
      totalItems += order.total_items || 0

      // Contar por estado
      if (order.status === 'completed' || order.status === 'delivered') {
        completed++
      } else if (order.status === 'cancelled') {
        cancelled++
      } else {
        pending++
      }
    })

    setStats({
      total: ordersData.length,
      byLocation,
      byDish,
      totalItems,
      completed,
      pending,
      cancelled
    })
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Completado'
      case 'delivered':
        return 'Entregado'
      case 'cancelled':
        return 'Cancelado'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  // Colores distintivos por ubicación para mejorar legibilidad
  const getLocationBadgeColor = (location) => {
    // Estilo neutro: blanco con texto negro para máxima legibilidad
    return 'bg-white text-black border-gray-300'
  }

  const filteredOrders = selectedLocation === 'all' 
    ? Array.isArray(orders) ? orders : []
    : Array.isArray(orders) ? orders.filter(order => order && order.location === selectedLocation) : []

  // Aplicar filtro por estado
  const statusFilteredOrders = selectedStatus === 'all'
    ? Array.isArray(filteredOrders) ? filteredOrders : []
    : Array.isArray(filteredOrders) ? filteredOrders.filter(order => {
        if (!order) return false;
        if (selectedStatus === 'completed') {
          return order.status === 'completed' || order.status === 'delivered'
        }
        return order.status === selectedStatus
      }) : []

  // Aplicar filtro por platillo
  let dishFilteredOrders = selectedDish === 'all'
    ? Array.isArray(statusFilteredOrders) ? statusFilteredOrders : []
    : Array.isArray(statusFilteredOrders) ? statusFilteredOrders.filter(order => {
        if (!order || !Array.isArray(order.items)) return false;
        // Evitar destructuración directa y acceso antes de inicialización
        return order.items.some(item => item && typeof item === 'object' && item.name !== undefined && item.name === selectedDish)
      }) : []

  // Filtro robusto por guarnición
  if (selectedSide !== 'all') {
    dishFilteredOrders = Array.isArray(dishFilteredOrders) ? dishFilteredOrders.filter(order => {
      // Siempre pasar array, nunca undefined
      const customResponses = Array.isArray(order?.custom_responses) ? order.custom_responses : [];
      const customSide = getCustomSideFromResponses(customResponses);
      return customSide === selectedSide;
    }) : [];
  }

  // Aplicar ordenamiento
  const sortedOrders = [...dishFilteredOrders].sort((a, b) => {
    switch(sortBy) {
      case 'location':
        return a.location.localeCompare(b.location)
      case 'status':
        return a.status.localeCompare(b.status)
      case 'time':
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Resumen legible de items del pedido
  const summarizeOrderItems = (items = []) => {
    if (!Array.isArray(items)) return { principalCount: 0, others: [], remaining: 0, title: '' }
    const principal = items.filter(
      item => item && item.name && item.name.toLowerCase().includes('menú principal')
    )
    const others = items
      .filter(item => item && item.name && !item.name.toLowerCase().includes('menú principal'))
      .map(item => ({ name: normalizeDishName(item.name), qty: item.quantity || 1 }))

    const principalCount = principal.reduce((sum, item) => sum + (item.quantity || 1), 0)
    const displayedOthers = others.slice(0, 3)
    const remaining = Math.max(others.length - displayedOthers.length, 0)

    const titleParts = []
    if (principalCount > 0) titleParts.push(`Plato Principal: ${principalCount}`)
    titleParts.push(...others.map(o => `${o.name} (x${o.qty})`))

    return {
      principalCount,
      others: displayedOthers,
      remaining,
      title: titleParts.join('; ')
    }
  }

  // Filtrar pedidos por empresa/ubicación para exportar
  const filterOrdersByCompany = (ordersList, company) => {
    if (company === 'all') return ordersList
    const target = (company || '').toLowerCase()
    return (ordersList || []).filter(order => {
      const loc = (order?.location || '').toLowerCase()
      const comp = (order?.company || order?.company_slug || order?.target_company || '').toLowerCase()
      return loc === target || comp === target
    })
  }



  const exportToExcel = () => {
    const ordersToExport = filterOrdersByCompany(sortedOrders, exportCompany)

    if (ordersToExport.length === 0) {
      alert('No hay pedidos para exportar')
      return
    }

    try {
      const excelData = ordersToExport.map(order => {
        let menuItems = []
        if (Array.isArray(order.items)) {
          const principal = order.items.filter(
            item => item && item.name && item.name.toLowerCase().includes('menú principal')
          )
          const others = order.items.filter(
            item => item && item.name && !item.name.toLowerCase().includes('menú principal')
          )

          if (principal.length > 0) {
            const totalPrincipal = principal.reduce((sum, item) => sum + (item.quantity || 1), 0)
            menuItems.push(`Plato Principal: ${totalPrincipal}`)
          }

          others.forEach(item => {
            menuItems.push(`${normalizeDishName(item.name)} (x${item.quantity || 1})`)
          })
        }

        const customSide = getCustomSideFromResponses(order.custom_responses || [])
        if (customSide) {
          menuItems.push(`🔸 Guarnición: ${customSide}`)
        }

        const items = menuItems.join('; ') || 'Sin items'

        const otherResponses = getOtherCustomResponses(order.custom_responses || [])
        const customResponses = otherResponses
          .map(r => {
            const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
            return `${r.title}: ${response}`
          }).join(' | ') || 'Sin opciones'

        return {
          'Fecha Pedido': formatDate(order.created_at),
          'Hora Pedido': formatTime(order.created_at),
          'Usuario': order.user_name || 'Sin nombre',
          'Email': order.customer_email || order.user_email || 'Sin email',
          'Teléfono': order.customer_phone || 'Sin teléfono',
          'Ubicación': order.location || 'Sin ubicación',
          'Fecha Entrega': getTomorrowDate(),
          'Platillos': items,
          'Guarnición': customSide || 'Sin guarnición',
          'Cantidad Items': order.total_items || 0,
          'Estado': getStatusText(order.status),
          'Comentarios': order.comments || 'Sin comentarios',
          'Opciones Adicionales': customResponses,
          'Cliente': order.customer_name || order.user_name || 'Sin nombre'
        }
      })

      // Crear hoja de estadísticas
      const statsData = [
        { Concepto: 'Total de Pedidos', Valor: stats.total },
        { Concepto: 'Pedidos Completados', Valor: stats.completed },
        { Concepto: 'Pedidos Pendientes', Valor: stats.pending },
        { Concepto: 'Pedidos Cancelados', Valor: stats.cancelled },
        { Concepto: 'Total de Items', Valor: stats.totalItems },
        { Concepto: '', Valor: '' },
        { Concepto: 'PEDIDOS POR UBICACIÓN', Valor: '' },
      ]

      Object.entries(stats.byLocation).forEach(([location, count]) => {
        statsData.push({ Concepto: location, Valor: count })
      })

      statsData.push({ Concepto: '', Valor: '' })
      statsData.push({ Concepto: 'PEDIDOS POR PLATILLO', Valor: '' })

      Object.entries(stats.byDish).forEach(([dish, count]) => {
        statsData.push({ Concepto: dish, Valor: count })
      })

      // Crear libro de Excel
      const wb = XLSX.utils.book_new()
      
      // Hoja 1: Pedidos detallados
      const ws1 = XLSX.utils.json_to_sheet(excelData)
      
      // Ajustar anchos de columna
      const columnWidths = [
        { wch: 12 }, // Fecha Pedido
        { wch: 10 }, // Hora Pedido
        { wch: 20 }, // Usuario
        { wch: 25 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Ubicación
        { wch: 25 }, // Fecha Entrega
        { wch: 40 }, // Platillos
        { wch: 18 }, // Guarnición
        { wch: 12 }, // Cantidad Items
        { wch: 12 }, // Estado
        { wch: 30 }, // Comentarios
        { wch: 40 }, // Opciones Adicionales
        { wch: 20 }  // Cliente
      ]
      ws1['!cols'] = columnWidths
      
      XLSX.utils.book_append_sheet(wb, ws1, 'Pedidos Detallados')
      
      // Hoja 2: Estadísticas
      const ws2 = XLSX.utils.json_to_sheet(statsData)
      ws2['!cols'] = [{ wch: 30 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Estadísticas')

      // Generar nombre de archivo
      const today = new Date().toISOString().split('T')[0]
      const locationFilter = selectedLocation !== 'all' ? `_${selectedLocation.replace(/\s+/g, '_')}` : ''
      const statusFilter = selectedStatus !== 'all' ? `_${selectedStatus}` : ''
      const companyFilter = exportCompany !== 'all' ? `_empresa_${exportCompany.replace(/\s+/g, '_')}` : ''
      const fileName = `Pedidos_ServiFood_${today}${locationFilter}${statusFilter}${companyFilter}.xlsx`

      // Descargar archivo con compatibilidad Excel 2016
      XLSX.writeFile(wb, fileName, { 
        bookType: 'xlsx',
        type: 'binary',
        cellStyles: true
      })

      alert(`✓ ${ordersToExport.length} pedidos exportados correctamente a ${fileName}`)
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al exportar el archivo. Por favor, inténtalo de nuevo.')
    }
  }

  // Nueva función para compartir por WhatsApp
  const shareViaWhatsApp = () => {
    if (sortedOrders.length === 0) {
      alert('No hay pedidos para compartir')
      return
    }

    try {
      // Crear resumen filtrado por ubicación, menú y guarnición
      let message = `📋 *PEDIDOS SERVIFOOD*\n`;
      message += `${'='.repeat(40)}\n\n`;
      // Agrupar por ubicación
      const ubicaciones = {};
      sortedOrders.forEach(order => {
        const ubicacion = order.location || 'Sin ubicación';
        if (!ubicaciones[ubicacion]) {
          ubicaciones[ubicacion] = { menues: {}, guarniciones: {} };
        }
        // Menús
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const nombre = normalizeDishName(item.name);
            ubicaciones[ubicacion].menues[nombre] = (ubicaciones[ubicacion].menues[nombre] || 0) + (item.quantity || 1);
          });
        }
        // Guarniciones
        const guarnicion = getCustomSideFromResponses(order.custom_responses || []);
        if (guarnicion) {
          ubicaciones[ubicacion].guarniciones[guarnicion] = (ubicaciones[ubicacion].guarniciones[guarnicion] || 0) + 1;
        }
      });
      // Formatear mensaje por ubicación
      Object.entries(ubicaciones).forEach(([ubicacion, datos]) => {
        message += `*${ubicacion}*\n`;
        // Menús ordenados por número
        const sortedMenus = Object.entries(datos.menues).sort((a, b) => {
          const extractNumber = (name) => {
            const match = name.match(/(\d+)/)
            return match ? parseInt(match[1], 10) : Infinity
          }
          return extractNumber(a[0]) - extractNumber(b[0])
        })
        sortedMenus.forEach(([menu, cantidad]) => {
          message += `  • ${menu}: ${cantidad}\n`;
        });
        // Guarniciones
        Object.entries(datos.guarniciones).forEach(([guarnicion, cantidad]) => {
          message += `  • Guarnición: ${guarnicion} (${cantidad})\n`;
        });
        message += `\n`;
      });
      message += `${'='.repeat(40)}\n`;
      message += `\n✅ *Resumen listo para enviar por WhatsApp*\n`;
      // Abrir WhatsApp con el mensaje
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error al compartir:', error);
      alert('Error al compartir por WhatsApp');
    }
  }

  if (!isAdmin) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <Shield className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo los administradores pueden ver los pedidos diarios.</p>
          </div>
        </div>
      </RequireUser>
    )
  }

  if (ordersLoading) {
    return (
      <RequireUser user={user} loading={loading}>
        <InternalLoader />
      </RequireUser>
    )
  }

  const exportableOrdersCount = filterOrdersByCompany(sortedOrders, exportCompany).length

  return (
    <RequireUser user={user} loading={loading}>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-3xl font-black text-black dark:text-white">
              📋 Pedidos Diarios
            </h4>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-semibold">
              Gestión de pedidos para entrega mañana - {getTomorrowDate()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`inline-flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-6 py-4 text-lg font-bold text-gray-700 shadow-xl hover:bg-gray-50 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 ${
                refreshing ? 'animate-pulse' : ''
              }`}
            >
              <RefreshCw className={`mr-3 h-6 w-6 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : '🔄 Actualizar'}
            </button>

            <div className="flex flex-col">
              <label htmlFor="export-company" className="text-xs font-semibold text-gray-700 mb-1">Empresa para exportar</label>
              <select
                id="export-company"
                value={exportCompany}
                onChange={(e) => setExportCompany(e.target.value)}
                className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Todas las empresas</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={exportToExcel}
              disabled={exportableOrdersCount === 0}
              className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-green-500 to-green-600 px-6 py-4 text-lg font-bold text-white shadow-xl hover:from-green-600 hover:to-green-700 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              <FileSpreadsheet className="mr-3 h-6 w-6" />
              📊 Excel ({exportableOrdersCount})
            </button>

            <button
              onClick={shareViaWhatsApp}
              disabled={sortedOrders.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-green-600 to-green-700 px-6 py-4 text-lg font-bold text-white shadow-xl hover:from-green-700 hover:to-green-800 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              <Send className="mr-3 h-6 w-6" />
              📱 WhatsApp
            </button>

            {isAdmin && (
              <button
                onClick={async () => {
                  if (window.confirm('¿Archivar TODOS los pedidos pendientes? Esta acción no se puede deshacer.')) {
                    const { data, error } = await db.archiveAllPendingOrders()
                    if (!error) {
                      const updated = Array.isArray(data) ? data.length : 0
                      alert(`Pedidos pendientes archivados correctamente. Total afectados: ${updated}.`)
                      handleRefresh()
                    } else {
                      alert('Error al archivar pedidos: ' + error.message)
                    }
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4 text-lg font-bold text-white shadow-xl hover:from-blue-600 hover:to-blue-700 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200"
                title="Archiva todos los pedidos pendientes al final del día para mantener el sistema limpio"
              >
                <ArchiveIcon className="mr-3 h-6 w-6" />
                📁 Archivar Pedidos
              </button>
            )}
          </div>
        </div>

        {/* Admin Warning */}
        {isAdmin && (
          <div className="mb-8 rounded-xl border-2 border-yellow-400 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 shadow-lg">
                <AlertIcon className="h-7 w-7 text-yellow-600" />
              </div>
              <div>
                <h5 className="text-xl font-bold text-black mb-2">
                  ⚠️ Recordatorio Importante
                </h5>
                <p className="text-lg text-black font-semibold leading-relaxed">
                  Exporta los pedidos a Excel y archiva los pedidos pendientes al final de cada día.
                  Esto asegura que los pedidos queden contabilizados y no bloqueen nuevos pedidos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="filter-location" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ubicación
            </label>
            <select
              id="filter-location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todas ({stats.total})</option>
              {locations.map(location => (
                <option key={location} value={location}>
                  {location} ({stats.byLocation[location] || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Estado
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes ({stats.pending})</option>
              <option value="completed">Completados ({stats.completed})</option>
              <option value="cancelled">Cancelados ({stats.cancelled})</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-dish" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Platillo
            </label>
            <select
              id="filter-dish"
              value={selectedDish}
              onChange={(e) => setSelectedDish(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos</option>
              {availableDishes.map(dish => (
                <option key={dish} value={dish}>
                  {dish} ({stats.byDish[dish] || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-side" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Guarnición
            </label>
            <select
              id="filter-side"
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todas</option>
              {(() => {
                const sides = orders.map(order => {
                  if (order && Array.isArray(order.custom_responses)) {
                    return getCustomSideFromResponses(order.custom_responses)
                  }
                  return null
                }).filter(Boolean)
                const uniqueSides = [...new Set(sides)]
                return uniqueSides.map(side => (
                  <option key={side} value={side}>{side}</option>
                ))
              })()}
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ordenar por
            </label>
            <select
              id="filter-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="time">Recientes</option>
              <option value="location">Ubicación</option>
              <option value="status">Estado</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8">
          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-primary-500 to-primary-700 p-6 shadow-xl border-2 border-primary-300">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <span className="text-base font-semibold text-primary-100">Total Pedidos</span>
                <h4 className="text-3xl font-black text-white mt-1">
                  {stats.total}
                </h4>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-lg">
                <Package className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Package className="h-20 w-20 text-white" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-secondary-500 to-secondary-700 p-6 shadow-xl border-2 border-secondary-300">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <span className="text-base font-semibold text-secondary-100">Total Items</span>
                <h4 className="text-3xl font-black text-white mt-1">
                  {stats.totalItems}
                </h4>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-lg">
                <TrendingUp className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <TrendingUp className="h-20 w-20 text-white" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-yellow-500 to-yellow-600 p-6 shadow-xl border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <span className="text-base font-semibold text-yellow-100">Pendientes</span>
                <h4 className="text-3xl font-black text-white mt-1">
                  {stats.pending}
                </h4>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-lg">
                <Clock className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Clock className="h-20 w-20 text-white" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-green-500 to-green-600 p-6 shadow-xl border-2 border-green-300">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <span className="text-base font-semibold text-green-100">Completados</span>
                <h4 className="text-3xl font-black text-white mt-1">
                  {stats.completed}
                </h4>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-lg">
                <CheckCircle className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <CheckCircle className="h-20 w-20 text-white" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-red-500 to-red-600 p-6 shadow-xl border-2 border-red-300">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <span className="text-base font-semibold text-red-100">Cancelados</span>
                <h4 className="text-3xl font-black text-white mt-1">
                  {stats.cancelled}
                </h4>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-lg">
                <XCircle className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <XCircle className="h-20 w-20 text-white" />
            </div>
          </div>
        </div>

        {/* Orders Table / Mobile Cards */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b-2 border-primary-200 px-6 py-6 dark:border-strokedark sm:px-8 xl:px-9">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-black text-black dark:text-white">
                  📋 Pedidos del Día ({sortedOrders.length})
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-semibold">
                  Ordenado por: {
                    sortBy === 'time' ? 'Más recientes' :
                    sortBy === 'location' ? 'Ubicación' :
                    'Estado'
                  }
                </p>
              </div>
            </div>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-6 xl:px-7.5">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No hay pedidos que coincidan con los filtros
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedLocation !== 'all' && `Ubicación: ${selectedLocation}`}
                {selectedLocation !== 'all' && selectedStatus !== 'all' && ' | '}
                {selectedStatus !== 'all' && `Estado: ${getStatusText(selectedStatus)}`}
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Intenta cambiar los filtros para ver más resultados
              </p>
            </div>
          ) : (
            <>
            {/* Vista de tabla para pantallas medianas y grandes */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-white text-left border-b-2 border-gray-200">
                    <th className="min-w-[220px] px-6 py-5 font-bold text-black text-lg xl:pl-11">
                      👤 Cliente
                    </th>
                    <th className="min-w-[150px] px-6 py-5 font-bold text-black text-lg">
                      📍 Ubicación
                    </th>
                    <th className="min-w-[120px] px-6 py-5 font-bold text-black text-lg">
                      📊 Estado
                    </th>
                    <th className="min-w-[120px] px-6 py-5 font-bold text-black text-lg">
                      📦 Items
                    </th>
                    <th className="min-w-[150px] px-6 py-5 font-bold text-black text-lg">
                      🍽️ Platillos
                    </th>
                    <th className="min-w-[120px] px-6 py-5 font-bold text-black text-lg">
                      🕐 Hora
                    </th>
                    <th className="px-6 py-5 font-bold text-black text-lg xl:pr-11">
                      ⚡ Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order, index) => (
                    <tr key={order.id} className={'bg-white'}>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark xl:pl-11">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h5 className="text-xl font-extrabold text-black tracking-wide">
                              {order.user_name}
                            </h5>
                            <p className="text-sm text-black">
                              {order.user_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold border ${getLocationBadgeColor(order.location)}`}
                          title={`Ubicación: ${order.location}`}>
                          {order.location}
                        </span>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark">
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold border ${getStatusColor(order.status)}`} title={getStatusText(order.status)}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark">
                        <span className="inline-flex items-center rounded-full border-2 border-gray-300 bg-white px-3 py-1 text-base font-extrabold text-black">
                          {order.total_items}
                        </span>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark">
                        <div className="max-w-[360px]">
                          {(() => {
                            const summary = summarizeOrderItems(order.items)
                            const customSide = getCustomSideFromResponses(order.custom_responses)
                            return (
                              <div className="space-y-1" title={summary.title}>
                                {summary.principalCount > 0 && (
                                  <div className="text-base font-extrabold text-black">
                                    Plato Principal: {summary.principalCount}
                                  </div>
                                )}
                                {summary.others.map((o, idx) => (
                                  <div key={idx} className="text-base text-black wrap-break-word">
                                    {o.name} (x{o.qty})
                                  </div>
                                ))}
                                {summary.remaining > 0 && (
                                  <div className="text-sm text-black font-semibold">
                                    +{summary.remaining} más...
                                  </div>
                                )}
                                {customSide && (
                                  <div className="text-sm italic text-black mt-2 font-bold">
                                    Guarnición: {customSide}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-6 dark:border-strokedark">
                        <p className="text-base font-mono font-bold text-black">
                          {formatTime(order.created_at)}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark xl:pr-11">
                        <div className="flex items-center space-x-2">
                          <button
                            className="hover:text-primary"
                            title="Ver detalles"
                            onClick={() => {
                              // Expand row functionality could be added here
                              alert(`Detalles del pedido:\n\nCliente: ${order.user_name}\nEmail: ${order.user_email}\nUbicación: ${order.location}\nEstado: ${getStatusText(order.status)}\nItems: ${order.total_items}\nComentarios: ${order.comments || 'Sin comentarios'}`)
                            }}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista tipo tarjetas para móviles (mobile-first) */}
            <div className="md:hidden px-4 pb-6 space-y-4">
              {sortedOrders.map((order) => {
                const summary = summarizeOrderItems(order.items)
                const customSide = getCustomSideFromResponses(order.custom_responses)
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-black truncate">
                          {order.user_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {order.user_email}
                        </p>
                      </div>
                      <p className="text-xs font-mono font-semibold text-black ml-2">
                        {formatTime(order.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getLocationBadgeColor(order.location)}`}
                      >
                        {order.location}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                      <span className="inline-flex items-center rounded-full border-2 border-gray-300 bg-white px-3 py-1 text-xs font-extrabold text-black ml-auto">
                        {order.total_items} items
                      </span>
                    </div>

                    <div className="text-sm text-black space-y-1" title={summary.title}>
                      {summary.principalCount > 0 && (
                        <div className="font-semibold">
                          Plato Principal: {summary.principalCount}
                        </div>
                      )}
                      {summary.others.map((o, idx) => (
                        <div key={idx} className="wrap-break-word">
                          {o.name} (x{o.qty})
                        </div>
                      ))}
                      {summary.remaining > 0 && (
                        <div className="text-xs font-semibold text-gray-700">
                          +{summary.remaining} más...
                        </div>
                      )}
                      {customSide && (
                        <div className="text-xs italic font-semibold mt-1">
                          Guarnición: {customSide}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        className="text-sm font-semibold text-primary-700 hover:text-primary-900"
                        onClick={() => {
                          alert(`Detalles del pedido:\n\nCliente: ${order.user_name}\nEmail: ${order.user_email}\nUbicación: ${order.location}\nEstado: ${getStatusText(order.status)}\nItems: ${order.total_items}\nComentarios: ${order.comments || 'Sin comentarios'}`)
                        }}
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            </>
          )}
        </div>

        {/* Location Summary */}
        {selectedLocation === 'all' && stats.total > 0 && (
          <div className="rounded-xl bg-linear-to-br from-white to-gray-50 shadow-2xl border-2 border-primary-200 overflow-hidden">
            <div className="bg-linear-to-r from-primary-600 to-primary-800 px-8 py-6">
              <h3 className="text-3xl font-black text-white flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 shadow-lg">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                📊 Resumen por Ubicación
              </h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((location, index) => (
                  <div key={location} className="relative overflow-hidden rounded-xl bg-linear-to-br from-white to-gray-100 p-8 shadow-2xl border-2 border-gray-200 hover:shadow-3xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div className="z-10">
                        <h4 className="text-3xl font-black text-gray-800 mb-3 flex items-center gap-3">
                          📍 {location}
                        </h4>
                        <span className="text-xl text-gray-600 font-bold">Total de Pedidos</span>
                      </div>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl border-4 border-gray-300">
                        <span className="text-3xl font-black text-black">
                          {stats.byLocation[location] || 0}
                        </span>
                      </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                      <MapPin className={`h-28 w-28 text-primary-600`} />
                    </div>
                    <div className="absolute top-4 right-4 opacity-10">
                      <div className={`w-10 h-10 rounded-full bg-primary-500`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  </RequireUser>
  )
}

export default DailyOrders
