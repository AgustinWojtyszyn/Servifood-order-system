import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { Shield } from 'lucide-react'
import { db } from '../supabaseClient'
import RequireUser from './RequireUser'
import { COMPANY_LOCATIONS } from '../constants/companyConfig'
import { Sound } from '../utils/Sound'
import DailyFilters from './daily/DailyFilters'
import DailyHeader from './daily/DailyHeader'
import DailyLoader from './daily/DailyLoader'
import DailyOrdersTable from './daily/DailyOrdersTable'
import DailySummary from './daily/DailySummary'
import {
  calculateStats,
  buildLocationCards,
  buildOperationalSummary,
  buildOrderPreview,
  buildPrintStats,
  buildTurnSummary,
  downloadWorkbook,
  filterOrdersByCompany,
  getCustomSideFromResponses,
  getDinnerOverrideSelection,
  getOtherCustomResponses
} from '../utils/daily/dailyOrderCalculations'
import {
  formatDate,
  formatTime,
  getStatusText,
  getTomorrowDate,
  normalizeDishName
} from '../utils/daily/dailyOrderFormatters'

const DailyOrders = ({ user, loading }) => {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [exportCompany, setExportCompany] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDish, setSelectedDish] = useState('all')
  const [selectedSide, setSelectedSide] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
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

  useEffect(() => {
    if (!user?.id) return
    checkIfAdmin()
  }, [user])

  useEffect(() => {
    if (!user?.id || isAdmin !== true) return
    if (isAdmin === true) {
      fetchDailyOrders()

      const interval = setInterval(() => {
        fetchDailyOrders(true)
      }, 30000)

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
      if (!silent) {
        setOrdersLoading(false)
      }
    }
  }

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

  const handleArchiveAllPending = async () => {
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
  }

  const allOrders = Array.isArray(orders) ? orders : []

  const filteredOrders = selectedLocation === 'all'
    ? allOrders
    : allOrders.filter(order => order && order.location === selectedLocation)

  const statusFilteredOrders = selectedStatus === 'all'
    ? Array.isArray(filteredOrders) ? filteredOrders : []
    : Array.isArray(filteredOrders) ? filteredOrders.filter(order => {
      if (!order) return false
      if (selectedStatus === 'archived') {
        return order.status === 'archived'
      }
      if (selectedStatus === 'pending') {
        return order.status !== 'archived'
      }
      return order.status !== 'archived'
    }) : []

  let dishFilteredOrders = selectedDish === 'all'
    ? Array.isArray(statusFilteredOrders) ? statusFilteredOrders : []
    : Array.isArray(statusFilteredOrders) ? statusFilteredOrders.filter(order => {
      if (!order || !Array.isArray(order.items)) return false
      return order.items.some(item => item && typeof item === 'object' && item.name !== undefined && item.name === selectedDish)
    }) : []

  if (selectedSide !== 'all') {
    dishFilteredOrders = Array.isArray(dishFilteredOrders) ? dishFilteredOrders.filter(order => {
      const customResponses = Array.isArray(order?.custom_responses) ? order.custom_responses : []
      const customSide = getCustomSideFromResponses(customResponses)
      return customSide === selectedSide
    }) : []
  }

  const sortedOrders = [...dishFilteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    switch (sortBy) {
      case 'location': {
        const loc = (a.location || '').localeCompare(b.location || '')
        if (loc !== 0) return loc
        return dateA - dateB
      }
      case 'hour':
        return dateA - dateB
      case 'status':
        return (a.status || '').localeCompare(b.status || '')
      case 'recent':
      default:
        return dateB - dateA
    }
  })

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

  const shareViaWhatsApp = () => {
    if (sortedOrders.length === 0) {
      alert('No hay pedidos para compartir')
      return
    }

    try {
      let message = `📋 *PEDIDOS SERVIFOOD*\n`
      message += `${'='.repeat(40)}\n\n`
      const ubicaciones = {}
      sortedOrders.forEach(order => {
        const ubicacion = order.location || 'Sin ubicación'
        if (!ubicaciones[ubicacion]) {
          ubicaciones[ubicacion] = { menues: {}, guarniciones: {} }
        }
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const nombre = normalizeDishName(item.name)
            ubicaciones[ubicacion].menues[nombre] = (ubicaciones[ubicacion].menues[nombre] || 0) + (item.quantity || 1)
          })
        }
        const guarnicion = getCustomSideFromResponses(order.custom_responses || [])
        if (guarnicion) {
          ubicaciones[ubicacion].guarniciones[guarnicion] = (ubicaciones[ubicacion].guarniciones[guarnicion] || 0) + 1
        }
      })
      Object.entries(ubicaciones).forEach(([ubicacion, datos]) => {
        message += `*${ubicacion}*\n`
        const sortedMenus = Object.entries(datos.menues).sort((a, b) => {
          const extractNumber = (name) => {
            const match = name.match(/(\d+)/)
            return match ? parseInt(match[1], 10) : Infinity
          }
          return extractNumber(a[0]) - extractNumber(b[0])
        })
        sortedMenus.forEach(([menu, cantidad]) => {
          message += `  • ${menu}: ${cantidad}\n`
        })
        Object.entries(datos.guarniciones).forEach(([guarnicion, cantidad]) => {
          message += `  • Guarnición: ${guarnicion} (${cantidad})\n`
        })
        message += `\n`
      })
      message += `${'='.repeat(40)}\n`
      message += `\n✅ *Resumen listo para enviar por WhatsApp*\n`
      const encodedMessage = encodeURIComponent(message)
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
      window.open(whatsappUrl, '_blank')
    } catch (error) {
      console.error('Error al compartir:', error)
      alert('Error al compartir por WhatsApp')
    }
  }

  const activeLocationsCount = useMemo(
    () => Object.values(stats.byLocation || {}).filter(count => Number(count) > 0).length,
    [stats.byLocation]
  )

  const operationalSummary = useMemo(
    () => buildOperationalSummary(sortedOrders),
    [sortedOrders]
  )

  const locationCards = useMemo(
    () => buildLocationCards(allOrders),
    [allOrders]
  )

  const availableSides = useMemo(() => {
    const sides = orders.map(order => {
      if (order && Array.isArray(order.custom_responses)) {
        return getCustomSideFromResponses(order.custom_responses)
      }
      return null
    }).filter(Boolean)
    return [...new Set(sides)]
  }, [orders])

  const printStats = useMemo(() => buildPrintStats(allOrders), [allOrders])
  const exportableOrdersCount = filterOrdersByCompany(sortedOrders, exportCompany).length
  const tomorrowLabel = getTomorrowDate()

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
        <DailyLoader />
      </RequireUser>
    )
  }

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
        <DailySummary
          mode="print"
          stats={stats}
          printStats={printStats}
          tomorrowLabel={tomorrowLabel}
        />

        <DailyHeader
          stats={stats}
          activeLocationsCount={activeLocationsCount}
          tomorrowLabel={tomorrowLabel}
          exportCompany={exportCompany}
          onExportCompanyChange={setExportCompany}
          locations={locations}
          exportableOrdersCount={exportableOrdersCount}
          onExportExcel={exportToExcel}
          onShareWhatsApp={shareViaWhatsApp}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onExportPdf={exportToPdf}
          onArchiveAll={handleArchiveAllPending}
          sortedOrdersLength={sortedOrders.length}
          isAdmin={isAdmin}
        />

        <DailyFilters
          stats={stats}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedDish={selectedDish}
          onDishChange={setSelectedDish}
          selectedSide={selectedSide}
          onSideChange={setSelectedSide}
          availableDishes={availableDishes}
          availableSides={availableSides}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <DailySummary
          mode="main"
          stats={stats}
          operationalSummary={operationalSummary}
          sortedOrdersLength={sortedOrders.length}
          selectedLocation={selectedLocation}
          locationCards={locationCards}
        />

        <DailyOrdersTable
          sortedOrders={sortedOrders}
          sortBy={sortBy}
          selectedLocation={selectedLocation}
          selectedStatus={selectedStatus}
          onArchiveOrder={handleArchiveOrder}
          onViewOrder={(orderId) => navigate(`/orders/${orderId}`)}
        />
      </div>
    </RequireUser>
  )
}

export default DailyOrders
