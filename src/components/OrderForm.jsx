import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ordersService } from '../services/orders'
import { ShoppingCart, Settings, CheckCircle } from 'lucide-react'
import RequireUser from './RequireUser'
import { COMPANY_CATALOG, COMPANY_LIST } from '../constants/companyConfig'
import { Sound } from '../utils/Sound'
import OrderErrorBanner from './order-form/OrderErrorBanner'
import OrderFormHeader from './order-form/OrderFormHeader'
import OrderCommentsSection from './order-form/OrderCommentsSection'
import OrderPersonalInfoSection from './order-form/OrderPersonalInfoSection'
import OrderLunchSummary from './order-form/OrderLunchSummary'
import OrderSuggestionPanel from './order-form/OrderSuggestionPanel'
import OrderTurnSelector from './order-form/OrderTurnSelector'
import OrderLunchMenuSection from './order-form/OrderLunchMenuSection'
import OrderConfirmModal from './order-form/OrderConfirmModal'
import OrderLunchOptionsSection from './order-form/OrderLunchOptionsSection'
import OrderDinnerMenuSection from './order-form/OrderDinnerMenuSection'
import OrderSuccessScreen from './order-form/OrderSuccessScreen'
import OrderHoursBanner from './order-form/OrderHoursBanner'
import {
  buildIdempotencyStorageKey,
  buildOrderSignature,
  computePayloadSignature,
  generateIdempotencyKey
} from '../utils/order/orderIdempotency'
import { sortMenuItems } from '../utils/order/orderMenuHelpers'
import {
  buildOrderItemLabel,
  buildOptionsSummary,
  buildSuggestionSummary,
  formatResponseValue
} from '../utils/order/orderFormatters'
import {
  buildResponsesMap,
  hasMainMenuSelected,
  mapOrderItemsToSelection
} from '../utils/order/orderSelectionHelpers'

const ORDER_START_HOUR = 9  // 09:00 apertura
const ORDER_CUTOFF_HOUR = 22 // 22:00 cierre
const ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'

const DINNER_FALLBACK_WHITELIST = new Set([
  'e0f14abf-60f7-448f-87e2-565351b847c2',
  '77a2c303-cf16-4358-ac6e-b4165a163c52',
  '25b89b0d-8744-40a7-b2c6-f5034ea0a11f',
  '3658aea9-1e69-4dcf-aeb1-58e97b635c24',
  '27422d62-9509-42ef-aac4-b36569d669dd',
  '3aca6f64-235c-46d5-90c6-4e87e7262a3a',
  '75a715bc-786e-4efd-affe-edf7d89755d7',
  '1daf7522-824e-499b-940f-53a7a2a04494',
  '706dc288-ce1c-47f2-b275-66948fff6485',
  'cf771398-f240-4c18-9a45-2d12d5b16467',
  'adccf325-8e30-469a-9255-d807eb0b0531',
  '8a37367c-8386-42fb-8fab-4c4e889dd1da',
  'diego.gimenez@genneia.com.ar',
  'diego_sjrc@hotmail.com',
  'jorge.rodriguez@genneia.com.ar',

  // Whitelist personales existentes
  'aldana.marquez@gmail.com',
  'edgardo.elizondo@gmail.com',
  'eelizondo_2005@yahoo.com.ar',
  'german.arabel@gmail.com',
  'guillermo.alonso@gmail.com',
  'javier.pallero@gmail.com',
  'javiksn@gmail.com',
  'joseluis.gonzalez@gmail.com',
  'mario.ronco@gmail.com',
  'martin.amieva@gmail.com',
  'martin.calderon@gmail.com',
  'martin.calderon@genneia.com.ar',
  'silvio.mansilla@gmail.com',
  'agustinwojtyszyn99@gmail.com',
  'sarmientoclaudia985@gmail.com',

  // Correos corporativos genneia.* para los mismos usuarios whitelisted
  'amarquez@genneia.com.ar',
  'german.arabel@genneia.com.ar',
  'galonso@genneia.com',
  'galonso@genneia.com.ar',
  'jpallero@genneia.com',
  'jlgonzalez@genneia.com.ar',
  'mario.ronco@genneia.com',
  'mario.ronco@genneia.com.ar',
  'mamieva@genneia.com.ar',
  'silvio.mansilla@genneia.com.ar',
  'diego.gimenez@genneia.com.ar'
])

const OrderForm = ({ user, loading }) => {
  const [menuItems, setMenuItems] = useState([])
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState({})
  const [selectedItems, setSelectedItems] = useState({})
  const [selectedItemsDinner, setSelectedItemsDinner] = useState({})
  const [formData, setFormData] = useState({
    location: '',
    name: '',
    email: '',
    phone: '',
    comments: ''
  })
  const [mode, setMode] = useState('lunch') // legacy, derives from selection (keep for compat)
  const [dinnerEnabled, setDinnerEnabled] = useState(false)
  const [selectedTurns, setSelectedTurns] = useState({ lunch: true, dinner: false })
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasOrderToday, setHasOrderToday] = useState(false)
  const [pendingLunch, setPendingLunch] = useState(false)
  const [pendingDinner, setPendingDinner] = useState(false)
  const [suggestion, setSuggestion] = useState(null) // último pedido sugerido
  const [suggestionVisible, setSuggestionVisible] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionSummary, setSuggestionSummary] = useState('')
  const [suggestionMode, setSuggestionMode] = useState('last')
  const repeatAppliedRef = useRef(false)
  const submitLockRef = useRef(false)
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    // Por defecto mostrar menú de cena si no hay preferencia previa
    return stored === null ? true : stored === 'true'
  })
  const navigate = useNavigate()
  const locationState = useLocation()
  const { companySlug: companySlugParam } = useParams()
  const [searchParams] = useSearchParams()
  const defaultCompanySlug = COMPANY_LIST[0]?.slug || 'laja'
  const rawCompanySlug = (companySlugParam || searchParams.get('company') || defaultCompanySlug || '')
    .trim()
    .toLowerCase()
  const companyConfig = COMPANY_CATALOG[rawCompanySlug] || COMPANY_CATALOG[defaultCompanySlug]
  const companyOptionsSlug = (companyConfig?.optionsSourceSlug || companyConfig?.slug || rawCompanySlug || '')
    .trim()
    .toLowerCase()
  const isGenneia = (companyConfig?.slug || rawCompanySlug || '').toLowerCase() === 'genneia'
  const isGenneiaPostreOption = (option = {}) =>
    isGenneia && (option.title || '').toLowerCase().includes('postre')
  const argentinaWeekday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
    } catch (err) {
      return new Date().toLocaleDateString('es-AR', { weekday: 'long' })
    }
  }, [])
  const normalizedWeekday = useMemo(
    () => (argentinaWeekday || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    [argentinaWeekday]
  )
  const isGenneiaPostreDay = isGenneia && (normalizedWeekday === 'lunes' || normalizedWeekday === 'miercoles')
  const locations = useMemo(
    () => companyConfig?.locations || COMPANY_LIST[0]?.locations || [],
    [companyConfig]
  )

  const activeOptions = useMemo(
    () => customOptionsLunch.filter(opt => opt.active),
    [customOptionsLunch]
  )

  // Opciones visibles para almuerzo (excluye flags de solo cena)
  const visibleLunchOptions = useMemo(
    () => activeOptions.filter(Boolean),
    [activeOptions]
  )

  const lunchOptionsUI = useMemo(() => {
    return visibleLunchOptions.map(option => {
      const isPostreGroup = isGenneia && option.title?.toLowerCase().includes('postre')
      const helperPostreContent = isPostreGroup ? (
        <>
          Solo elegí <b>Postre del día</b> lunes y miércoles (entrega martes y jueves). El resto de los días marcá <b>Fruta</b>. Los martes, jueves y viernes el postre queda deshabilitado.
        </>
      ) : null
      const choices = (option.options || []).map(opt => {
        const isSelected = customResponses[option.id] === opt
        const isChecked = (customResponses[option.id] || []).includes(opt)
        const isPostreOption = isPostreGroup && opt?.toLowerCase().includes('postre')
        const isDisabled = isPostreOption && !isGenneiaPostreDay
        return {
          value: opt,
          isSelected,
          isChecked,
          isDisabled,
          showUnavailableLabel: isDisabled
        }
      })
        return {
          id: option.id,
          title: option.title,
          required: option.required,
          type: option.type,
          helperPostreContent,
          choices,
          textValue: option.type === 'text' ? (customResponses[option.id] || '') : ''
        }
      })
  }, [visibleLunchOptions, customResponses, isGenneia, isGenneiaPostreDay])

  const dinnerMenuItemsUI = useMemo(() => {
    return menuItems.map(item => {
      const isSelected = !!selectedItemsDinner[item.id]
      const isMain =
        item.name?.toLowerCase().includes('menú principal') ||
        item.name?.toLowerCase().includes('plato principal')
      const hasMainSelected = Object.keys(selectedItemsDinner).some(id => {
        if (!selectedItemsDinner[id]) return false
        const name = (menuItems.find(mi => mi.id === id)?.name || '').toLowerCase()
        return name.includes('menú principal')
      })
      const isDisabled = isMain ? hasMainSelected && !isSelected : false
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        isSelected,
        isDisabled
      }
    })
  }, [menuItems, selectedItemsDinner])

  // Opciones visibles para cena (incluye comunes + solo cena; se vacía si el usuario no tiene cena habilitada)
  const visibleDinnerOptions = useMemo(() => {
    if (!dinnerEnabled) return []
    return customOptionsDinner.filter(opt => opt.active)
  }, [customOptionsDinner, dinnerEnabled])

  // Unificado (evitar duplicados por id)
  const allCustomOptions = useMemo(() => {
    const seen = new Set()
    return [...customOptionsLunch, ...customOptionsDinner].filter(opt => {
      if (!opt?.id) return false
      if (seen.has(opt.id)) return false
      seen.add(opt.id)
      return true
    })
  }, [customOptionsLunch, customOptionsDinner])

  useEffect(() => {
    if (!user?.id) return
    fetchMenuItems()
    fetchCustomOptions()
    checkTodayOrder()
    fetchUserFeatures()
    // Pre-fill user data
    setFormData(prev => ({
      ...prev,
      name: user?.user_metadata?.full_name || '',
      email: user?.email || ''
    }))
  }, [user, rawCompanySlug])

  useEffect(() => {
    // Redirigir a la selección si llega un slug desconocido
    if (companySlugParam && !COMPANY_CATALOG[rawCompanySlug]) {
      navigate('/order', { replace: true })
    }
  }, [companySlugParam, navigate, rawCompanySlug])

  useEffect(() => {
    const defaultLocation = locations[0] || ''
    setFormData(prev => {
      if (!prev.location || !locations.includes(prev.location)) {
        return { ...prev, location: defaultLocation }
      }
      return prev
    })
  }, [locations])

  useEffect(() => {
    if (repeatAppliedRef.current) return
    if (!menuItems.length) return
    const payload = locationState?.state?.repeatPayload
    if (!payload) return

    const draftItems = Array.isArray(payload.items) ? payload.items : []
    const draftResponses = Array.isArray(payload.custom_responses) ? payload.custom_responses : []
    const draftService = (payload.service || 'lunch').toLowerCase()
    const responsesMap = buildResponsesMap(draftResponses)

    if (draftService === 'dinner' && dinnerEnabled && dinnerMenuEnabled) {
      const selectedDinnerMap = mapOrderItemsToSelection(draftItems, menuItems)
      setSelectedItems({})
      setSelectedItemsDinner(selectedDinnerMap)
      setCustomResponsesDinner(responsesMap)
      setSelectedTurns({ lunch: false, dinner: true })
      setMode('dinner')
      if (selectedDinnerMap && Object.keys(selectedDinnerMap).length > 0) {
        clearDinnerOverrideResponses()
      }
    } else {
      const selectedMap = mapOrderItemsToSelection(draftItems, menuItems)
      setSelectedItems(selectedMap)
      setSelectedItemsDinner({})
      setCustomResponses(responsesMap)
      setCustomResponsesDinner({})
      setSelectedTurns({ lunch: true, dinner: false })
      setMode('lunch')
    }

    setFormData(prev => ({
      ...prev,
      comments: payload.comments || '',
      location: payload.location || locations[0] || prev.location
    }))

    repeatAppliedRef.current = true
  }, [locationState, menuItems.length, dinnerEnabled, dinnerMenuEnabled, locations])

  useEffect(() => {
    setCustomResponses({})
  }, [rawCompanySlug])

  useEffect(() => {
    if (success) {
      Sound.playSuccess()
    }
  }, [success])

  useEffect(() => {
    if (!isGenneia) return
    setCustomResponses((prev) => {
      let changed = false
      const updated = { ...prev }

      allCustomOptions.forEach((option) => {
        if (!isGenneiaPostreOption(option)) return

        const current = prev[option.id]
        const isPostreSelected =
          typeof current === 'string' && current.toLowerCase().includes('postre')
        const frutaOption = option.options?.find((opt) => opt?.toLowerCase().includes('fruta'))

        // Forzar fruta cuando no es día de postre o preseleccionar fruta si está vacío
        const shouldForceFruta = !isGenneiaPostreDay && frutaOption
        if (shouldForceFruta && (!current || isPostreSelected)) {
          updated[option.id] = frutaOption
          changed = true
        }
      })

      return changed ? updated : prev
    })
  }, [isGenneia, isGenneiaPostreDay, allCustomOptions])

  const fetchUserFeatures = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await db.getUserFeatures()
      if (!error && Array.isArray(data)) {
        const dinner = data.find(f => f.feature === 'dinner' && f.enabled)
        if (dinner) {
          setDinnerEnabled(true)
        } else {
          const lowerId = (user?.id || '').toLowerCase()
          const lowerEmail = (user?.email || '').toLowerCase()
          const fallback = DINNER_FALLBACK_WHITELIST.has(lowerId) || DINNER_FALLBACK_WHITELIST.has(lowerEmail)
          setDinnerEnabled(fallback)
          if (!fallback) {
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

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await db.getMenuItems()

      if (error) {
        console.error('Error fetching menu:', error)
        // Set default menu items if none exist
        setMenuItems(sortMenuItems([
          { id: 1, name: 'Plato Principal 1', description: 'Delicioso plato principal' },
          { id: 2, name: 'Plato Principal 2', description: 'Otro plato delicioso' },
          { id: 3, name: 'Plato Principal 3', description: 'Plato especial del día' },
          { id: 4, name: 'Plato Principal 4', description: 'Plato vegetariano' },
          { id: 5, name: 'Plato Principal 5', description: 'Plato de la casa' },
          { id: 6, name: 'Plato Principal 6', description: 'Plato recomendado' }
        ]))
      } else {
        setMenuItems(sortMenuItems(data || []))
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchCustomOptions = async () => {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const deliveryDate = tomorrow.toISOString().split('T')[0]

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

      // Filtro defensivo por alcance de comida: asegura que cada opción solo aparezca en el turno elegido
      setCustomOptionsLunch(filterByMealScope(lunchData, 'lunch'))
      setCustomOptionsDinner(filterByMealScope(dinnerData, 'dinner'))
    } catch (err) {
      console.error('Error fetching custom options:', err)
    }
  }

  const handleItemSelect = (itemId, isSelected) => {
    const item = menuItems.find(m => m.id === itemId)
    const isEnsalada = item?.name?.toLowerCase().includes('ensalada')

    if (isSelected) {
      // Si está seleccionando
      if (isEnsalada) {
        // Para ensaladas, solo permitir 1
        setSelectedItems(prev => ({
          ...prev,
          [itemId]: true
        }))
      } else {
        // Para menús principales, verificar si ya hay uno seleccionado
        const mainMenuSelected = menuItems
          .filter(m => !m.name?.toLowerCase().includes('ensalada'))
          .some(m => selectedItems[m.id])

        if (mainMenuSelected && !selectedItems[itemId]) {
          alert('Solo puedes seleccionar 1 menú por persona.')
          return
        }
        setSelectedItems(prev => ({
          ...prev,
          [itemId]: true
        }))
      }
    } else {
      // Si está deseleccionando
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: false
      }))
    }
  }

  const handleItemSelectDinner = (itemId, isSelected) => {
    const item = menuItems.find(m => m.id === itemId)
    if (!item) return
    const anySelected = Object.values(selectedItemsDinner).some(Boolean)

    if (isSelected) {
      // Si ya hay algo elegido (menú u otra opción), bloquear
      if (anySelected && !selectedItemsDinner[itemId]) {
        alert('Solo puedes seleccionar 1 menú por persona en cena.')
        return
      }
      // Limpiar overrides de cena si elige un plato
      clearDinnerOverrideResponses()
      setSelectedItemsDinner(prev => ({ ...prev, [itemId]: true }))
    } else {
      setSelectedItemsDinner(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCustomResponse = (optionId, value, type) => {
    if (type === 'checkbox') {
      // Para checkboxes, mantener un array de valores seleccionados
      setCustomResponses(prev => {
        const current = prev[optionId] || []
        const isChecked = current.includes(value)
        return {
          ...prev,
          [optionId]: isChecked
            ? current.filter(v => v !== value)
            : [...current, value]
        }
      })
      return
    }

    if (type === 'multiple_choice') {
      // Permitir deseleccionar si se hace clic en la opción ya elegida
      setCustomResponses(prev => {
        const current = prev[optionId]
        return {
          ...prev,
          [optionId]: current === value ? null : value
        }
      })
      return
    }

    // Para otros tipos, simplemente guardar el valor
    setCustomResponses(prev => ({
      ...prev,
      [optionId]: value
    }))
  }

  const getSelectedItemsList = () => {
    // Unificar filtro para menú principal
    const selected = menuItems.filter(item => selectedItems[item.id] === true)
    const principal = selected.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal')))
    const others = selected.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))
    return [...principal, ...others]
  }

  const calculateTotal = () => {
    return getSelectedItemsList().length
  }

  const getSelectedItemsListDinner = () => {
    const selected = menuItems.filter(item => selectedItemsDinner[item.id] === true)
    const principal = selected.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal')))
    const others = selected.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))
    return [...principal, ...others]
  }

  const matchesOverrideKeyword = (val = '') => {
    const t = (val || '').toString().toLowerCase()
    return (
      t.includes('mp') ||
      t.includes('mp cena') ||
      t.includes('menú principal') ||
      t.includes('menu principal') ||
      t.includes('menú cena') ||
      t.includes('menu cena') ||
      t.includes('menu de cena') ||
      t.includes('menú de cena') ||
      t.includes('opción cena') ||
      t.includes('veggie') ||
      t.includes('veg') ||
      t.includes('vegetar')
    )
  }

  const isDinnerOverrideValue = (val) => {
    if (Array.isArray(val)) return val.some(v => matchesOverrideKeyword(v))
    return matchesOverrideKeyword(val)
  }

  const clearDinnerOverrideResponses = () => {
    setCustomResponsesDinner(prev => {
      const next = {}
      Object.entries(prev || {}).forEach(([k, v]) => {
        if (!isDinnerOverrideValue(v)) next[k] = v
      })
      return next
    })
  }

  const clearDinnerMenuSelections = () => {
    setSelectedItemsDinner({})
  }

  const getDinnerOverrideChoice = () => {
    // 1) Detectar por respuestas (valor)
    const responses = customResponsesDinner || {}
    for (const value of Object.values(responses)) {
      if (Array.isArray(value)) {
        const match = value.find(v => matchesOverrideKeyword(v))
        if (match) return match
      } else if (matchesOverrideKeyword(value)) {
        return value
      }
    }

    // 2) Detectar por título de la pregunta (por si la opción es Sí/No)
    if (Array.isArray(visibleDinnerOptions)) {
      for (const opt of visibleDinnerOptions) {
        if (!opt || !opt.id) continue
        if (!matchesOverrideKeyword(opt.title || '')) continue

        const resp = responses[opt.id]
        if (Array.isArray(resp) && resp.length > 0) return resp[0]
        if (typeof resp === 'string' && resp.trim() !== '') return resp
      }
    }

    return null
  }

  const hasDinnerOverrideInResponses = (responses = []) => {
    if (!Array.isArray(responses)) return false
    return responses.some(r => {
      if (!r) return false
      const resp = r.response
      if (isDinnerOverrideValue(resp)) return true
      if (matchesOverrideKeyword(r.title || '')) return true
      return false
    })
  }

  const calculateTotalDinner = () => {
    const base = getSelectedItemsListDinner().length
    if (base > 0) return base
    return getDinnerOverrideChoice() ? 1 : 0
  }

  const validateDinnerExclusivity = () => {
    const itemsCount = getSelectedItemsListDinner().length
    const override = getDinnerOverrideChoice()
    if (itemsCount > 0 && override) {
      return 'Para cena elegí menú o la opción adicional (MP/veggie), no ambas.'
    }
    if (itemsCount > 1) {
      return 'Solo un menú por persona en cena.'
    }
    return null
  }

  const hasLunchSelection = selectedTurns.lunch && getSelectedItemsList().length > 0
  const hasDinnerSelection =
    selectedTurns.dinner && dinnerEnabled && dinnerMenuEnabled && (getSelectedItemsListDinner().length > 0 || !!getDinnerOverrideChoice())
  const hasAnySelectedItems = hasLunchSelection || hasDinnerSelection


  const handleRepeatSuggestion = () => {
    if (!suggestion) return

    const suggestionService = (suggestion.service || 'lunch').toLowerCase()
    const isDinnerSuggestion = suggestionService === 'dinner'
    const responsesMap = buildResponsesMap(suggestion.custom_responses || [])
    const hasDinnerOverride = Object.values(responsesMap).some((value) => isDinnerOverrideValue(value))

    if (isGenneia && isDinnerSuggestion) {
      const selectedDinnerMap = mapOrderItemsToSelection(suggestion.items || [], menuItems)
      setSelectedItems({})
      setSelectedItemsDinner(hasDinnerOverride ? {} : selectedDinnerMap)
      setSelectedTurns({ lunch: false, dinner: true })
      setMode('dinner')
      setCustomResponsesDinner(responsesMap)
      setCustomResponses({})
      if (!hasDinnerOverride) {
        clearDinnerOverrideResponses()
      }
    } else {
      const selectedMap = mapOrderItemsToSelection(suggestion.items || [], menuItems)
      setSelectedItems(selectedMap)
      setSelectedItemsDinner({})
      setCustomResponses(responsesMap)
      setCustomResponsesDinner({})
    }

    setFormData(prev => ({
      ...prev,
      comments: suggestion.comments || '',
      location: suggestion.location || locations[0] || prev.location
    }))
    setSuggestionVisible(false)
  }

  const handleDismissSuggestion = () => {
    setSuggestionVisible(false)
    setSuggestion(null)
    setSuggestionSummary('')
    setSuggestionMode('last')
  }

  const isOutsideWindow = () => {
    try {
      const nowBA = new Date(new Date().toLocaleString('en-US', { timeZone: ORDER_TIMEZONE }))
      const hour = nowBA.getHours()
      return hour < ORDER_START_HOUR || hour >= ORDER_CUTOFF_HOUR
    } catch (err) {
      console.error('Error checking cutoff time', err)
      return false
    }
  }


  const handleSubmit = async (e, bypassConfirm = false) => {
    e?.preventDefault()
    if (submitting || submitLockRef.current) return
    setError('')
    if (!user?.id) {
      setError('No se pudo validar el usuario. Intenta nuevamente.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    // Validar ventana horaria (09:00-22:00 BA)
    if (isOutsideWindow()) {
      setError('Pedidos disponibles de 09:00 a 22:00 (hora Buenos Aires). Intenta dentro del horario.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    // Verificar pendientes por turno
    if (pendingLunch && (!dinnerEnabled || !dinnerMenuEnabled || !selectedTurns.dinner)) {
      setError('Ya tienes un pedido de almuerzo pendiente. Espera a que se complete.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }
    if (selectedTurns.dinner && pendingDinner) {
      setError('Ya tienes un pedido de cena pendiente. Espera a que se complete.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    const selectedItemsList = getSelectedItemsList()
    const selectedItemsListDinner = getSelectedItemsListDinner()

    if (!formData.location) {
      setError('Por favor selecciona un lugar de trabajo')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    const lunchSelected = selectedTurns.lunch
    const dinnerSelected = selectedTurns.dinner && dinnerEnabled && dinnerMenuEnabled

    if (!lunchSelected && !dinnerSelected) {
      setError('Selecciona al menos almuerzo o cena.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    if (lunchSelected && selectedItemsList.length === 0) {
      setError('Selecciona al menos un plato para almuerzo.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    const dinnerOverrideChoice = getDinnerOverrideChoice()

    if (dinnerSelected && selectedItemsListDinner.length === 0 && !dinnerOverrideChoice) {
      setError('Selecciona al menos un plato para cena o marca la opción MP/veggie.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    // Validar opciones requeridas visibles
    let customResponsesArray = []
    if (lunchSelected) {
      const missingRequiredOptions = visibleLunchOptions
        .filter(opt => (opt.required || isGenneiaPostreOption(opt)) && !customResponses[opt.id])
        .map(opt => opt.title)

      if (missingRequiredOptions.length > 0) {
        setError(`Por favor completa (almuerzo): ${missingRequiredOptions.join(', ')}`)
        setSubmitting(false)
        submitLockRef.current = false
        return
      }

      customResponsesArray = visibleLunchOptions
        .filter(opt => {
          const response = customResponses[opt.id]
          if (!response) return false
          if (Array.isArray(response) && response.length === 0) return false
          if (typeof response === 'string' && response.trim() === '') return false
          return true
        })
        .map(opt => ({
          id: opt.id,
          title: opt.title,
          response: customResponses[opt.id]
        }))
    }

    let customResponsesDinnerArray = []
    if (dinnerSelected) {
      const missingRequiredOptionsDinner = visibleDinnerOptions
        .filter(opt => (opt.required || isGenneiaPostreOption(opt)) && !customResponsesDinner[opt.id])
        .map(opt => opt.title)
      if (missingRequiredOptionsDinner.length > 0) {
        setError(`Para cena completa: ${missingRequiredOptionsDinner.join(', ')}`)
        setSubmitting(false)
        submitLockRef.current = false
        return
      }
      customResponsesDinnerArray = visibleDinnerOptions
        .filter(opt => {
          const response = customResponsesDinner[opt.id]
          if (!response) return false
          if (Array.isArray(response) && response.length === 0) return false
          if (typeof response === 'string' && response.trim() === '') return false
          return true
        })
        .map(opt => ({
          id: opt.id,
          title: opt.title,
          response: customResponsesDinner[opt.id]
        }))
    }

    // Calcular fecha de entrega (día siguiente)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const deliveryDate = tomorrow.toISOString().split('T')[0]

    const turnosSeleccionados = Object.entries(selectedTurns)
      .filter(([, val]) => val)
      .map(([k]) => k)
      .filter(t => t === 'lunch' || (t === 'dinner' && dinnerEnabled && dinnerMenuEnabled))

    if (dinnerEnabled && dinnerMenuEnabled && turnosSeleccionados.length === 0) {
      setError('Elegí al menos almuerzo o cena.')
      setSubmitting(false)
      submitLockRef.current = false
      return
    }

    if (dinnerSelected) {
      const exclusivityError = validateDinnerExclusivity()
      if (exclusivityError) {
        setError(exclusivityError)
        setSubmitting(false)
        submitLockRef.current = false
        return
      }
    }

    const dinnerItemsForSummary = (dinnerSelected && selectedItemsListDinner.length === 0 && dinnerOverrideChoice)
      ? [{ id: 'dinner-override', name: `Cena: ${dinnerOverrideChoice}`, quantity: 1 }]
      : selectedItemsListDinner

    const confirmationData = {
      company: companyConfig?.name || '',
      location: formData.location,
      name: formData.name || user?.user_metadata?.full_name || user?.email || '',
      email: formData.email || user?.email || '',
      phone: formData.phone || '',
      deliveryDate,
      turnos: turnosSeleccionados,
      lunchSelected,
      dinnerSelected,
      lunchItems: selectedItemsList,
      dinnerItems: dinnerItemsForSummary,
      lunchOptions: customResponsesArray,
      dinnerOptions: customResponsesDinnerArray,
      comments: formData.comments || '',
      totals: {
        lunch: lunchSelected ? calculateTotal() : 0,
        dinner: dinnerSelected ? (dinnerItemsForSummary?.length || 0) : 0
      }
    }

    if (!bypassConfirm) {
      setConfirmData(confirmationData)
      setConfirmOpen(true)
      return
    }

    submitLockRef.current = true
    setSubmitting(true)

    let hasSubmitError = false

    try {
      for (const service of turnosSeleccionados) {
        const isDinner = service === 'dinner'
        const overrideChoice = isDinner ? getDinnerOverrideChoice() : null
        const itemsForService = isDinner ? selectedItemsListDinner : selectedItemsList
        const responsesForService = isDinner ? customResponsesDinnerArray : customResponsesArray

        if (isDinner) {
          const hasOverride = hasDinnerOverrideInResponses(responsesForService)
          if (itemsForService.length > 0 && hasOverride) {
            setError('Para cena elegí menú o la opción adicional (MP/veggie), no ambas.')
            setSubmitting(false)
            hasSubmitError = true
            break
          }
          if (itemsForService.length > 1) {
            setError('Solo un menú por persona en cena.')
            setSubmitting(false)
            hasSubmitError = true
            break
          }
        }
        const itemsToSend = (isDinner && overrideChoice && itemsForService.length === 0)
          ? [{ id: 'dinner-override', name: `Cena: ${overrideChoice}`, quantity: 1 }]
          : itemsForService

        const normalizedItemsToSend = itemsToSend.map(item => ({
          ...item,
          name: buildOrderItemLabel(item),
          quantity: 1
        }))

        const idempotencySignature = computePayloadSignature(
          normalizedItemsToSend,
          responsesForService,
          formData.comments,
          deliveryDate,
          formData.location,
          service
        )

        const idempotencyStorageKey = buildIdempotencyStorageKey(
          itemsForService,
          formData.location,
          idempotencySignature,
          service,
          user?.id || 'anon'
        )
        let idempotencyKey = null

        if (typeof window !== 'undefined') {
          const existingKey = sessionStorage.getItem(idempotencyStorageKey)
          idempotencyKey = existingKey || generateIdempotencyKey()
          sessionStorage.setItem(idempotencyStorageKey, idempotencyKey)
        } else {
          idempotencyKey = generateIdempotencyKey()
        }

          const orderData = {
            user_id: user.id,
            location: formData.location,
            customer_name: formData.name || user?.user_metadata?.full_name || user?.email || '',
            customer_email: formData.email || user?.email,
            customer_phone: formData.phone,
            items: normalizedItemsToSend.map(item => ({
              id: item.id,
              name: item.name,
              quantity: 1
            })),
            comments: formData.comments,
            delivery_date: deliveryDate,
            status: 'pending',
            total_items: service === 'dinner' ? calculateTotalDinner() : calculateTotal(),
            custom_responses: responsesForService,
            idempotency_key: idempotencyKey,
            service
          }

        const { error } = await ordersService.createOrder(orderData)

        if (error) {
          hasSubmitError = true
          let msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
          if (msg.includes('dinner') || msg.toLowerCase().includes('service') || msg.includes('feature')) {
            setError('No tenés habilitada la cena. Deja solo almuerzo o pedí alta a un admin.')
            setSelectedTurns({ lunch: true, dinner: false })
            break
          } else if (msg.includes('violates row-level security policy') || 
              msg.includes('new row violates row-level security')) {
            setError('Ya tienes un pedido pendiente. Espera a que se complete para crear uno nuevo.')
            break
          } else {
            setError('Error al crear el pedido: ' + msg)
            break
          }
        }
      }

      if (!hasSubmitError) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (err) {
      // Mostrar el error real si ocurre una excepción
      setError('Error al crear el pedido: ' + (err?.message || JSON.stringify(err)))
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const handleConfirmSubmit = () => {
    setConfirmOpen(false)
    handleSubmit(null, true)
  }

  if (success) {
    return (
      <RequireUser user={user} loading={loading}>
        <OrderSuccessScreen />
      </RequireUser>
    )
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div
        className="p-3 sm:p-6 min-h-dvh flex flex-col"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-4 flex-1">
              <OrderFormHeader companyName={companyConfig.name} isGenneia={isGenneia} />
              {!hasOrderToday && <OrderHoursBanner />}

            </div>
              
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Sugerencias inteligentes */}
              <OrderSuggestionPanel
                suggestionVisible={suggestionVisible}
                suggestion={suggestion}
                suggestionMode={suggestionMode}
                suggestionSummary={suggestionSummary}
                suggestionLoading={suggestionLoading}
                onRepeat={handleRepeatSuggestion}
                onDismiss={handleDismissSuggestion}
              />
              {/* Información Personal */}
              <OrderPersonalInfoSection
                formData={formData}
                locations={locations}
                onChange={handleFormChange}
              />

              {/* Selección de Menú */}
              <OrderLunchMenuSection
                items={[
                  ...menuItems.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))),
                  ...menuItems.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))
                ]}
                selectedItems={selectedItems}
                onToggleItem={handleItemSelect}
              />

              {/* Resumen del Pedido */}
              <OrderLunchSummary
                items={getSelectedItemsList()}
                total={calculateTotal()}
                onRemove={(itemId) => handleItemSelect(itemId, false)}
              />

              {/* Opciones Personalizadas - Solo mostrar opciones activas */}
              {lunchOptionsUI.length > 0 && (
                <OrderLunchOptionsSection
                  options={lunchOptionsUI}
                  companyName={companyConfig.name}
                  onCustomResponse={handleCustomResponse}
                />
              )}

              {dinnerEnabled && dinnerMenuEnabled && (
                <OrderTurnSelector
                  selectedTurns={selectedTurns}
                  onToggleLunch={() => setSelectedTurns(prev => ({ ...prev, lunch: !prev.lunch }))}
                  onToggleDinner={() => setSelectedTurns(prev => ({ ...prev, dinner: !prev.dinner }))}
                />
              )}

              {dinnerEnabled && dinnerMenuEnabled && selectedTurns.dinner && (
                <div className="space-y-4">
                  <OrderDinnerMenuSection
                    items={dinnerMenuItemsUI}
                    total={calculateTotalDinner()}
                    onToggleItem={handleItemSelectDinner}
                  />

                  {visibleDinnerOptions.length > 0 && (
                    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
                          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Opciones adicionales (cena)</h2>
                          <p className="text-sm sm:text-base text-gray-700 font-semibold">Mismo catálogo, responde para la cena.</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {visibleDinnerOptions.map((option) => (
                          <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-amber-50">
                            <label
                              className="block text-base sm:text-lg text-gray-900 mb-3 font-bold"
                              htmlFor={option.type === 'text' ? `dinner-custom-option-${option.id}` : undefined}
                            >
                              {option.title}
                              {option.required && <span className="text-red-600 ml-1">*</span>}
                            </label>

                            {option.type === 'multiple_choice' && option.options && (
                              <div className="space-y-2">
                                {option.options.map((opt, index) => {
                                  const isSelected = customResponsesDinner[option.id] === opt
                                  return (
                                    <button
                                      key={index}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => {
                                        const value = opt
                                        if (isDinnerOverrideValue(value)) {
                                          clearDinnerMenuSelections()
                                        }
                                        setCustomResponsesDinner(prev => {
                                          if (isDinnerOverrideValue(value)) {
                                            const next = {}
                                            Object.entries(prev || {}).forEach(([k, v]) => {
                                              if (!isDinnerOverrideValue(v)) next[k] = v
                                            })
                                            next[option.id] = value
                                            return next
                                          }
                                          return { ...prev, [option.id]: prev[option.id] === value ? null : value }
                                        })
                                      }}
                                      className={`w-full text-left p-3 border-2 rounded-lg transition-all
                                        focus:outline-none focus:ring-2 focus:ring-blue-400
                                        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-base sm:text-lg text-gray-900 font-semibold">{opt}</span>
                                        {isSelected && (
                                          <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}

                      {option.type === 'checkbox' && option.options && (
                        <div className="space-y-2">
                          {option.options.map((opt, index) => {
                            const list = customResponsesDinner[option.id] || []
                            const isChecked = list.includes(opt)
                            return (
                              <button
                                key={index}
                                type="button"
                                aria-pressed={isChecked}
                                onClick={() => {
                                  setCustomResponsesDinner(prev => {
                                    const current = prev[option.id] || []
                                    return {
                                      ...prev,
                                      [option.id]: isChecked
                                        ? current.filter(v => v !== opt)
                                        : [...current, opt]
                                    }
                                  })
                                }}
                                className={`w-full text-left p-3 border-2 rounded-lg transition-all
                                  focus:outline-none focus:ring-2 focus:ring-blue-400
                                  ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-base sm:text-lg text-gray-900 font-semibold">{opt}</span>
                                  {isChecked && (
                                    <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {option.type === 'text' && (
                        <textarea
                          id={`dinner-custom-option-${option.id}`}
                          value={customResponsesDinner[option.id] || ''}
                          onChange={(e) => setCustomResponsesDinner(prev => ({ ...prev, [option.id]: e.target.value }))}
                          className="input-field"
                          placeholder="Escribe tu respuesta para la cena..."
                          style={{ fontWeight: '600' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información Adicional */}
        <OrderCommentsSection comments={formData.comments} onCommentsChange={handleFormChange} />

        <OrderErrorBanner error={error} />

        {/* Botón de confirmación - SIEMPRE visible al fondo, nunca fijo en mobile */}
        <div className="w-full bg-linear-to-t from-white via-white to-white/95 sm:bg-transparent p-4 sm:p-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none border-t-2 sm:border-t-0 border-gray-200 flex justify-center sm:mt-6 z-40"
          style={{
            position: 'relative',
            bottom: 'auto',
            left: 'auto',
            right: 'auto',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
          <button
            type="submit"
            onClick={() => {
              Sound.primeSuccess()
            }}
            disabled={loading || submitting || !hasAnySelectedItems || hasOrderToday}
            style={{ 
              backgroundColor: '#16a34a',
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              WebkitAppearance: 'none'
            }}
            className="w-full sm:w-auto hover:bg-green-700 font-black py-5 px-8 rounded-xl shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-2xl border-2 border-green-600"
          >
            {(loading || submitting) ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Creando pedido...</span>
              </>
            ) : hasOrderToday ? (
              <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Ya tienes un pedido pendiente</span>
            ) : (
              <>
                <ShoppingCart className="h-6 w-6 mr-3" style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2 }} />
                <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Confirmar Pedido</span>
              </>
            )}
          </button>
        </div>
        </form>
      </div>

      {confirmOpen && confirmData && (
        <OrderConfirmModal
          open={confirmOpen}
          confirmData={confirmData}
          submitting={submitting}
          onClose={() => {
            setConfirmOpen(false)
            setConfirmData(null)
          }}
          onConfirm={handleConfirmSubmit}
          formatResponseValue={formatResponseValue}
        />
      )}
    </RequireUser>
  )
}

export default OrderForm
