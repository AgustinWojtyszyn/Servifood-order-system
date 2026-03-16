const InternalLoader = () => (
  <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

// import { useRef } from 'react' // Ya está importado arriba
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { MapPin, User, Package, Shield, RefreshCw, Archive as ArchiveIcon, AlertTriangle as AlertIcon, Printer } from 'lucide-react'
import ExcelJS from 'exceljs'
import RequireUser from './RequireUser'
import { COMPANY_LOCATIONS } from '../constants/companyConfig'
import { Sound } from '../utils/Sound'
import excelLogo from '../assets/logoexcel.png'
import whatsappLogo from '../assets/whatsapp.png'
import orderImg from '../assets/order.png'
import dinnerImg from '../assets/dinner.png'

const DailyOrders = ({ user, loading }) => {
  const emailLoadingRef = useRef(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [exportCompany, setExportCompany] = useState('all')
  const [exportStatusFilter, setExportStatusFilter] = useState('archived')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDish, setSelectedDish] = useState('all')
  const [selectedSide, setSelectedSide] = useState('all')
  const [sortBy, setSortBy] = useState('recent') // recent, location, hour, status
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

  const locations = COMPANY_LOCATIONS
  const navigate = useNavigate()

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

  const matchesDinnerOverrideKeyword = (val = '') => {
    const t = (val || '').toString().toLowerCase()
    return ['menu cena', 'menú cena', 'mp', 'menú principal', 'menu principal', 'veggie', 'veg', 'vegetar'].some(k => t.includes(k))
  }

  const isDinnerOverrideResponse = (resp = {}) => {
    const val = resp?.response ?? resp?.answer ?? null
    if (Array.isArray(val)) return val.some(v => matchesDinnerOverrideKeyword(v))
    return matchesDinnerOverrideKeyword(val)
  }

  const getDinnerOverrideSelection = (order) => {
    if (!order || (order.service || 'lunch') !== 'dinner') return null

    if (Array.isArray(order.items)) {
      const overrideItem = order.items.find(it => it?.id === 'dinner-override' || matchesDinnerOverrideKeyword(it?.name))
      if (overrideItem?.name) return overrideItem.name.replace(/^cena:\s*/i, '').trim() || overrideItem.name
    }

    if (Array.isArray(order.custom_responses)) {
      for (const resp of order.custom_responses) {
        if (isDinnerOverrideResponse(resp)) {
          const val = resp?.response ?? resp?.answer
          if (Array.isArray(val)) {
            const match = val.find(v => matchesDinnerOverrideKeyword(v))
            if (match) return match
          }
          return val || null
        }
      }
    }

    return null
  }

  // Función helper para obtener otras opciones (sin guarniciones)
  const getOtherCustomResponses = (customResponses) => {
    if (!customResponses || !Array.isArray(customResponses)) return []

    return customResponses.filter(r =>
      r.response &&
      !r.title?.toLowerCase().includes('guarnición') &&
      !r.title?.toLowerCase().includes('guarnicion') &&
      !isDinnerOverrideResponse(r)
    )
  }

  const isBeverage = (text = '') => {
    const t = (text || '').toLowerCase()
    return ['bebida', 'agua', 'jugo', 'coca', 'gaseosa', 'sprite', 'fanta', 'pepsi', 'soda'].some(k => t.includes(k))
  }

  const getBeverageCount = (customResponses) => {
    if (!Array.isArray(customResponses)) return 0
    let count = 0
    customResponses.forEach(resp => {
      if (isBeverage(resp?.response)) count += 1
      if (Array.isArray(resp?.options)) {
        resp.options.forEach(opt => { if (isBeverage(opt)) count += 1 })
      }
    })
    return count
  }

  const getBeverageLabel = (customResponses) => {
    if (!Array.isArray(customResponses)) return '—'
    const names = []
    customResponses.forEach(resp => {
      if (isBeverage(resp?.response)) names.push(resp.response)
      if (Array.isArray(resp?.options)) {
        resp.options.forEach(opt => { if (isBeverage(opt)) names.push(opt) })
      }
    })
    if (names.length === 0) return '—'
    // Dedup y acorta si hay muchas
    const unique = [...new Set(names.map(n => (n || '').trim()))].filter(Boolean)
    const joined = unique.slice(0, 3).join(', ')
    return unique.length > 3 ? `${joined} (+${unique.length - 3})` : joined || '—'
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
      
      const { data: ordersData, error } = await db.getOrdersWithPersonKey()

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        // Obtener información de personas (grupos + usuarios sueltos, sin duplicados)
        const { data: peopleData } = await db.getAdminPeopleUnified()
        const personById = new Map(
          (Array.isArray(peopleData) ? peopleData : []).map(person => [person.person_id, person])
        )
        
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
          const personId = order.person_key || (order.user_id ? String(order.user_id) : null)
          const person = personId ? personById.get(personId) : null
          const emails = Array.isArray(person?.emails) ? person.emails.filter(Boolean) : []
          let userName = 'Usuario';
          if (person) {
            userName = (person.display_name !== undefined ? person.display_name : null)
              || (emails[0] ? emails[0].split('@')[0] : null)
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
            user_email: (order.customer_email ? order.customer_email : (emails[0] ? emails[0] : ''))
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

  const handleArchiveOrder = async (order) => {
    if (!order?.id || order.status === 'archived') return
    const confirmArchive = window.confirm(`¿Archivar el pedido de ${order.user_name || 'cliente'}?`)
    if (!confirmArchive) return

    const { error } = await db.updateOrderStatus(order.id, 'archived')
    if (error) {
      alert('Error al archivar el pedido: ' + error.message)
      return
    }
    Sound.playSuccess()
    handleRefresh()
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
    let archived = 0
    let pending = 0
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
      if (order.status === 'archived') {
        archived++
      } else {
        pending++
      }
    })

    setStats({
      total: ordersData.length,
      byLocation,
      byDish,
      totalItems,
      archived,
      pending
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
      case 'archived':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300'
      case 'pending':
        return 'bg-amber-100 text-amber-900 border-amber-300'
      default:
        return 'bg-amber-100 text-amber-900 border-amber-300'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'archived':
        return 'Archivado'
      case 'pending':
        return 'Pendiente'
      default:
        return 'Pendiente'
    }
  }

  // Colores distintivos por ubicación para mejorar legibilidad
  const getLocationBadgeColor = (location) => {
    // Estilo neutro: blanco con texto negro para máxima legibilidad
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const allOrders = Array.isArray(orders) ? orders : []

  const filteredOrders = selectedLocation === 'all' 
    ? allOrders
    : allOrders.filter(order => order && order.location === selectedLocation)

  // Aplicar filtro por estado
  const statusFilteredOrders = selectedStatus === 'all'
    ? Array.isArray(filteredOrders) ? filteredOrders : []
    : Array.isArray(filteredOrders) ? filteredOrders.filter(order => {
        if (!order) return false;
        if (selectedStatus === 'archived') {
          return order.status === 'archived'
        }
        if (selectedStatus === 'pending') {
          return order.status !== 'archived'
        }
        return order.status !== 'archived'
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

  // Aplicar ordenamiento (empresa agrupada y luego hora asc; hora asc; recientes desc)
  const sortedOrders = [...dishFilteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    switch (sortBy) {
      case 'location': {
        const loc = (a.location || '').localeCompare(b.location || '')
        if (loc !== 0) return loc
        return dateA - dateB // dentro de la empresa, por hora ascendente
      }
      case 'hour':
        return dateA - dateB // cronológico ascendente
      case 'status':
        return (a.status || '').localeCompare(b.status || '')
      case 'recent':
      default:
        return dateB - dateA // más recientes primero
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

  // Vista previa (similar a Excel) para cada pedido
  const buildOrderPreview = (order) => {
    const items = []
    if (Array.isArray(order?.items)) {
      const principal = order.items.filter(
        item => item && item.name && item.name.toLowerCase().includes('menú principal')
      )
      const others = order.items.filter(
        item => item && item.name && !item.name.toLowerCase().includes('menú principal')
      )
      if (principal.length > 0) {
        const totalPrincipal = principal.reduce((sum, i) => sum + (i.quantity || 1), 0)
        items.push(`Plato Principal: ${totalPrincipal}`)
      }
      others.forEach(i => items.push(`${normalizeDishName(i.name)} (x${i.quantity || 1})`))
    }

    const customSide = getCustomSideFromResponses(order?.custom_responses || [])
    if (customSide) items.push(`Guarnición: ${customSide}`)

    const otherResponses = getOtherCustomResponses(order?.custom_responses || [])
    const customStrings = otherResponses.map(r => {
      const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
      return `${r.title}: ${response}`
    })

    return {
      itemsText: items.length ? items.join(' | ') : 'Sin items',
      optionsText: customStrings.length ? customStrings.join(' | ') : 'Sin opciones adicionales'
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

  // Filtro combinado para exportar directo a la empresa (empresa + estado)
  const filterOrdersForCompanyExport = (ordersList, company, statusFilter) => {
    const companyFiltered = filterOrdersByCompany(ordersList, company)

    switch (statusFilter) {
      case 'archived':
        return companyFiltered.filter(order => order.status === 'archived')
      case 'pending':
        return companyFiltered.filter(order => order.status !== 'archived')
      default:
        return companyFiltered
    }
  }

  const buildTurnSummary = (ordersList = []) => {
    const turnCounts = {
      lunch: { orders: 0, items: 0 },
      dinner: { orders: 0, items: 0 }
    }
    const byLocationTurn = {}

    ;(ordersList || []).forEach((order) => {
      if (!order) return
      const turn = (order.service || 'lunch') === 'dinner' ? 'dinner' : 'lunch'
      const itemsQty = Number(order.total_items || 0)
      const loc = order.location || 'Sin ubicación'

      turnCounts[turn].orders += 1
      turnCounts[turn].items += itemsQty

      if (!byLocationTurn[loc]) byLocationTurn[loc] = { lunch: 0, dinner: 0, total: 0 }
      byLocationTurn[loc][turn] += 1
      byLocationTurn[loc].total += 1
    })

    return { turnCounts, byLocationTurn }
  }



  const downloadWorkbook = async (workbook, fileName) => {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1200)
  }

  const exportToExcel = async () => {
    const ordersToExport = filterOrdersByCompany(sortedOrders, exportCompany)

    if (ordersToExport.length === 0) {
      alert('No hay pedidos para exportar')
      return
    }

    try {
      const excelData = ordersToExport.map(order => {
        const overrideChoice = getDinnerOverrideSelection(order)
        let menuItems = []
        if (overrideChoice && (order.location || '').toLowerCase().includes('genneia')) {
          menuItems.push(`Cena: ${overrideChoice}`)
        } else if (Array.isArray(order.items)) {
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
          'Turno': (order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo',
          'Comentarios': order.comments || 'Sin comentarios',
          'Opciones Adicionales': customResponses,
          'Cliente': order.customer_name || order.user_name || 'Sin nombre'
        }
      })

      // Crear hoja de estadísticas
      const statsData = [
        { Concepto: 'Total de Pedidos', Valor: stats.total },
        { Concepto: 'Pedidos Archivados', Valor: stats.archived },
        { Concepto: 'Pedidos Pendientes', Valor: stats.pending },
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

      const wb = new ExcelJS.Workbook()
      const ws1 = wb.addWorksheet('Pedidos Detallados')
      ws1.columns = [
        { header: 'Fecha Pedido', key: 'Fecha Pedido', width: 12 },
        { header: 'Hora Pedido', key: 'Hora Pedido', width: 10 },
        { header: 'Usuario', key: 'Usuario', width: 20 },
        { header: 'Email', key: 'Email', width: 25 },
        { header: 'Teléfono', key: 'Teléfono', width: 15 },
        { header: 'Ubicación', key: 'Ubicación', width: 15 },
        { header: 'Fecha Entrega', key: 'Fecha Entrega', width: 25 },
        { header: 'Platillos', key: 'Platillos', width: 40 },
        { header: 'Guarnición', key: 'Guarnición', width: 18 },
        { header: 'Cantidad Items', key: 'Cantidad Items', width: 14 },
        { header: 'Estado', key: 'Estado', width: 14 },
        { header: 'Turno', key: 'Turno', width: 12 },
        { header: 'Comentarios', key: 'Comentarios', width: 30 },
        { header: 'Opciones Adicionales', key: 'Opciones Adicionales', width: 40 },
        { header: 'Cliente', key: 'Cliente', width: 20 }
      ]
      ws1.addRows(excelData)

      const ws2 = wb.addWorksheet('Estadísticas')
      ws2.columns = [
        { header: 'Concepto', key: 'Concepto', width: 30 },
        { header: 'Valor', key: 'Valor', width: 15 }
      ]
      ws2.addRows(statsData)

      // Generar nombre de archivo
      const today = new Date().toISOString().split('T')[0]
      const locationFilter = selectedLocation !== 'all' ? `_${selectedLocation.replace(/\s+/g, '_')}` : ''
      const statusFilter = selectedStatus !== 'all' ? `_${selectedStatus}` : ''
      const companyFilter = exportCompany !== 'all' ? `_empresa_${exportCompany.replace(/\s+/g, '_')}` : ''
      const fileName = `Pedidos_ServiFood_${today}${locationFilter}${statusFilter}${companyFilter}.xlsx`

      await downloadWorkbook(wb, fileName)

      alert(`✓ ${ordersToExport.length} pedidos exportados correctamente a ${fileName}`)
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al exportar el archivo. Por favor, inténtalo de nuevo.')
    }
  }

  const exportToPdf = () => {
    if (!sortedOrders.length) {
      alert('No hay pedidos para exportar.')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const { turnCounts, byLocationTurn } = buildTurnSummary(sortedOrders)
    const rowsHtml = sortedOrders.map(order => {
      const preview = buildOrderPreview(order)
      return `
        <tr>
          <td>${order.customer_name || order.user_name || 'Usuario'}</td>
          <td>${order.user_email || order.customer_email || ''}</td>
          <td>${order.location || '—'}</td>
          <td>${getStatusText(order.status)}</td>
          <td>${preview.itemsText}</td>
          <td>${preview.optionsText}</td>
          <td>${(order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'}</td>
          <td>${getTomorrowDate()}</td>
        </tr>
      `
    }).join('')

    const byLocationTurnRows = Object.entries(byLocationTurn).map(([loc, turns]) => `
      <tr>
        <td>${loc}</td>
        <td style="text-align:right">${turns.lunch}</td>
        <td style="text-align:right">${turns.dinner}</td>
        <td style="text-align:right">${turns.total}</td>
      </tr>
    `).join('')

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Pedidos diarios - ${today}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
            h1 { margin: 0 0 8px; }
            h2 { margin: 4px 0 16px; font-size: 16px; color: #444; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
            tr:nth-child(every) { background: #fafafa; }
            .meta { margin-bottom: 12px; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Pedidos diarios</h1>
          <h2>Fecha de generación: ${today} · Entrega: ${getTomorrowDate()}</h2>
          <div class="meta">Total pedidos: ${sortedOrders.length}</div>

          <h2>Resumen por turno</h2>
          <table>
            <thead>
              <tr>
                <th>Turno</th>
                <th>Pedidos</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Almuerzo</td>
                <td style="text-align:right">${turnCounts.lunch.orders}</td>
                <td style="text-align:right">${turnCounts.lunch.items}</td>
              </tr>
              <tr>
                <td>Cena</td>
                <td style="text-align:right">${turnCounts.dinner.orders}</td>
                <td style="text-align:right">${turnCounts.dinner.items}</td>
              </tr>
              <tr>
                <td><strong>Total</strong></td>
                <td style="text-align:right"><strong>${turnCounts.lunch.orders + turnCounts.dinner.orders}</strong></td>
                <td style="text-align:right"><strong>${turnCounts.lunch.items + turnCounts.dinner.items}</strong></td>
              </tr>
            </tbody>
          </table>

          <h2>Empresas por turno</h2>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Almuerzo</th>
                <th>Cena</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${byLocationTurnRows || '<tr><td colspan="4">Sin pedidos</td></tr>'}
            </tbody>
          </table>

          <h2>Detalle de pedidos</h2>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Email</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Menú</th>
                <th>Opciones</th>
                <th>Turno</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.print(); setTimeout(() => window.close(), 300);</script>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (!w) {
      alert('No se pudo abrir la vista de impresión. Permite popups e inténtalo de nuevo.')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  // Export específico para enviar datos a la empresa con confirmación de pedido
  const exportCompanyReport = async () => {
    const companyOrders = filterOrdersForCompanyExport(sortedOrders, exportCompany, exportStatusFilter)

    if (companyOrders.length === 0) {
      alert('No hay pedidos con ese filtro para exportar a la empresa')
      return
    }

    try {
      const reportData = companyOrders.map(order => {
        const overrideChoice = getDinnerOverrideSelection(order)
        const itemsList = []
        if (overrideChoice && (order.location || '').toLowerCase().includes('genneia')) {
          itemsList.push(`Cena: ${overrideChoice}`)
        } else if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!item?.name) return
            itemsList.push(`${normalizeDishName(item.name)} (x${item.quantity || 1})`)
          })
        }

        const customSide = getCustomSideFromResponses(order.custom_responses || [])
        if (customSide) {
          itemsList.push(`Guarnición: ${customSide}`)
        }

        const otherResponses = getOtherCustomResponses(order.custom_responses || [])
        const customResponses = otherResponses
          .map(r => {
            const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
            return `${r.title}: ${response}`
          }).join(' | ') || 'Sin opciones'

        const confirmationDate = formatDate(order.updated_at || order.created_at)
        const companyTarget = order.company || order.company_slug || order.target_company || order.location || 'Empresa no asignada'
        const isConfirmed = order.status === 'archived'

        return {
          'ID Pedido': order.id || order.order_id || 'N/A',
          'Empresa Destino': companyTarget,
          'Ubicación': order.location || 'Sin ubicación',
          'Cliente': order.customer_name || order.user_name || 'Sin nombre',
          'Email': order.customer_email || order.user_email || 'Sin email',
          'Teléfono': order.customer_phone || 'Sin teléfono',
          'Estado': getStatusText(order.status),
          'Turno': (order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo',
          'Confirmación': isConfirmed ? 'Pedido archivado' : 'Pendiente de confirmación',
          'Fecha Confirmación': confirmationDate,
          'Items Detallados': itemsList.join(' | ') || 'Sin items',
          'Guarnición Seleccionada': customSide || 'Sin guarnición',
          'Opciones Adicionales': customResponses,
          'Comentarios': order.comments || 'Sin comentarios'
        }
      })

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Confirmacion Empresa')
      ws.columns = [
        { header: 'ID Pedido', key: 'ID Pedido', width: 12 },
        { header: 'Empresa Destino', key: 'Empresa Destino', width: 20 },
        { header: 'Ubicación', key: 'Ubicación', width: 16 },
        { header: 'Cliente', key: 'Cliente', width: 20 },
        { header: 'Email', key: 'Email', width: 25 },
        { header: 'Teléfono', key: 'Teléfono', width: 14 },
        { header: 'Estado', key: 'Estado', width: 14 },
        { header: 'Confirmación', key: 'Confirmación', width: 26 },
        { header: 'Fecha Confirmación', key: 'Fecha Confirmación', width: 22 },
        { header: 'Items Detallados', key: 'Items Detallados', width: 40 },
        { header: 'Guarnición Seleccionada', key: 'Guarnición Seleccionada', width: 20 },
        { header: 'Opciones Adicionales', key: 'Opciones Adicionales', width: 40 },
        { header: 'Comentarios', key: 'Comentarios', width: 30 }
      ]
      ws.addRows(reportData)

      const today = new Date().toISOString().split('T')[0]
      const companySlug = exportCompany !== 'all' ? exportCompany.replace(/\\s+/g, '_') : 'todas'
      const statusSlug = exportStatusFilter
      const fileName = `Confirmacion_Pedidos_${companySlug}_${statusSlug}_${today}.xlsx`

      await downloadWorkbook(wb, fileName)

      alert(`✓ ${companyOrders.length} pedidos exportados para la empresa (${exportCompany === 'all' ? 'todas' : exportCompany})`)
    } catch (error) {
      console.error('Error al exportar para la empresa:', error)
      alert('Error al exportar el archivo para la empresa. Por favor, inténtalo de nuevo.')
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

  const activeLocationsCount = useMemo(
    () => Object.values(stats.byLocation || {}).filter(count => Number(count) > 0).length,
    [stats.byLocation]
  )

  const operationalSummary = useMemo(() => {
    const dishCounts = {}
    const sideCounts = {}
    const beverageCounts = {}

    ;(sortedOrders || []).forEach(order => {
      if (!order) return

      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!item?.name) return
          const normalizedName = normalizeDishName(item.name)
          dishCounts[normalizedName] = (dishCounts[normalizedName] || 0) + (item.quantity || 1)
        })
      }

      const side = getCustomSideFromResponses(order.custom_responses || [])
      if (side) {
        sideCounts[side] = (sideCounts[side] || 0) + 1
      }

      const customResponses = Array.isArray(order.custom_responses) ? order.custom_responses : []
      customResponses.forEach(resp => {
        const pushBeverage = (value) => {
          if (!value) return
          const label = String(value).trim()
          if (!label || !isBeverage(label)) return
          beverageCounts[label] = (beverageCounts[label] || 0) + 1
        }
        if (Array.isArray(resp?.response)) {
          resp.response.forEach(pushBeverage)
        } else {
          pushBeverage(resp?.response)
        }
        if (Array.isArray(resp?.options)) {
          resp.options.forEach(pushBeverage)
        }
      })
    })

    const sortCounts = (counts) =>
      Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))

    return {
      dishes: sortCounts(dishCounts),
      sides: sortCounts(sideCounts),
      beverages: sortCounts(beverageCounts)
    }
  }, [sortedOrders])

  const locationCards = useMemo(() => {
    const byLocation = {}

    ;(allOrders || []).forEach(order => {
      if (!order) return
      const loc = order.location || 'Sin ubicación'
      if (!byLocation[loc]) {
        byLocation[loc] = { total: 0, dishCounts: {}, sideCounts: {} }
      }
      byLocation[loc].total += 1

      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!item?.name) return
          const normalizedName = normalizeDishName(item.name)
          byLocation[loc].dishCounts[normalizedName] =
            (byLocation[loc].dishCounts[normalizedName] || 0) + (item.quantity || 1)
        })
      }

      const side = getCustomSideFromResponses(order.custom_responses || [])
      if (side) {
        byLocation[loc].sideCounts[side] = (byLocation[loc].sideCounts[side] || 0) + 1
      }
    })

    return Object.entries(byLocation)
      .filter(([, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([location, data]) => {
        const topDishes = Object.entries(data.dishCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
        const topSides = Object.entries(data.sideCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
        return { location, total: data.total, topDishes, topSides }
      })
  }, [allOrders])

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

  // Datos agregados específicos para la impresión/PDF
  const printStats = (() => {
    const sideCounts = {}
    const optionCounts = {}
    const turnCounts = {
      lunch: { orders: 0, items: 0 },
      dinner: { orders: 0, items: 0 }
    }
    const byLocationTurn = {}

    allOrders.forEach(order => {
      if (!order) return
      const customResponses = Array.isArray(order.custom_responses) ? order.custom_responses : []
      const turn = (order.service || 'lunch') === 'dinner' ? 'dinner' : 'lunch'
      const itemsQty = Number(order.total_items || 0)

      turnCounts[turn].orders += 1
      turnCounts[turn].items += itemsQty

      const loc = order.location || 'Sin ubicación'
      if (!byLocationTurn[loc]) {
        byLocationTurn[loc] = { lunch: 0, dinner: 0, total: 0 }
      }
      byLocationTurn[loc][turn] += 1
      byLocationTurn[loc].total += 1

      // Guarniciones
      const side = getCustomSideFromResponses(customResponses)
      if (side) {
        sideCounts[side] = (sideCounts[side] || 0) + 1
      }

      // Otras opciones (titular + respuesta)
      getOtherCustomResponses(customResponses).forEach(r => {
        const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
        const key = `${r.title}: ${response || '—'}`
        optionCounts[key] = (optionCounts[key] || 0) + 1
      })
    })

    return { sideCounts, optionCounts, turnCounts, byLocationTurn }
  })()

  return (
    <RequireUser user={user} loading={loading}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; font-size: 11px; line-height: 1.35; }
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          .print-wrap { padding: 0 !important; max-width: 100% !important; }
          .print-content { zoom: 0.85; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; }
          .print-table th { background: #f3f4f6; font-weight: 700; }
          h1,h2,h3,h4,h5 { margin: 0 0 6px 0; }
          .print-block { page-break-inside: avoid; margin-bottom: 8px; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
      <div className="mx-auto max-w-screen-2xl rounded-3xl bg-slate-50/70 p-4 md:p-6 2xl:p-10 print-wrap print-content">
        {/* Resumen compacto solo para impresión (cantidades y detalles agregados) */}
        <div className="print-only mb-4">
          <h2 className="text-lg font-black mb-1">📋 Resumen estadístico para PDF</h2>
          <p className="text-[12px] text-gray-700 mb-2">Entrega: {getTomorrowDate()}</p>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Pedidos por empresa</h3>
          <table className="print-table text-[11px] mb-2 print-block">
            <tbody>
              {Object.entries(stats.byLocation).map(([loc, count]) => (
                <tr key={loc}>
                  <td>{loc || 'Sin ubicación'}</td>
                  <td className="text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Resumen por turno</h3>
          <table className="print-table text-[11px] mb-2 print-block">
            <thead>
              <tr>
                <th>Turno</th>
                <th>Pedidos</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Almuerzo</td>
                <td className="text-right">{printStats.turnCounts.lunch.orders}</td>
                <td className="text-right">{printStats.turnCounts.lunch.items}</td>
              </tr>
              <tr>
                <td>Cena</td>
                <td className="text-right">{printStats.turnCounts.dinner.orders}</td>
                <td className="text-right">{printStats.turnCounts.dinner.items}</td>
              </tr>
              <tr>
                <td><strong>Total</strong></td>
                <td className="text-right"><strong>{printStats.turnCounts.lunch.orders + printStats.turnCounts.dinner.orders}</strong></td>
                <td className="text-right"><strong>{printStats.turnCounts.lunch.items + printStats.turnCounts.dinner.items}</strong></td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Empresas por turno</h3>
          <table className="print-table text-[11px] mb-2 print-block">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Almuerzo</th>
                <th>Cena</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(printStats.byLocationTurn).length === 0 ? (
                <tr><td colSpan={4}>Sin pedidos</td></tr>
              ) : (
                Object.entries(printStats.byLocationTurn).map(([loc, turns]) => (
                  <tr key={loc}>
                    <td>{loc}</td>
                    <td className="text-right">{turns.lunch}</td>
                    <td className="text-right">{turns.dinner}</td>
                    <td className="text-right">{turns.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Menús (platillos)</h3>
          <table className="print-table text-[11px] mb-2 print-block">
            <tbody>
              {Object.entries(stats.byDish).map(([dish, count]) => (
                <tr key={dish}>
                  <td>{dish || 'Sin nombre'}</td>
                  <td className="text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Opciones adicionales</h3>
          <table className="print-table text-[11px] mb-2 print-block">
            <tbody>
              {Object.keys(printStats.optionCounts).length === 0 ? (
                <tr><td colSpan={2}>Sin opciones</td></tr>
              ) : (
                Object.entries(printStats.optionCounts).map(([opt, count]) => (
                  <tr key={opt}>
                    <td>{opt}</td>
                    <td className="text-right">{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-900 mb-1">Guarniciones</h3>
          <table className="print-table text-[11px] print-block">
            <tbody>
              {Object.keys(printStats.sideCounts).length === 0 ? (
                <tr><td colSpan={2}>Sin guarniciones</td></tr>
              ) : (
                Object.entries(printStats.sideCounts).map(([side, count]) => (
                  <tr key={side}>
                    <td>{side}</td>
                    <td className="text-right">{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Page Header */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 shadow-lg shadow-slate-200/60 print-hide">
          <div className="flex flex-col gap-6 p-5">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src={dinnerImg} alt="" className="h-10 w-10" aria-hidden="true" />
                  <div>
                    <h1 className="text-3xl font-black text-slate-900">Pedidos diarios</h1>
                    <p className="text-sm font-semibold text-slate-600">
                      Entrega: {getTomorrowDate()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Total del día', value: stats.total },
                    { label: 'Pendientes', value: stats.pending },
                    { label: 'Archivados', value: stats.archived },
                    { label: 'Ubicaciones activas', value: activeLocationsCount }
                  ].map(metric => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {metric.label}
                      </p>
                      <p className="text-2xl font-black text-slate-900">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[420px]">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px]">
                    <label htmlFor="export-company" className="text-xs font-semibold text-slate-600">
                      Empresa (para exportar)
                    </label>
                    <select
                      id="export-company"
                      value={exportCompany}
                      onChange={(e) => setExportCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
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
                    className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <img src={excelLogo} alt="" className="mr-2 h-5 w-5" aria-hidden="true" />
                    Exportar Excel
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                      {exportableOrdersCount}
                    </span>
                  </button>

                  <button
                    onClick={shareViaWhatsApp}
                    disabled={sortedOrders.length === 0}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <img src={whatsappLogo} alt="" className="mr-2 h-5 w-5" aria-hidden="true" />
                    Enviar resumen por WhatsApp
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto ${
                      refreshing ? 'animate-pulse' : ''
                    }`}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                  </button>

                  <button
                    onClick={exportToPdf}
                    disabled={sortedOrders.length === 0}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Exportar / Imprimir PDF
                  </button>

                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (window.confirm('¿Archivar TODOS los pedidos pendientes? Esta acción no se puede deshacer.')) {
                          const { data, error } = await db.archiveAllPendingOrders()
                          if (!error) {
                            const affected = Array.isArray(data) ? data.length : 0
                            alert(
                              affected === 0
                                ? 'No hay pedidos pendientes para archivar.'
                                : `Pedidos archivados correctamente: ${affected}`
                            )
                            Sound.playSuccess()
                            handleRefresh()
                          } else {
                            alert('Error al archivar pedidos: ' + error.message)
                          }
                        }
                      }}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
                      title="Archiva todos los pedidos pendientes al final del día"
                    >
                      <ArchiveIcon className="mr-2 h-4 w-4" />
                      Archivar pedidos
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Warning */}
        {isAdmin && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm print-hide">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertIcon className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-amber-900">Recordatorio operativo</h5>
                <p className="text-sm text-amber-900/90">
                  Exporta a Excel y archiva los pedidos pendientes al cierre del día para mantener el
                  conteo limpio.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 print-hide">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Filtros rápidos</h3>
            <span className="text-xs text-slate-500">Aplican al listado y al resumen operativo</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div>
              <label htmlFor="filter-location" className="mb-2 block text-xs font-semibold text-slate-600">
                Ubicación
              </label>
              <select
                id="filter-location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label htmlFor="filter-status" className="mb-2 block text-xs font-semibold text-slate-600">
                Estado
              </label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes ({stats.pending})</option>
                <option value="archived">Archivados ({stats.archived})</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-dish" className="mb-2 block text-xs font-semibold text-slate-600">
                Platillo
              </label>
              <select
                id="filter-dish"
                value={selectedDish}
                onChange={(e) => setSelectedDish(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label htmlFor="filter-side" className="mb-2 block text-xs font-semibold text-slate-600">
                Guarnición
              </label>
              <select
                id="filter-side"
                value={selectedSide}
                onChange={(e) => setSelectedSide(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label htmlFor="filter-sort" className="mb-2 block text-xs font-semibold text-slate-600">
                Ordenar por
              </label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="recent">Recientes</option>
                <option value="location">Empresa</option>
                <option value="hour">Hora (asc)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumen Operativo */}
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3 print-hide">
          {[
            { title: 'Resumen de platillos', items: operationalSummary.dishes, empty: 'Sin platillos' },
            { title: 'Resumen de guarniciones', items: operationalSummary.sides, empty: 'Sin guarniciones' },
            { title: 'Resumen de bebidas', items: operationalSummary.beverages, empty: 'Sin bebidas' }
          ].map(section => {
            const maxItems = 6
            const visibleItems = section.items.slice(0, maxItems)
            const remaining = Math.max(section.items.length - visibleItems.length, 0)
            const totalCount = section.items.reduce((sum, [, count]) => sum + Number(count || 0), 0)

            return (
              <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                    <p className="text-xs text-slate-500">Total: {totalCount}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {sortedOrders.length} pedidos
                  </span>
                </div>

                {visibleItems.length === 0 ? (
                  <p className="text-sm text-slate-500">{section.empty}</p>
                ) : (
                  <div className="space-y-2">
                    {visibleItems.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-slate-100/70 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">{label}</span>
                        <span className="text-sm font-bold text-slate-700">{count}</span>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <p className="text-xs font-semibold text-slate-500">+{remaining} más</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Orders Table / Mobile Cards */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 print-hide">
          <div className="border-b border-slate-200 px-6 py-4 sm:px-8 xl:px-9">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Pedidos del día ({sortedOrders.length})
                </h3>
                <p className="text-sm font-semibold text-slate-600">
                  Orden: {
                    sortBy === 'recent' ? 'Más recientes' :
                    sortBy === 'location' ? 'Empresa' :
                    sortBy === 'hour' ? 'Hora ascendente' :
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
                  <tr className="bg-slate-900 text-left border-b border-slate-800">
                    <th className="min-w-[220px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100 xl:pl-11">
                      Cliente
                    </th>
                    <th className="min-w-40 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Ubicación
                    </th>
                    <th className="min-w-[100px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Items
                    </th>
                    <th className="min-w-[220px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Platillos
                    </th>
                    <th className="min-w-[140px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Bebida
                    </th>
                    <th className="min-w-[110px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Turno
                    </th>
                    <th className="min-w-[110px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Hora
                    </th>
                    <th className="min-w-[120px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Estado
                    </th>
                    <th className="min-w-[120px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-100">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100`}
                    >
                      <td className="border-b border-slate-200/70 px-4 py-5 xl:pl-11">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h5 className="text-base font-extrabold text-slate-900 tracking-wide">
                              {order.user_name}
                            </h5>
                            <p className="text-xs text-slate-500">
                              {order.user_email || 'Sin email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold border ${getLocationBadgeColor(order.location)}`}
                          title={`Ubicación: ${order.location}`}>
                          {order.location}
                        </span>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-extrabold text-slate-900">
                          {order.total_items}
                        </span>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <div className="max-w-[360px]">
                          {(() => {
                            const summary = summarizeOrderItems(order.items)
                            const customSide = getCustomSideFromResponses(order.custom_responses)
                            return (
                              <div className="space-y-1" title={summary.title}>
                                {summary.principalCount > 0 && (
                                  <div className="text-sm font-bold text-slate-900">
                                    Plato Principal: {summary.principalCount}
                                  </div>
                                )}
                                {summary.others.map((o, idx) => (
                                  <div key={idx} className="text-sm text-slate-700 wrap-break-word">
                                    {o.name} (x{o.qty})
                                  </div>
                                ))}
                                {summary.remaining > 0 && (
                                  <div className="text-xs text-slate-500 font-semibold">
                                    +{summary.remaining} más...
                                  </div>
                                )}
                                {customSide && (
                                  <div className="text-xs italic text-slate-600 mt-2 font-semibold">
                                    Guarnición: {customSide}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100/70 px-3 py-1 text-xs font-bold text-blue-900 max-w-[200px] truncate">
                          {getBeverageLabel(order.custom_responses)}
                        </span>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                          (order.service || 'lunch') === 'dinner'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-sky-100 text-sky-800 border-sky-200'
                        }`}>
                          {(order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'}
                        </span>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <p className="text-sm font-mono font-bold text-slate-900">
                          {formatTime(order.created_at)}
                        </p>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="border-b border-slate-200/70 px-4 py-5">
                        {order.status !== 'archived' ? (
                          <button
                            onClick={() => handleArchiveOrder(order)}
                            className="inline-flex items-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                          >
                            Archivar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
                    className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40 flex flex-col gap-3 ${
                      order.status === 'archived' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-slate-900 truncate">
                          {order.user_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {order.user_email || 'Sin email'}
                        </p>
                      </div>
                      <p className="text-xs font-mono font-semibold text-slate-700 ml-2">
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
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                          (order.service || 'lunch') === 'dinner'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-sky-100 text-sky-800 border-sky-200'
                        }`}
                      >
                        {(order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-900 ml-auto">
                        {order.total_items} items
                      </span>
                      <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100/70 px-3 py-1 text-xs font-bold text-blue-900">
                        {getBeverageLabel(order.custom_responses)}
                      </span>
                    </div>

                    <div className="text-sm text-slate-800 space-y-1" title={summary.title}>
                      {summary.principalCount > 0 && (
                        <div className="font-semibold text-slate-900">
                          Plato Principal: {summary.principalCount}
                        </div>
                      )}
                      {summary.others.map((o, idx) => (
                        <div key={idx} className="wrap-break-word">
                          {o.name} (x{o.qty})
                        </div>
                      ))}
                      {summary.remaining > 0 && (
                        <div className="text-xs font-semibold text-slate-500">
                          +{summary.remaining} más...
                        </div>
                      )}
                      {customSide && (
                        <div className="text-xs italic font-semibold mt-1 text-slate-600">
                          Guarnición: {customSide}
                        </div>
                      )}
                    </div>

                    {/* Vista previa tipo Excel */}
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      {(() => {
                        const preview = buildOrderPreview(order)
                        return (
                          <div className="text-xs text-slate-700 space-y-1">
                            <div className="font-semibold text-slate-900">Vista previa (exportable):</div>
                            <div><span className="font-semibold">Menú:</span> {preview.itemsText}</div>
                            <div><span className="font-semibold">Opciones:</span> {preview.optionsText}</div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {order.status !== 'archived' ? (
                        <button
                          className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                          onClick={() => handleArchiveOrder(order)}
                        >
                          Archivar pedido
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Archivado</span>
                      )}
                      <button
                        className="text-sm font-semibold text-primary-700 hover:text-primary-900"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        Ver pedido
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
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 print-hide">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <img src={orderImg} alt="" className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Resumen por ubicación</h3>
                  <p className="text-xs font-semibold text-slate-300">Solo ubicaciones con pedidos del día</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {locationCards.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No hay pedidos para mostrar.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {locationCards.map((card) => {
                    const topDishesText = card.topDishes.length
                      ? card.topDishes.map(([name, count]) => `${name} (${count})`).join(' · ')
                      : 'Sin detalle de platillos'
                    const topSidesText = card.topSides.length
                      ? card.topSides.map(([name, count]) => `${name} (${count})`).join(' · ')
                      : 'Sin guarniciones'

                    return (
                      <div
                        key={card.location}
                        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación</p>
                            <h4 className="text-lg font-bold text-slate-900">{card.location}</h4>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-800">
                            {card.total}
                          </div>
                        </div>
                        <div className="mt-3 text-xs font-semibold text-slate-600">Top platillos</div>
                        <p className="text-xs text-slate-700">{topDishesText}</p>
                        <div className="mt-2 text-xs font-semibold text-slate-600">Guarniciones</div>
                        <p className="text-xs text-slate-700">{topSidesText}</p>
                        <div className="absolute -right-6 -bottom-6 opacity-5">
                          <MapPin className="h-20 w-20 text-primary-600" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  </RequireUser>
  )
}

export default DailyOrders
