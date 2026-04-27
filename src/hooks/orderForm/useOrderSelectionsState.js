import { useState, useEffect, useCallback } from 'react'
import { getTodayISOInTimeZone, getTomorrowISOInTimeZone } from '../../utils/dateUtils'

const DINNER_STORAGE_KEY = 'order_dinner_selections'

// Cargar desde localStorage
const loadDinnerSelections = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DINNER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Verificar que sea del día actual en horario de negocio
    const today = getTodayISOInTimeZone()
    if (parsed?._date !== today) return null
    return parsed
  } catch {
    return null
  }
}

// Guardar en localStorage
const saveDinnerSelections = (data) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DINNER_STORAGE_KEY, JSON.stringify({
      ...data,
      _date: getTodayISOInTimeZone()
    }))
  } catch {
    // ignore
  }
}

const toValidISODateOrFallback = (value, fallback) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return fallback
  return normalized
}

export const useOrderSelectionsState = () => {
  // Cargar selections guardadas al iniciar
  const savedDinner = loadDinnerSelections()

  const [menuItems, setMenuItems] = useState([])
  const [dinnerMenuItems, setDinnerMenuItems] = useState([])
  const [selectedDinnerDate, setSelectedDinnerDate] = useState(
    toValidISODateOrFallback(savedDinner?.selectedDinnerDate, getTomorrowISOInTimeZone())
  )
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState(savedDinner?.customResponsesDinner || {})
  const [dinnerMenuSpecial, setDinnerMenuSpecial] = useState(null)
  const [dinnerSpecialChoice, setDinnerSpecialChoice] = useState(savedDinner?.dinnerSpecialChoice || null)
  const [selectedItems, setSelectedItems] = useState({})
  const [selectedItemsDinner, setSelectedItemsDinner] = useState(savedDinner?.selectedItemsDinner || {})

  // Persistir selecciones de cena cuando cambien
  useEffect(() => {
    const data = {
      selectedDinnerDate,
      selectedItemsDinner,
      dinnerSpecialChoice,
      customResponsesDinner
    }
    saveDinnerSelections(data)
  }, [selectedDinnerDate, selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner])

  // Wrappers con persistencia para setters de cena
  const setSelectedItemsDinnerPersisted = useCallback((value) => {
    setSelectedItemsDinner(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      saveDinnerSelections({ selectedDinnerDate, selectedItemsDinner: next, dinnerSpecialChoice, customResponsesDinner })
      return next
    })
  }, [selectedDinnerDate, dinnerSpecialChoice, customResponsesDinner])

  const setDinnerSpecialChoicePersisted = useCallback((value) => {
    setDinnerSpecialChoice(() => {
      const next = value
      saveDinnerSelections({ selectedDinnerDate, selectedItemsDinner, dinnerSpecialChoice: next, customResponsesDinner })
      return next
    })
  }, [selectedDinnerDate, selectedItemsDinner, customResponsesDinner])

  const setCustomResponsesDinnerPersisted = useCallback((value) => {
    setCustomResponsesDinner(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      saveDinnerSelections({ selectedDinnerDate, selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner: next })
      return next
    })
  }, [selectedDinnerDate, selectedItemsDinner, dinnerSpecialChoice])

  const setSelectedDinnerDatePersisted = useCallback((value) => {
    setSelectedDinnerDate(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      saveDinnerSelections({ selectedDinnerDate: next, selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner })
      return next
    })
  }, [selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner])

  return {
    menuItems,
    setMenuItems,
    dinnerMenuItems,
    setDinnerMenuItems,
    selectedDinnerDate,
    setSelectedDinnerDate: setSelectedDinnerDatePersisted,
    customOptionsLunch,
    setCustomOptionsLunch,
    customOptionsDinner,
    setCustomOptionsDinner,
    customResponses,
    setCustomResponses,
    customResponsesDinner,
    setCustomResponsesDinner: setCustomResponsesDinnerPersisted,
    dinnerMenuSpecial,
    setDinnerMenuSpecial,
    dinnerSpecialChoice,
    setDinnerSpecialChoice: setDinnerSpecialChoicePersisted,
    selectedItems,
    setSelectedItems,
    selectedItemsDinner,
    setSelectedItemsDinner: setSelectedItemsDinnerPersisted
  }
}
