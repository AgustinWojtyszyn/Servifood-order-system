import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
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
import OrderDinnerOptionsSection from './order-form/OrderDinnerOptionsSection'
import OrderSuccessScreen from './order-form/OrderSuccessScreen'
import OrderHoursBanner from './order-form/OrderHoursBanner'
import { formatResponseValue } from '../utils/order/orderFormatters'
import { notifyInfo } from '../utils/notice'
import {
  buildSelectedItemsList,
  countSelectedItems
} from '../utils/order/orderFormHelpers'
import { useOrderSubmit } from '../hooks/useOrderSubmit'
import { buildResponsesMap, mapOrderItemsToSelection } from '../utils/order/orderSelectionHelpers'
import {
  isGenneiaPostreOption,
  isBeverageOrDessertOption,
  matchesOverrideKeyword,
  isDinnerOverrideValue,
  isOutsideWindow
} from '../utils/order/orderBusinessRules'
import { canChooseCustomSide } from '../utils/order/orderCustomSideRules'
import { useOrderBootstrap } from '../hooks/useOrderBootstrap'

const OrderForm = ({ user, loading }) => {
  const [menuItems, setMenuItems] = useState([])
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState({})
  const [dinnerMenuSpecial, setDinnerMenuSpecial] = useState(null)
  const [dinnerSpecialChoice, setDinnerSpecialChoice] = useState(null)
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
  const isGenneiaPostreOptionLocal = (option = {}) => isGenneiaPostreOption(isGenneia, option)
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

  const customSideOptionIds = useMemo(
    () => visibleLunchOptions
      .filter(opt => (opt?.title || '').toLowerCase().includes('guarn'))
      .map(opt => opt.id),
    [visibleLunchOptions]
  )

  const canChooseCustomSideForSelection = useMemo(() => {
    const selectedList = buildSelectedItemsList(menuItems, selectedItems)
    if (!selectedList.length) return false
    return selectedList.every(item => canChooseCustomSide(item?.name, item?.id, item?.description))
  }, [menuItems, selectedItems])

  const lunchOptionsUI = useMemo(() => {
    return visibleLunchOptions.map(option => {
      const isPostreGroup = isGenneia && option.title?.toLowerCase().includes('postre')
      const isCustomSideOption = (option.title || '').toLowerCase().includes('guarn')
      const customSideBlocked = isCustomSideOption && !canChooseCustomSideForSelection
      const helperPostreContent = isPostreGroup ? (
        <>
          Solo elegí <b>Postre del día</b> lunes y miércoles (entrega martes y jueves). El resto de los días marcá <b>Fruta</b>. Los martes, jueves y viernes el postre queda deshabilitado.
        </>
      ) : null
      const choices = (option.options || []).map(opt => {
        const isSelected = customResponses[option.id] === opt
        const isChecked = (customResponses[option.id] || []).includes(opt)
        const isPostreOption = isPostreGroup && opt?.toLowerCase().includes('postre')
        const isDisabled = (isPostreOption && !isGenneiaPostreDay) || customSideBlocked
        return {
          value: opt,
          isSelected,
          isChecked,
          isDisabled,
          showUnavailableLabel: isPostreOption && !isGenneiaPostreDay
        }
      })
        return {
          id: option.id,
          title: option.title,
          required: option.required,
          type: option.type,
          helperPostreContent,
          choices,
          textValue: option.type === 'text' ? (customResponses[option.id] || '') : '',
          isDisabled: customSideBlocked
        }
      })
  }, [visibleLunchOptions, customResponses, isGenneia, isGenneiaPostreDay, canChooseCustomSideForSelection])

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

  const dinnerCustomSideOptionIds = useMemo(
    () => visibleDinnerOptions
      .filter(opt => (opt?.title || '').toLowerCase().includes('guarn'))
      .map(opt => opt.id),
    [visibleDinnerOptions]
  )

  const canChooseCustomSideForDinner = useMemo(() => {
    if (!isGenneia) return true
    if (!selectedTurns.dinner) return true
    const selectedList = buildSelectedItemsList(menuItems, selectedItemsDinner)
    if (!selectedList.length) return false
    return selectedList.every(item => canChooseCustomSide(item?.name, item?.id, item?.description))
  }, [isGenneia, selectedTurns.dinner, menuItems, selectedItemsDinner])

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

  useOrderBootstrap({
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
  })

  useEffect(() => {
    // Redirigir a la selección si llega un slug desconocido
    if (companySlugParam && !COMPANY_CATALOG[rawCompanySlug]) {
      navigate('/order', { replace: true })
    }
  }, [companySlugParam, navigate, rawCompanySlug])

  useEffect(() => {
    if (!dinnerMenuSpecial) {
      setDinnerSpecialChoice(null)
    }
  }, [dinnerMenuSpecial])

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
        if (!isGenneiaPostreOptionLocal(option)) return

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

  useEffect(() => {
    if (!isGenneia) return
    if (!visibleDinnerOptions.length) return
    setCustomResponsesDinner((prev) => {
      let changed = false
      const updated = { ...prev }

      visibleDinnerOptions.forEach((option) => {
        if (!isGenneiaPostreOptionLocal(option)) return

        const current = prev[option.id]
        const frutaOption = option.options?.find((opt) => opt?.toLowerCase().includes('fruta'))
        const shouldForceFruta = !isGenneiaPostreDay && frutaOption

        if (Array.isArray(current)) {
          const cleaned = current.filter((val) => !val?.toLowerCase().includes('postre'))
          if (cleaned.length !== current.length) {
            updated[option.id] = cleaned.length ? cleaned : (shouldForceFruta ? [frutaOption] : [])
            changed = true
          } else if (!current.length && shouldForceFruta) {
            updated[option.id] = [frutaOption]
            changed = true
          }
          return
        }

        const isPostreSelected =
          typeof current === 'string' && current.toLowerCase().includes('postre')
        if (shouldForceFruta && (!current || isPostreSelected)) {
          updated[option.id] = frutaOption
          changed = true
        } else if (!isGenneiaPostreDay && isPostreSelected && !frutaOption) {
          updated[option.id] = null
          changed = true
        }
      })

      return changed ? updated : prev
    })
  }, [isGenneia, isGenneiaPostreDay, visibleDinnerOptions, isGenneiaPostreOptionLocal])

  useEffect(() => {
    if (canChooseCustomSideForSelection) return
    if (!customSideOptionIds.length) return
    setCustomResponses(prev => {
      let changed = false
      const next = { ...prev }
      customSideOptionIds.forEach((id) => {
        if (next[id]) {
          delete next[id]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [canChooseCustomSideForSelection, customSideOptionIds])

  useEffect(() => {
    if (canChooseCustomSideForDinner) return
    if (!dinnerCustomSideOptionIds.length) return
    setCustomResponsesDinner(prev => {
      let changed = false
      const next = { ...prev }
      dinnerCustomSideOptionIds.forEach((id) => {
        if (next[id]) {
          delete next[id]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [canChooseCustomSideForDinner, dinnerCustomSideOptionIds])

  // bootstrap moved to useOrderBootstrap

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
          notifyInfo('Solo puedes seleccionar 1 menú por persona.')
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
      if (dinnerSpecialChoice) {
        notifyInfo('Si elegís la opción de cena, no podés seleccionar otro menú u opción.')
        return
      }
      // Si ya hay algo elegido (menú u otra opción), bloquear
      if (anySelected && !selectedItemsDinner[itemId]) {
        notifyInfo('Solo puedes seleccionar 1 menú por persona en cena.')
        return
      }
      // Limpiar overrides de cena si elige un plato
      clearDinnerOverrideResponses()
      setDinnerSpecialChoice(null)
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
    const option = visibleLunchOptions.find(opt => opt?.id === optionId)
    const isCustomSideOption = (option?.title || '').toLowerCase().includes('guarn')
    if (isCustomSideOption && !canChooseCustomSideForSelection) {
      notifyInfo('La guarnición distinta no está disponible para esta opción.')
      return
    }

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

  const setCustomResponsesDinnerSafe = (updater, optionMeta) => {
    if (dinnerSpecialChoice && !isBeverageOrDessertOption(optionMeta)) {
      notifyInfo('Si elegís la opción de cena, no podés seleccionar otras opciones.')
      return
    }
    const isCustomSideOption = (optionMeta?.title || '').toLowerCase().includes('guarn')
    if (isCustomSideOption && !canChooseCustomSideForDinner) {
      notifyInfo('La guarnición distinta no está disponible para esta opción.')
      return
    }
    setCustomResponsesDinner(prev => (typeof updater === 'function' ? updater(prev) : updater))
  }

  const getSelectedItemsList = () => buildSelectedItemsList(menuItems, selectedItems)

  const calculateTotal = () => countSelectedItems(getSelectedItemsList())

  const getSelectedItemsListDinner = () => buildSelectedItemsList(menuItems, selectedItemsDinner)

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

  const handleDinnerSpecialSelect = (value) => {
    if (!value) return
    if (dinnerSpecialChoice === value) {
      setDinnerSpecialChoice(null)
      return
    }
    setDinnerSpecialChoice(value)
    setSelectedItemsDinner({})
    setCustomResponsesDinner({})
  }

  const getDinnerOverrideChoice = () => {
    if (dinnerSpecialChoice) return dinnerSpecialChoice
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

  const calculateTotalDinner = () => {
    const base = countSelectedItems(getSelectedItemsListDinner())
    if (base > 0) return base
    return getDinnerOverrideChoice() ? 1 : 0
  }

  const validateDinnerExclusivity = () => {
    const itemsCount = countSelectedItems(getSelectedItemsListDinner())
    const override = getDinnerOverrideChoice()
    if (itemsCount > 0 && override) {
      return 'Para cena elegí menú o la opción de cena, no ambas.'
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
      if (hasDinnerOverride) {
        const overrideValue = Object.values(responsesMap || {}).find((value) => isDinnerOverrideValue(value))
        setDinnerSpecialChoice(typeof overrideValue === 'string' ? overrideValue : null)
        setCustomResponsesDinner({})
      } else {
        setDinnerSpecialChoice(null)
      }
      setSelectedTurns({ lunch: false, dinner: true })
      setMode('dinner')
      if (!hasDinnerOverride) {
        setCustomResponsesDinner(responsesMap)
      }
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
      setDinnerSpecialChoice(null)
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


  const {
    submitting,
    confirmOpen,
    confirmData,
    error,
    handleSubmit,
    handleConfirmSubmit,
    closeConfirm
  } = useOrderSubmit({
    user,
    formData,
    locations,
    selectedTurns,
    dinnerEnabled,
    dinnerMenuEnabled,
    pendingLunch,
    pendingDinner,
    visibleLunchOptions,
    visibleDinnerOptions,
    customResponses,
    customResponsesDinner,
    isGenneiaPostreOption: isGenneiaPostreOptionLocal,
    getSelectedItemsList,
    getSelectedItemsListDinner,
    getDinnerOverrideChoice,
    dinnerSpecialTitle: dinnerMenuSpecial?.title,
    validateDinnerExclusivity,
    calculateTotal,
    calculateTotalDinner,
    companyConfig,
    isOutsideWindow,
    setSelectedTurns,
    setSuccess,
    navigate
  })

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

                <OrderDinnerOptionsSection
                  options={visibleDinnerOptions}
                  customResponsesDinner={customResponsesDinner}
                  setCustomResponsesDinner={setCustomResponsesDinnerSafe}
                  isGenneia={isGenneia}
                  isGenneiaPostreDay={isGenneiaPostreDay}
                  customSideBlocked={!canChooseCustomSideForDinner}
                  isDinnerOverrideValue={isDinnerOverrideValue}
                  clearDinnerMenuSelections={clearDinnerMenuSelections}
                  dinnerSpecial={dinnerMenuSpecial}
                  dinnerSpecialChoice={dinnerSpecialChoice}
                  onDinnerSpecialSelect={handleDinnerSpecialSelect}
                />
              </div>
            )}

            {/* Información Adicional */}
            <OrderCommentsSection comments={formData.comments} onCommentsChange={handleFormChange} />

            <OrderErrorBanner error={error} />

            {/* Botón de confirmación - SIEMPRE visible al fondo, nunca fijo en mobile */}
            <div
              className="w-full bg-linear-to-t from-white via-white to-white/95 sm:bg-transparent p-4 sm:p-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none border-t-2 sm:border-t-0 border-gray-200 flex justify-center sm:mt-6 z-40"
              style={{
                position: 'relative',
                bottom: 'auto',
                left: 'auto',
                right: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
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
      </div>

      {confirmOpen && confirmData && (
        <OrderConfirmModal
          open={confirmOpen}
          confirmData={confirmData}
          submitting={submitting}
          onClose={closeConfirm}
          onConfirm={handleConfirmSubmit}
          formatResponseValue={formatResponseValue}
        />
      )}
    </RequireUser>
  )
}

export default OrderForm
