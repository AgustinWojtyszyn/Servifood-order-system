import { useEffect, useState } from 'react'
import { db } from '../supabaseClient'
import { sortMenuItems } from '../utils/order/orderMenuHelpers'
import { withMenuSlotIndex } from '../utils/order/menuDisplay'
import { DINNER_FALLBACK_WHITELIST } from '../constants/dinnerWhitelist'
import { buildSuggestionSummary, buildOptionsSummary } from '../utils/order/orderFormatters'
import { hasMainMenuSelected } from '../utils/order/orderSelectionHelpers'
import { getTomorrowISOInTimeZone } from '../utils/dateUtils'

const useOrderBootstrap = ({
  user,
  rawCompanySlug,
  companyOptionsSlug,
  dinnerEnabled,
  setDinnerEnabled,
  setSelectedTurns,
  setMode,
  setFormData,
  setMenuItems,
  setCustomOptionsLunch,
  setCustomOptionsDinner,
  setDinnerMenuSpecial,
  setPendingLunch,
  setPendingDinner,
  setHasOrderToday,
  setSuggestion,
  setSuggestionMode,
  setSuggestionVisible,
  setSuggestionSummary,
  setSuggestionLoading
}) => {
  const [bootstrapping, setBootstrapping] = useState(false)

  const fetchMenuItems = async () => {
    try {
      const menuDate = getTomorrowISOInTimeZone()
      const { data, error } = await db.getMenuItemsByDate(menuDate)

      if (error) {
        console.error('Error fetching menu:', error)
        // Set default menu items if none exist
        setMenuItems(withMenuSlotIndex(sortMenuItems([
          { id: 1, name: 'Plato Principal 1', description: 'Delicioso plato principal' },
          { id: 2, name: 'Plato Principal 2', description: 'Otro plato delicioso' },
          { id: 3, name: 'Plato Principal 3', description: 'Plato especial del día' },
          { id: 4, name: 'Plato Principal 4', description: 'Plato vegetariano' },
          { id: 5, name: 'Plato Principal 5', description: 'Plato de la casa' },
          { id: 6, name: 'Plato Principal 6', description: 'Plato recomendado' }
        ])))
      } else {
        setMenuItems(withMenuSlotIndex(sortMenuItems(data || [])))
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchCustomOptions = async () => {
    try {
      const deliveryDate = getTomorrowISOInTimeZone()

      const filterByMealScope = (options = [], meal) =>
        (options || []).filter(opt => {
          const scope = opt?.meal_scope || (opt?.dinner_only ? 'dinner' : 'both')
          return scope === 'both' || scope === meal
        })

      const [{ data: lunchData, error: lunchError }, { data: dinnerData, error: dinnerError }] = await Promise.all([
        db.getVisibleCustomOptions({ company: companyOptionsSlug, meal: 'lunch', date: deliveryDate }),
        db.getVisibleCustomOptions({ company: companyOptionsSlug, meal: 'dinner', date: deliveryDate })
      ])

      if (lunchError) console.error('Error fetching lunch custom options:', lunchError)
      if (dinnerError) console.error('Error fetching dinner custom options:', dinnerError)

      const lunchOptions = filterByMealScope(lunchData, 'lunch')
      const dinnerOptionsFromDinnerQuery = filterByMealScope(dinnerData, 'dinner')
      // Fallback defensivo: si la consulta específica de cena devuelve vacío
      // (por reglas/RPC/whitelist), reutilizamos el catálogo de almuerzo filtrado
      // para mostrar opciones compatibles con cena.
      const dinnerOptions = dinnerOptionsFromDinnerQuery.length > 0
        ? dinnerOptionsFromDinnerQuery
        : filterByMealScope(lunchData, 'dinner')

      // Filtro defensivo por alcance de comida: asegura que cada opción solo aparezca en el turno elegido
      setCustomOptionsLunch(lunchOptions)
      setCustomOptionsDinner(dinnerOptions)
    } catch (err) {
      console.error('Error fetching custom options:', err)
    }
  }

  const fetchDinnerMenuSpecial = async () => {
    try {
      const deliveryDate = getTomorrowISOInTimeZone()
      const { data, error } = await db.getDinnerMenuByDate({
        date: deliveryDate,
        company: companyOptionsSlug
      })
      if (error) {
        console.error('Error fetching dinner menu special:', error)
        setDinnerMenuSpecial(null)
        return
      }
      if (data && data.active) {
        setDinnerMenuSpecial({
          title: data.title,
          options: Array.isArray(data.options) ? data.options : []
        })
      } else {
        setDinnerMenuSpecial(null)
      }
    } catch (err) {
      console.error('Error fetching dinner menu special:', err)
      setDinnerMenuSpecial(null)
    }
  }

  const fetchUserFeatures = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await db.getUserFeatures()
      if (!error && Array.isArray(data)) {
        const dinner = data.find(f => f.feature === 'dinner' && f.enabled)
        if (dinner) {
          setDinnerEnabled(true)
          // Habilitar turno de cena si tiene la feature
          setSelectedTurns(prev => ({ ...prev, dinner: true }))
        } else {
          const lowerId = (user?.id || '').toLowerCase()
          const lowerEmail = (user?.email || '').toLowerCase()
          const fallback = DINNER_FALLBACK_WHITELIST.has(lowerId) || DINNER_FALLBACK_WHITELIST.has(lowerEmail)
          setDinnerEnabled(fallback)
          if (fallback) {
            // Si está en whitelist, habilitar turno de cena por defecto
            setSelectedTurns({ lunch: true, dinner: true })
            setMode('both')
          } else {
            setSelectedTurns({ lunch: true, dinner: false })
            setMode('lunch')
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user features', err)
    }
  }

  const checkTodayOrder = async () => {
    if (!user?.id) return
    setSuggestionLoading(true)
    try {
      // Obtener solo los pedidos del usuario actual
      const { data, error } = await db.getOrders(user.id)
      if (!error && data) {
        const today = new Date()
        today.setHours(0,0,0,0)
        // Compatibilidad legacy: algunos pedidos históricos pueden venir como preparing/ready.
        // Operativamente hoy se trabaja con pending/archived, pero para bloqueo diario se tratan como activos.
        const pendingLunch = data.some(order => {
          const d = new Date(order.created_at)
          d.setHours(0,0,0,0)
          const isToday = d.getTime() === today.getTime()
          return isToday && (order.service || 'lunch') === 'lunch' && ['pending','preparing','ready'].includes(order.status)
        })
        const pendingDinner = data.some(order => {
          const d = new Date(order.created_at)
          d.setHours(0,0,0,0)
          const isToday = d.getTime() === today.getTime()
          return isToday && (order.service || 'lunch') === 'dinner' && ['pending','preparing','ready'].includes(order.status)
        })
        setPendingLunch(pendingLunch)
        setPendingDinner(pendingDinner)
        setHasOrderToday(pendingLunch || pendingDinner)

        const yesterday = new Date()
        yesterday.setHours(0, 0, 0, 0)
        yesterday.setDate(yesterday.getDate() - 1)

        const ordersFromYesterday = data.filter(order => {
          if (!order?.created_at) return false
          if ((order?.status || '').toLowerCase() === 'cancelled') return false
          const d = new Date(order.created_at)
          d.setHours(0, 0, 0, 0)
          return d.getTime() === yesterday.getTime()
        })

        if (ordersFromYesterday.length > 0) {
          const latestYesterday = [...ordersFromYesterday].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          setSuggestion(latestYesterday)
          setSuggestionMode('last')
          setSuggestionVisible(true)
          setSuggestionSummary(buildSuggestionSummary(latestYesterday, hasMainMenuSelected, buildOptionsSummary))
        } else {
          setSuggestion(null)
          setSuggestionMode('last')
          setSuggestionVisible(false)
          setSuggestionSummary('')
        }
      }
    } catch (err) {
      console.error('Error checking today order:', err)
      setSuggestion(null)
      setSuggestionMode('last')
      setSuggestionVisible(false)
      setSuggestionSummary('')
    } finally {
      setSuggestionLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    setBootstrapping(true)
    fetchMenuItems()
    fetchCustomOptions()
    fetchDinnerMenuSpecial()
    checkTodayOrder()
    fetchUserFeatures()
    // Pre-fill user data
    setFormData(prev => ({
      ...prev,
      name: user?.user_metadata?.full_name || '',
      email: user?.email || ''
    }))
    setBootstrapping(false)
  }, [user, rawCompanySlug, companyOptionsSlug])

  return { bootstrapping }
}

export { useOrderBootstrap }
