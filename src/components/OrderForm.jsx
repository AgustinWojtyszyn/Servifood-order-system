import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ordersService } from '../services/orders'
import { ShoppingCart, X, ChefHat, User, Settings, Clock, Building2, CheckCircle } from 'lucide-react'
import RequireUser from './RequireUser'
import { COMPANY_CATALOG, COMPANY_LIST } from '../constants/companyConfig'
import { Sound } from '../utils/Sound'

const ORDER_START_HOUR = 9  // 09:00 apertura
const ORDER_CUTOFF_HOUR = 22 // 22:00 cierre
const ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'
const REPEAT_ORDER_STORAGE_KEY = 'repeat-order-draft'

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
  const submitLockRef = useRef(false)
  const repeatAppliedRef = useRef(false)
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    // Por defecto mostrar menú de cena si no hay preferencia previa
    return stored === null ? true : stored === 'true'
  })
  const navigate = useNavigate()
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

        const repeatCandidate = findRepeatCandidate(data)
        if (repeatCandidate) {
          setSuggestion(repeatCandidate)
          setSuggestionMode('repeat')
          setSuggestionVisible(true)
          setSuggestionSummary(buildRepeatSummary(repeatCandidate))
          return
        }

        const latestOrder = getLatestOrder(data)
        if (latestOrder) {
          setSuggestion(latestOrder)
          setSuggestionMode('last')
          setSuggestionVisible(true)
          setSuggestionSummary(buildSuggestionSummary(latestOrder))
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

  const normalizeDraftList = (value) => {
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

  const extractNumber = (name = '') => {
    const match = name.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : Infinity
  }

  const isMainMenu = (name = '') => {
    const normalized = name.toLowerCase()
    return normalized.includes('menú principal') || normalized.includes('menu principal') || normalized.includes('plato principal')
  }

  const sortMenuItems = (items) => {
    return [...items].sort((a, b) => {
      const aMain = isMainMenu(a.name)
      const bMain = isMainMenu(b.name)
      if (aMain !== bMain) return aMain ? -1 : 1

      const aNum = extractNumber(a.name)
      const bNum = extractNumber(b.name)
      const aHasNum = Number.isFinite(aNum) && aNum !== Infinity
      const bHasNum = Number.isFinite(bNum) && bNum !== Infinity

      if (aHasNum && bHasNum) return aNum - bNum
      if (aHasNum !== bHasNum) return aHasNum ? -1 : 1

      return (a.name || '').localeCompare(b.name || '')
    })
  }

  const buildOrderItemLabel = (item = {}) => {
    const baseName = (item?.name || '').trim()
    if (!baseName) return 'Item'
    const description = (item?.description || '').trim()
    if (!description) return baseName

    const normalized = baseName.toLowerCase()
    const isGenericMenu =
      normalized.includes('menú principal') ||
      normalized.includes('menu principal') ||
      normalized.includes('plato principal') ||
      /^opci[oó]n\s*\d+$/i.test(baseName)

    return isGenericMenu ? `${baseName} - ${description}` : baseName
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

  const computePayloadSignature = (items = [], responses = [], comments = '', deliveryDate = '', location = '', service = 'lunch') => {
    const sortedItems = [...(items || [])].map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity || 1
    })).sort((a, b) => (a.id || '').toString().localeCompare((b.id || '').toString()))

    const sortedResponses = [...(responses || [])].map(r => ({
      id: r.id,
      title: r.title,
      response: r.response
    })).sort((a, b) => (a.id || '').toString().localeCompare((b.id || '').toString()))

    const normalized = {
      location: (location || '').trim().toLowerCase(),
      items: sortedItems,
      responses: sortedResponses,
      comments: comments || '',
      deliveryDate: deliveryDate || '',
      service: (service || '').toLowerCase()
    }

    const json = JSON.stringify(normalized)
    let hash = 0
    for (let i = 0; i < json.length; i++) {
      hash = (hash * 31 + json.charCodeAt(i)) >>> 0
    }
    return hash.toString(16)
  }

  const buildIdempotencyStorageKey = (items = [], location = '', signature = '', service = 'lunch') => {
    const userPart = user?.id || 'anon'
    const itemsPart = (items || []).map(item => item.id).filter(Boolean).sort().join('-') || 'no-items'
    const locationPart = (location || 'no-location').toString().trim().toLowerCase().replace(/\s+/g, '-')
    const servicePart = (service || 'lunch').toLowerCase()
    const signaturePart = signature || 'no-signature'
    return `order-idempotency-${userPart}-${locationPart}-${servicePart}-${itemsPart}-${signaturePart}`
  }

  const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const buildSuggestionSummary = (order) => {
    if (!order) return ''
    const items = Array.isArray(order.items) ? order.items : []
    const list = items.map(i => `${i.name || 'Item'}${i.quantity ? ` (x${i.quantity})` : ''}`).join(', ')
    const loc = order.location ? ` en ${order.location}` : ''
    return list ? `${list}${loc}` : `Pedido anterior${loc}`
  }

  const buildOptionsSummary = (responses = []) => {
    const list = Array.isArray(responses) ? responses : []
    const parts = []
    list.forEach(resp => {
      if (!resp) return
      const value = resp.response ?? resp.answer ?? resp.value ?? resp.options
      if (Array.isArray(value) && value.length > 0) {
        parts.push(`${resp.title || 'Opcion'}: ${value.join(', ')}`)
        return
      }
      if (typeof value === 'string' && value.trim() !== '') {
        parts.push(`${resp.title || 'Opcion'}: ${value}`)
      }
    })

    if (!parts.length) return ''
    if (parts.length <= 2) return parts.join(' | ')
    return `${parts.slice(0, 2).join(' | ')} +${parts.length - 2} mas`
  }

  const buildRepeatSummary = (order) => {
    if (!order) return ''
    const items = Array.isArray(order.items) ? order.items : []
    const itemText = items
      .map(i => `${i.name || 'Item'}${i.quantity ? ` (x${i.quantity})` : ''}`)
      .join(', ')
    const optionsText = buildOptionsSummary(order.custom_responses)
    if (itemText && optionsText) return `Menu: ${itemText} | Opciones: ${optionsText}`
    if (itemText) return `Menu: ${itemText}`
    if (optionsText) return `Opciones: ${optionsText}`
    return 'Pedido anterior'
  }

  const mapOrderItemsToSelection = (items = []) => {
    const selectedMap = {}
    items.forEach(it => {
      const byId = menuItems.find(m => m.id === it.id)
      if (byId) {
        selectedMap[byId.id] = true
        return
      }
      const byName = menuItems.find(m => m.name?.toLowerCase() === (it.name || '').toLowerCase())
      if (byName) {
        selectedMap[byName.id] = true
      }
    })
    return selectedMap
  }

  const buildResponsesMap = (responses = []) => {
    const map = {}
    responses.forEach((resp) => {
      if (!resp) return
      const key = resp.id || resp.option_id || resp.optionId
      if (!key) return
      const value = resp.response ?? resp.answer ?? resp.value ?? resp.options
      map[key] = value
    })
    return map
  }

  const normalizeValueForSignature = (value) => {
    if (Array.isArray(value)) {
      return value.map(v => `${v}`.trim().toLowerCase()).sort().join(',')
    }
    if (value === null || value === undefined) return ''
    return `${value}`.trim().toLowerCase()
  }

  const buildOrderSignature = (order = {}) => {
    const normalizedItems = (Array.isArray(order.items) ? order.items : [])
      .map(i => ({
        id: i?.id || '',
        name: (i?.name || '').toString().trim().toLowerCase(),
        quantity: i?.quantity || 1
      }))
      .sort((a, b) => `${a.id}-${a.name}`.localeCompare(`${b.id}-${b.name}`))

    const normalizedResponses = (Array.isArray(order.custom_responses) ? order.custom_responses : [])
      .map(r => ({
        title: (r?.title || '').toString().trim().toLowerCase(),
        response: normalizeValueForSignature(r?.response ?? r?.answer ?? r?.value ?? r?.options)
      }))
      .sort((a, b) => `${a.title}-${a.response}`.localeCompare(`${b.title}-${b.response}`))

    const normalized = {
      items: normalizedItems,
      responses: normalizedResponses,
      service: (order.service || 'lunch').toString().trim().toLowerCase(),
      location: (order.location || '').toString().trim().toLowerCase()
    }

    const json = JSON.stringify(normalized)
    let hash = 0
    for (let i = 0; i < json.length; i++) {
      hash = (hash * 31 + json.charCodeAt(i)) >>> 0
    }
    return hash.toString(16)
  }

  const getLatestOrder = (orders = []) => {
    if (!Array.isArray(orders) || orders.length === 0) return null
    const valid = orders.filter(o => (o?.status || '').toLowerCase() !== 'cancelled')
    if (valid.length === 0) return null
    return [...valid].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  const findRepeatCandidate = (orders = []) => {
    if (!Array.isArray(orders) || orders.length === 0) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - 2)

    const recent = orders.filter(order => {
      if (!order?.created_at) return false
      if ((order?.status || '').toLowerCase() === 'cancelled') return false
      const date = new Date(order.created_at)
      date.setHours(0, 0, 0, 0)
      return date >= start && date <= today
    })

    if (recent.length < 3) return null

    const groups = new Map()
    recent.forEach(order => {
      const sig = buildOrderSignature(order)
      if (!sig) return
      const dayKey = new Date(order.created_at).toISOString().split('T')[0]
      if (!groups.has(sig)) {
        groups.set(sig, { days: new Set(), latest: order })
      }
      const entry = groups.get(sig)
      entry.days.add(dayKey)
      if (new Date(order.created_at) > new Date(entry.latest.created_at)) {
        entry.latest = order
      }
    })

    const candidate = Array.from(groups.values())
      .filter(entry => entry.days.size >= 3)
      .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))[0]

    return candidate ? candidate.latest : null
  }

  const handleRepeatSuggestion = () => {
    if (!suggestion) return

    const suggestionService = (suggestion.service || 'lunch').toLowerCase()
    const isDinnerSuggestion = suggestionService === 'dinner'
    const responsesMap = buildResponsesMap(suggestion.custom_responses || [])
    const hasDinnerOverride = Object.values(responsesMap).some((value) => isDinnerOverrideValue(value))

    if (isGenneia && isDinnerSuggestion) {
      const selectedDinnerMap = mapOrderItemsToSelection(suggestion.items || [])
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
      const selectedMap = mapOrderItemsToSelection(suggestion.items || [])
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

  useEffect(() => {
    if (repeatAppliedRef.current) return
    if (!user?.id) return
    if (!menuItems.length) return

    let draft = null
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(REPEAT_ORDER_STORAGE_KEY)
      if (!raw) return
      try {
        draft = JSON.parse(raw)
      } catch {
        sessionStorage.removeItem(REPEAT_ORDER_STORAGE_KEY)
        return
      }
    }

    if (!draft) return

    const draftItems = normalizeDraftList(draft.items)
    const draftResponses = normalizeDraftList(draft.custom_responses)
    const draftService = (draft.service || 'lunch').toLowerCase()
    const responsesMap = buildResponsesMap(draftResponses)

    if (draftService === 'dinner' && dinnerEnabled && dinnerMenuEnabled) {
      const selectedDinnerMap = mapOrderItemsToSelection(draftItems)
      setSelectedItems({})
      setSelectedItemsDinner(selectedDinnerMap)
      setCustomResponsesDinner(responsesMap)
      setSelectedTurns({ lunch: false, dinner: true })
      setMode('dinner')
      if (selectedDinnerMap && Object.keys(selectedDinnerMap).length > 0) {
        clearDinnerOverrideResponses()
      }
    } else {
      const selectedMap = mapOrderItemsToSelection(draftItems)
      setSelectedItems(selectedMap)
      setSelectedItemsDinner({})
      setCustomResponses(responsesMap)
      setCustomResponsesDinner({})
      setSelectedTurns({ lunch: true, dinner: false })
      setMode('lunch')
    }

    setFormData(prev => ({
      ...prev,
      comments: draft.comments || '',
      location: draft.location || locations[0] || prev.location
    }))

    setSuggestionVisible(false)
    setSuggestion(null)
    setSuggestionSummary('')
    setSuggestionMode('last')

    repeatAppliedRef.current = true
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REPEAT_ORDER_STORAGE_KEY)
    }
  }, [user?.id, menuItems.length, locations, dinnerEnabled, dinnerMenuEnabled])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
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

        const idempotencyStorageKey = buildIdempotencyStorageKey(itemsForService, formData.location, idempotencySignature, service)
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

  if (success) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="p-3 sm:p-6 flex items-center justify-center min-h-dvh">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 rounded-full bg-green-100">
                  <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">¡Pedido creado exitosamente!</h2>
              <p className="text-base sm:text-lg text-green-700">Tu pedido ha sido registrado y será procesado pronto.</p>
              <p className="text-xs sm:text-sm text-green-600 mt-2">Redirigiendo al panel principal...</p>
            </div>
          </div>
        </div>
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
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/15 border-2 border-white/30 shadow-lg text-white mb-3">
                  <Building2 className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide">Empresa seleccionada</p>
                    <p className="text-base sm:text-lg font-bold">{companyConfig.name}</p>
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2 sm:mb-3">Nuevo Pedido</h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold drop-shadow-lg">Seleccioná tu menú y completa tus datos</p>
                <p className="text-base sm:text-lg text-white/90 mt-1 sm:mt-2">¡Es rápido y fácil!</p>
                <div className="mt-4 mx-auto max-w-2xl">
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-lg shadow text-yellow-900 text-sm sm:text-base">
                    <strong>Importante:</strong> No realices <b>pedidos de prueba</b>. Todos los pedidos se contabilizan para el día siguiente y serán preparados. Si necesitas cancelar un pedido, hazlo desde la aplicación o comunícate por WhatsApp dentro de los <b>15 minutos</b> posteriores a haberlo realizado.
                  </div>
                  {isGenneia && (
                    <div className="mt-3 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg shadow text-amber-900 text-sm sm:text-base">
                      <strong>Postre Genneia:</strong> Elegí <b>Postre del día</b> solo los <b>lunes y miércoles</b> (entrega martes y jueves). El resto de los días <b>marcá siempre Fruta</b> como opción (martes, jueves y viernes).
                    </div>
                  )}
                </div>
              </div>
              {!hasOrderToday && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 sm:p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm sm:text-base text-blue-800 font-medium">
                        Horario de pedidos: <strong>09:00 a 22:00</strong> (hora Buenos Aires)
                      </p>
                      <p className="text-xs sm:text-sm text-blue-700 mt-1">
                        Si necesitas realizar cambios, presiona el botón <strong>"¿Necesitas ayuda?"</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sugerencias inteligentes */}
              {suggestionVisible && suggestion && (
                <div className={`bg-white border-2 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-3 ${
                  suggestionMode === 'repeat' ? 'border-blue-300' : 'border-green-300'
                }`}>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      {suggestionMode === 'repeat' ? (
                        <>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Repetir pedido</p>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            Has seleccionado: <span className="text-blue-700">{suggestionSummary || '-'}</span>
                          </h3>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Sugerencias inteligentes</p>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            La ultima vez pediste: <span className="text-green-700">{suggestionSummary || '-'}</span>
                          </h3>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleDismissSuggestion}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Cerrar sugerencia"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {suggestionMode === 'repeat' ? (
                    <p className="text-sm text-gray-700">en los ultimos 3 dias. Deseas repetir el pedido?</p>
                  ) : (
                    <p className="text-sm text-gray-700">Quieres repetirlo?</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleRepeatSuggestion}
                      className={`px-4 py-2 rounded-lg text-white font-bold shadow ${
                        suggestionMode === 'repeat' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Repetir pedido
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissSuggestion}
                      className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold shadow"
                    >
                      No, hacer uno nuevo
                    </button>
                  </div>
                  {suggestionLoading && (
                    <p className="text-xs text-gray-500">Cargando sugerencia...</p>
                  )}
                </div>
              )}
            </div>
              
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Información Personal */}
              <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="bg-linear-to-r from-primary-600 to-primary-700 text-white p-2 sm:p-3 rounded-xl">
                    <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Información Personal</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="location" className="block text-sm font-bold text-gray-700 mb-2">
                      Lugar de trabajo *
                    </label>
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="organization"
                    >
                      <option value="">Seleccionar lugar</option>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                      Correo electrónico *
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="input-field"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

{/* Selección de Menú */}
<div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
  <div className="flex items-center gap-3 mb-6">
    <div className="bg-linear-to-r from-secondary-500 to-secondary-600 text-white p-3 rounded-xl">
      <ChefHat className="h-6 w-6" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Seleccioná tu Menú</h2>
      <p className="text-sm text-gray-600 font-semibold mt-1">
        Elegí uno o más platos disponibles
      </p>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...menuItems.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))),
      ...menuItems.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))].map((item) => {
      const isSelected = selectedItems[item.id] === true
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleItemSelect(item.id, !isSelected)}
          aria-pressed={isSelected}
          className={`card text-left bg-white border-2 rounded-2xl p-5
                     transition-all duration-300 flex flex-col justify-between min-h-[260px] cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-blue-400
                     ${isSelected ? 'border-blue-500 bg-blue-50/60 shadow-xl' : 'border-gray-200 hover:border-blue-400 hover:shadow-xl'}`}
        >
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">
              {item.name}
            </h3>

            {item.description && (
              <p className="text-lg text-gray-800 leading-snug font-medium">
                {item.description}
              </p>
            )}
          </div>

          <div className="flex justify-end mt-6 min-h-[36px]">
            {isSelected && (
              <span className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                <CheckCircle className="h-8 w-8" />
                Seleccionado
              </span>
            )}
          </div>
        </button>
      )
    })}
  </div>
</div>

        {/* Resumen del Pedido */}
        {getSelectedItemsList().length > 0 && (
          <div className="card bg-linear-to-br from-green-50 to-emerald-50 backdrop-blur-sm shadow-xl border-2 border-green-300">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-linear-to-r from-green-600 to-emerald-600 text-white p-2 sm:p-3 rounded-xl">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen del Pedido</h2>
                <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Revisa tu selección antes de confirmar</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              {getSelectedItemsList().map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between sm:justify-start">
                    {/* TEXTO MÁS GRANDE EN EL RESUMEN */}
                    <span className="font-medium text-gray-900 text-lg sm:text-xl">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(item.id, false)}
                      className="ml-2 p-1 rounded-full hover:bg-red-100 text-red-600"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                  <span className="text-gray-600 text-base sm:text-lg">Seleccionado</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex justify-between items-center text-lg sm:text-xl font-semibold">
                <span>Total de items:</span>
                <span>{calculateTotal()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Opciones Personalizadas - Solo mostrar opciones activas */}
        {visibleLunchOptions.length > 0 && (
          <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-linear-to-r from-purple-600 to-purple-700 text-white p-2 sm:p-3 rounded-xl">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Opciones Adicionales</h2>
                <p style={{ fontWeight: '900' }} className="text-xs sm:text-sm text-gray-900 mt-1">Personaliza tu pedido</p>
                <p className="text-[11px] sm:text-xs text-gray-600 font-semibold">
                  Solo mostramos las opciones activas para {companyConfig.name}.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {visibleLunchOptions.map((option) => (
                <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-gray-50">
                  <label
                    className="block text-sm text-gray-900 mb-3"
                    style={{ fontWeight: '900' }}
                    htmlFor={option.type === 'text' ? `custom-option-${option.id}` : undefined}
                  >
                    {option.title}
                    {option.required && <span className="text-red-600 ml-1">*</span>}
                  </label>
                  {isGenneia && option.title?.toLowerCase().includes('postre') && (
                    <div className="mb-3 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2">
                      Solo elegí <b>Postre del día</b> lunes y miércoles (entrega martes y jueves). El resto de los días marcá <b>Fruta</b>. Los martes, jueves y viernes el postre queda deshabilitado.
                    </div>
                  )}

                  {option.type === 'multiple_choice' && option.options && (
                    <div className="space-y-2">
                      {option.options.map((opt, index) => {
                        const isSelected = customResponses[option.id] === opt
                        const isPostreOption =
                          isGenneia &&
                          option.title?.toLowerCase().includes('postre') &&
                          opt?.toLowerCase().includes('postre')
                        const disablePostre = isPostreOption && !isGenneiaPostreDay
                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={disablePostre}
                            aria-pressed={isSelected}
                            onClick={() => {
                              if (disablePostre) return
                              handleCustomResponse(option.id, opt, 'multiple_choice')
                            }}
                            className={`w-full text-left p-3 border-2 rounded-lg transition-all
                              focus:outline-none focus:ring-2 focus:ring-blue-400
                              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}
                              ${disablePostre ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`text-sm ${disablePostre ? 'text-gray-400' : 'text-gray-900'}`}
                                style={{ fontWeight: '900' }}
                              >
                                {opt}
                                {disablePostre && ' (no disponible hoy)'}
                              </span>
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
                        const isChecked = (customResponses[option.id] || []).includes(opt)
                        return (
                          <button
                            key={index}
                            type="button"
                            aria-pressed={isChecked}
                            onClick={() => handleCustomResponse(option.id, opt, 'checkbox')}
                            className={`w-full text-left p-3 border-2 rounded-lg transition-all
                              focus:outline-none focus:ring-2 focus:ring-blue-400
                              ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-gray-900" style={{ fontWeight: '900' }}>{opt}</span>
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
                      id={`custom-option-${option.id}`}
                      name={`custom-option-${option.id}`}
                      value={customResponses[option.id] || ''}
                      onChange={(e) => handleCustomResponse(option.id, e.target.value, 'text')}
                      rows={3}
                      className="input-field"
                      placeholder="Escribe tu respuesta aquí..."
                      style={{ fontWeight: '600' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {dinnerEnabled && dinnerMenuEnabled && (
          <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Turnos del pedido</h2>
                <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Selecciona qué turnos querés pedir hoy.</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                aria-pressed={selectedTurns.lunch}
                onClick={() => setSelectedTurns(prev => ({ ...prev, lunch: !prev.lunch }))}
                className={`w-full text-left p-4 border-2 rounded-xl transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${selectedTurns.lunch ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm sm:text-base text-gray-900 font-semibold">Almuerzo</span>
                  {selectedTurns.lunch && (
                    <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
                  )}
                </div>
              </button>
              <button
                type="button"
                aria-pressed={selectedTurns.dinner}
                onClick={() => setSelectedTurns(prev => ({ ...prev, dinner: !prev.dinner }))}
                className={`w-full text-left p-4 border-2 rounded-xl transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${selectedTurns.dinner ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm sm:text-base text-gray-900 font-semibold">Cena (solo whitelist)</span>
                  {selectedTurns.dinner && (
                    <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
                  )}
                </div>
              </button>
              <p className="text-xs text-gray-600">Puedes pedir uno o ambos. Si marcas ambos, se abrirá el formulario de cena completo debajo.</p>
            </div>
          </div>
        )}

        {dinnerEnabled && dinnerMenuEnabled && selectedTurns.dinner && (
          <div className="space-y-4">
            <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Menú de cena</h2>
                  <p className="text-sm sm:text-base text-gray-700 font-semibold mt-1">Selecciona tu plato para la cena (whitelist).</p>
                </div>
              </div>
              <div className="space-y-3">
                {menuItems.map((item) => {
                  const isSelected = selectedItemsDinner[item.id]
                  const isDisabled = item.name?.toLowerCase().includes('menú principal') || item.name?.toLowerCase().includes('plato principal')
                    ? Object.keys(selectedItemsDinner).some(id => selectedItemsDinner[id] && (menuItems.find(mi => mi.id === id)?.name || '').toLowerCase().includes('menú principal')) && !isSelected
                    : false
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isDisabled}
                      aria-pressed={!!isSelected}
                      onClick={() => {
                        if (isDisabled) return
                        handleItemSelectDinner(item.id, !isSelected)
                      }}
                      className={`w-full text-left p-4 border-2 rounded-xl transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}
                        ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base sm:text-lg font-semibold text-gray-900">{item.name}</p>
                          {item.description && <p className="text-sm sm:text-base text-gray-700">{item.description}</p>}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3">
                <div className="flex justify-between items-center text-lg sm:text-xl font-semibold">
                  <span>Total de items (cena):</span>
                  <span>{calculateTotalDinner()}</span>
                </div>
              </div>
            </div>

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
        <div className="card">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Información Adicional</h2>

          <div>
            <label htmlFor="additional-comments" className="block text-sm font-bold text-gray-700 mb-2">
              Comentarios adicionales
            </label>
            <textarea
              id="additional-comments"
              name="comments"
              value={formData.comments}
              onChange={handleFormChange}
              rows={4}
              className="input-field"
              placeholder="Instrucciones especiales, alergias, etc."
            />
          </div>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>📅 Fecha de entrega:</strong> Todos los pedidos se entregan al día siguiente
            </p>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-50 border-2 border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base flex items-start gap-2 shadow-md w-full"
            role="alert"
            aria-live="assertive"
          >
            <span className="mt-0.5 text-red-600">⚠️</span>
            <span>{error}</span>
          </div>
        )}

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
    </RequireUser>
  )
}

export default OrderForm
