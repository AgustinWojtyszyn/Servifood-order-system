// ...existing imports...
// Nueva función para exportar por email usando el backend
import { useRef } from 'react'
const exportViaEmail = async () => {
  if (emailLoadingRef.current) return
  if (sortedOrders.length === 0) {
    alert('No hay pedidos para exportar')
    return
  }
  const toEmail = prompt('Ingresa el email de destino:')
  if (!toEmail) return
  emailLoadingRef.current = true
  try {
    // Adaptar los datos para el backend
    const ordersForEmail = Array.isArray(sortedOrders) ? sortedOrders.map(order => ({
      fecha: formatDate(order.created_at),
      usuario: order.user_name || 'Sin nombre',
      email: order.customer_email || order.user_email || 'Sin email',
      telefono: order.customer_phone || 'Sin teléfono',
      ubicacion: order.location || 'Sin ubicación',
      platillos: (Array.isArray(order.items) ? order.items.map(item => `${normalizeDishName(item.name)} (x${item.quantity})`) : []).join('; ') || 'Sin items',
      estado: getStatusText(order.status),
      comentarios: order.comments || 'Sin comentarios'
    })) : [];
    alert('Enviando pedidos por email...');
    const response = await fetch('/api/send-daily-orders-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toEmail,
        orders: ordersForEmail
      })
    })
    const result = await response.json()
    if (response.ok) {
      alert('✓ Pedidos enviados por email correctamente')
    } else {
      console.error('Error backend:', result)
      alert('Error al exportar por email: ' + (result.error || 'Error desconocido'))
    }
  } catch (error) {
    console.error('Error al exportar por email:', error)
    alert('Error al exportar por email. Por favor, revisa la configuración.')
  }
  emailLoadingRef.current = false
}
import { useState, useEffect } from 'react'
import { db } from '../supabaseClient'
import { Calendar, MapPin, Clock, User, MessageCircle, Package, TrendingUp, Filter, CheckCircle, XCircle, Download, FileSpreadsheet, Shield, Mail, Send, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'

const DailyOrders = ({ user }) => {
  const emailLoadingRef = useRef(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('all')
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

  const locations = ['Los Berros', 'La Laja', 'Padre Bueno']

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
    checkIfAdmin()
  }, [user])

  useEffect(() => {
    if (isAdmin === true) {
      fetchDailyOrders()
      
      // Auto-refresh cada 30 segundos
      const interval = setInterval(() => {
        fetchDailyOrders(true) // true = silent refresh (sin loading)
      }, 30000) // 30 segundos

      return () => clearInterval(interval)
    }
  }, [isAdmin])

  const checkIfAdmin = async () => {
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
    try {
      if (!silent) {
        setLoading(true)
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
        
        setOrders(todayOrders)
        setAvailableDishes(Array.from(dishesSet).sort())
        calculateStats(todayOrders)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      if (!silent) {
        setLoading(false)
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



  const exportToExcel = () => {
    if (sortedOrders.length === 0) {
      alert('No hay pedidos para exportar')
      return
    }

    try {
      // Preparar datos para el Excel
      const excelData = sortedOrders.map(order => {
        // Procesar items del menú (con normalización de nombres)
        const menuItems = order.items?.map(item => 
          `${normalizeDishName(item.name)} (x${item.quantity})`
        ) || []

        // Detectar guarnición personalizada
        const customSide = getCustomSideFromResponses(order.custom_responses)
        if (customSide) {
          menuItems.push(`🔸 Guarnición: ${customSide}`)
        }

        const items = menuItems.join('; ') || 'Sin items'

        // Otras opciones personalizadas (excluyendo guarniciones)
        const otherResponses = getOtherCustomResponses(order.custom_responses)
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
      const fileName = `Pedidos_ServiFood_${today}${locationFilter}${statusFilter}.xlsx`

      // Descargar archivo con compatibilidad Excel 2016
      XLSX.writeFile(wb, fileName, { 
        bookType: 'xlsx',
        type: 'binary',
        cellStyles: true
      })

      alert(`✓ ${sortedOrders.length} pedidos exportados correctamente a ${fileName}`)
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
      // Crear resumen de texto para WhatsApp
      const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDate = tomorrow.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      let message = `📋 *PEDIDOS SERVIFOOD*\n`
      message += `📅 Fecha de pedido: ${today}\n`
      message += `🚚 Fecha de entrega: ${tomorrowDate}\n`
      message += `${'='.repeat(40)}\n\n`

      // RESUMEN GENERAL
      message += `📊 *RESUMEN GENERAL*\n`
      message += `• Total de pedidos: ${stats.total}\n`
      message += `• Completados: ${stats.completed} ✅\n`
      message += `• Pendientes: ${stats.pending} ⏳\n`
      message += `• Cancelados: ${stats.cancelled} ❌\n`
      message += `• Total de items: ${stats.totalItems}\n\n`

      // DESGLOSE POR UBICACIÓN
      message += `📍 *DESGLOSE POR UBICACIÓN*\n`
      Object.entries(stats.byLocation)
        .sort(([, a], [, b]) => b - a)
        .forEach(([location, count]) => {
          // Calcular items por ubicación
          const locationOrders = sortedOrders.filter(o => o.location === location)
          const locationItems = locationOrders.reduce((sum, o) => sum + (o.total_items || 0), 0)
          message += `\n*${location}*\n`
          message += `  • Pedidos: ${count}\n`
          message += `  • Menús: ${locationItems}\n`
        })

      // DETALLE DE PLATILLOS
      message += `\n\n🍽️ *DETALLE DE PLATILLOS*\n`
      const sortedDishes = Object.entries(stats.byDish)
        .sort(([, a], [, b]) => b - a)
      
      let totalMenus = 0
      sortedDishes.forEach(([dish, count]) => {
        totalMenus += count
        message += `• ${dish}: ${count} unidad${count > 1 ? 'es' : ''}\n`
      })
      message += `\n*Total menús del día: ${totalMenus}*\n`

      // GUARNICIONES PERSONALIZADAS
      const customSides = sortedOrders
        .map(order => getCustomSideFromResponses(order?.custom_responses ?? []))
        .filter(side => side !== null)
      
      if (customSides.length > 0) {
        message += `\n🔸 *GUARNICIONES PERSONALIZADAS*\n`
        const uniqueSides = [...new Set(customSides)]
        uniqueSides.forEach(side => {
          const count = customSides.filter(s => s === side).length
          message += `• ${side}: ${count} pedido${count > 1 ? 's' : ''}\n`
        })
      }

      // OPCIONES ADICIONALES
      const allCustomResponses = sortedOrders
        .flatMap(order => getOtherCustomResponses(order.custom_responses))
        .filter(resp => resp.response)

      if (allCustomResponses.length > 0) {
        message += `\n⚙️ *OPCIONES ADICIONALES*\n`
        
        // Agrupar opciones por título
        const optionsByTitle = {}
        allCustomResponses.forEach(resp => {
          if (!optionsByTitle[resp.title]) {
            optionsByTitle[resp.title] = []
          }
          const response = Array.isArray(resp.response) 
            ? resp.response.join(', ') 
            : resp.response
          optionsByTitle[resp.title].push(response)
        })

        Object.entries(optionsByTitle).forEach(([title, responses]) => {
          message += `\n*${title}*\n`
          
          // Contar respuestas únicas
          const responseCounts = {}
          responses.forEach(resp => {
            responseCounts[resp] = (responseCounts[resp] || 0) + 1
          })
          
          Object.entries(responseCounts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([resp, count]) => {
              message += `  • ${resp}: ${count}\n`
            })
        })
      }

      // DETALLE POR UBICACIÓN Y PLATILLO
      message += `\n\n📋 *DETALLE POR UBICACIÓN*\n`
      Object.entries(stats.byLocation)
        .sort(([, a], [, b]) => b - a)
        .forEach(([location]) => {
          const locationOrders = sortedOrders.filter(o => o.location === location)
          
          message += `\n*${location}:*\n`
          
          // Platillos en esta ubicación (con normalización)
          const dishesInLocation = {}
          locationOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                if (item.name) {
                  const normalizedName = normalizeDishName(item.name)
                  dishesInLocation[normalizedName] = (dishesInLocation[normalizedName] || 0) + (item.quantity || 1)
                }
              })
            }
          })
          
          Object.entries(dishesInLocation)
            .sort(([, a], [, b]) => b - a)
            .forEach(([dish, count]) => {
              message += `  • ${dish}: ${count}\n`
            })
        })

      message += `\n${'='.repeat(40)}\n`
      message += `\n✅ *Resumen listo para preparar*\n`
      message += `_Para detalles individuales, consulta el panel de administración_`

      // Abrir WhatsApp con el mensaje
      const encodedMessage = encodeURIComponent(message)
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
      window.open(whatsappUrl, '_blank')
    } catch (error) {
      console.error('Error al compartir:', error)
      alert('Error al compartir por WhatsApp')
    }
  }

  if (!isAdmin) {
    return (
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
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-white text-lg">Cargando pedidos diarios...</p>
      </div>
    )
  }

  return (
    <div
      className="w-full space-y-6 px-2 sm:px-4 md:px-6 md:max-w-7xl md:mx-auto"
      style={{
        overflowY: 'visible',
        overflowX: 'hidden',
        minHeight: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '120px'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4">
          {/* Título y fecha */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Calendar className="h-8 w-8 md:h-10 md:w-10" />
              <h1 className="text-2xl md:text-4xl font-bold">Pedidos Diarios</h1>
            </div>
            <p className="text-blue-100 text-base md:text-lg">
              Todos los pedidos para entregar mañana
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-3 bg-white/20 rounded-lg px-3 py-2 md:px-4 md:py-2 inline-block">
              <Clock className="h-4 w-4 md:h-5 md:w-5" />
              <span className="font-semibold text-sm md:text-base capitalize">{getTomorrowDate()}</span>
            </div>
          </div>

          {/* Botones de acción - Grid responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Botón de refrescar */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`font-bold py-3 px-4 md:px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base min-h-[48px] ${
                refreshing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
              <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
            </button>

            {/* Botón de exportar a Excel */}
            <button
              onClick={exportToExcel}
              disabled={sortedOrders.length === 0}
              className={`font-bold py-3 px-4 md:px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base min-h-[48px] ${
                sortedOrders.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Excel ({sortedOrders.length})</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* Botón de compartir por WhatsApp */}
            <button
              onClick={shareViaWhatsApp}
              disabled={sortedOrders.length === 0}
              className={`font-bold py-3 px-4 md:px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base min-h-[48px] ${
              sortedOrders.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            >
              <Send className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden">Share</span>
            </button>
          </div>

          {/* Filtros - Grid responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filtro por ubicación */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block flex items-center gap-2">
                <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                Ubicación
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white text-gray-900 font-semibold text-sm md:text-base focus:ring-2 focus:ring-blue-400 min-h-[40px]"
              >
                <option value="all">Todas ({stats.total})</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location} ({stats.byLocation[location] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por estado */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block flex items-center gap-2">
                <Filter className="h-3 w-3 md:h-4 md:w-4" />
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white text-gray-900 font-semibold text-sm md:text-base focus:ring-2 focus:ring-blue-400 min-h-[40px]"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes ({stats.pending})</option>
                <option value="completed">Completados ({stats.completed})</option>
                <option value="cancelled">Cancelados ({stats.cancelled})</option>
              </select>
            </div>

            {/* Filtro por platillo */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block flex items-center gap-2">
                <Package className="h-3 w-3 md:h-4 md:w-4" />
                Platillo
              </label>
              <select
                value={selectedDish}
                onChange={(e) => setSelectedDish(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white text-gray-900 font-semibold text-sm md:text-base focus:ring-2 focus:ring-blue-400 min-h-[40px]"
              >
                <option value="all">Todos</option>
                {availableDishes.map(dish => (
                  <option key={dish} value={dish}>
                    {dish} ({stats.byDish[dish] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por guarnición */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block flex items-center gap-2">
                <Package className="h-3 w-3 md:h-4 md:w-4" />
                Guarnición
              </label>
              <select
                value={selectedSide}
                onChange={(e) => setSelectedSide(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white text-gray-900 font-semibold text-sm md:text-base focus:ring-2 focus:ring-blue-400 min-h-[40px]"
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

            {/* Ordenar por */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block flex items-center gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                Ordenar
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white text-gray-900 font-semibold text-sm md:text-base focus:ring-2 focus:ring-blue-400 min-h-[40px]"
              >
                <option value="time">Recientes</option>
                <option value="location">Ubicación</option>
                <option value="status">Estado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 w-full">
        <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-blue-200 w-full">
          <div className="text-center">
            <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Pedidos</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-purple-200 w-full">
          <div className="text-center">
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Items</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.totalItems}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-yellow-200 w-full">
          <div className="text-center">
            <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-gray-600 font-semibold">Pendientes</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-green-200 w-full">
          <div className="text-center">
            <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-gray-600 font-semibold">Completados</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-red-200 w-full">
          <div className="text-center">
            <XCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-gray-600 font-semibold">Cancelados</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.cancelled}</p>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      {sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No hay pedidos que coincidan con los filtros
          </h3>
          <p className="text-gray-500">
            {selectedLocation !== 'all' && `Ubicación: ${selectedLocation}`}
            {selectedLocation !== 'all' && selectedStatus !== 'all' && ' | '}
            {selectedStatus !== 'all' && `Estado: ${getStatusText(selectedStatus)}`}
          </p>
          <p className="text-gray-400 mt-2 text-sm">Intenta cambiar los filtros para ver más resultados</p>
        </div>
      ) : (
        <div className="space-y-4 w-full px-1 sm:px-0" style={{overflowX: 'hidden'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="h-6 w-6" />
              Listado de Pedidos ({sortedOrders.length})
            </h2>
            <div className="text-white bg-white/20 px-4 py-2 rounded-lg">
              <span className="font-semibold">
                Ordenado por: {
                  sortBy === 'time' ? 'Más recientes' :
                  sortBy === 'location' ? 'Ubicación' :
                  'Estado'
                }
              </span>
            </div>
          </div>
          
          {sortedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200 overflow-hidden w-full"
              style={{overflowX: 'hidden'}}
            >
              {/* Header del pedido - Mobile optimized */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-3 md:py-4 border-b-2 border-gray-200">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 truncate">{order.user_name}</h3>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{order.user_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 md:px-4 py-1 md:py-2 rounded-lg font-bold text-xs md:text-sm border-2 ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span className="text-gray-500">
                      {formatTime(order.created_at)}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {order.total_items} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Contenido del pedido - Mobile optimized */}
              <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Ubicación */}
                <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3 md:p-4 border-2 border-blue-200">
                  <MapPin className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Ubicación de Entrega</p>
                    <p className="text-base md:text-lg font-bold text-gray-900 truncate">{order.location}</p>
                  </div>
                </div>

                {/* Items del pedido */}
                <div className="bg-gray-50 rounded-lg p-3 md:p-4 border-2 border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm md:text-base">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-gray-700" />
                    Platillos Solicitados
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Array.isArray(order.items) && order.items.map((item, index) => (
                      item && typeof item === 'object' && item.name !== undefined ? (
                        <div key={index} className="bg-white rounded-lg p-2 md:p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <span style={{ fontWeight: '900' }} className="text-sm md:text-base text-gray-900 flex-1 truncate mr-2">{item.name}</span>
                            <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm font-bold flex-shrink-0">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>
                      ) : null
                    ))}

                    {/* Guarnición personalizada si existe */}
                    {(() => {
                      const customSide = getCustomSideFromResponses(order.custom_responses)
                      if (customSide) {
                        return (
                          <div className="bg-orange-50 rounded-lg p-2 md:p-3 border-2 border-orange-300">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-orange-900 text-sm">🔸 Guarnición Personalizada</span>
                                <p className="text-xs md:text-sm font-bold text-orange-700 mt-1 truncate">{customSide}</p>
                              </div>
                              <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full text-xs font-bold flex-shrink-0 ml-2">
                                CUSTOM
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>

                {/* Aclaraciones especiales */}
                {(order.comments || getOtherCustomResponses(order.custom_responses).length > 0) && (
                  <div className="bg-purple-50 rounded-lg p-3 md:p-4 border-2 border-purple-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm md:text-base">
                      <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                      Aclaraciones Especiales
                    </h4>

                    {order.comments && (
                      <div className="mb-3">
                        <p className="text-xs md:text-sm text-gray-600 font-semibold mb-1">Comentarios:</p>
                        <p className="text-gray-900 bg-white rounded-lg p-2 md:p-3 border border-purple-200 text-sm md:text-base">
                          {order.comments}
                        </p>
                      </div>
                    )}

                    {getOtherCustomResponses(order.custom_responses).length > 0 && (
                      <div className="space-y-2">
                        <p style={{ fontWeight: '900' }} className="text-xs md:text-sm text-gray-900 mb-2">Opciones Adicionales:</p>
                        {getOtherCustomResponses(order.custom_responses)
                          .map((resp, index) => (
                            <div key={index} className="bg-white rounded-lg p-2 md:p-3 border border-purple-200">
                              <p style={{ fontWeight: '900' }} className="text-purple-900 text-xs md:text-sm mb-1">{resp.title}</p>
                              <p style={{ fontWeight: '900' }} className="text-gray-900 text-sm md:text-base">
                                {Array.isArray(resp.response)
                                  ? resp.response.join(', ')
                                  : resp.response}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Info de contacto adicional */}
                {(order.customer_phone) && (
                  <div className="bg-green-50 rounded-lg p-3 md:p-4 border-2 border-green-200">
                    <h4 className="font-bold text-gray-900 mb-2 text-xs md:text-sm">Información de Contacto</h4>
                    <p className="text-gray-900 text-sm md:text-base">📞 {order.customer_phone}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen por ubicación */}
      {selectedLocation === 'all' && stats.total > 0 && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            Resumen por Ubicación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {locations.map(location => (
              <div key={location} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{location}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pedidos:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.byLocation[location] || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyOrders
