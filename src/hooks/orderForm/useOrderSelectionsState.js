import { useState, useEffect, useCallback } from 'react'

const DINNER_STORAGE_KEY = 'order_dinner_selections'

// Cargar desde localStorage
const loadDinnerSelections = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DINNER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Verificar que sea del día actual
    const today = new Date().toISOString().split('T')[0]
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
      _date: new Date().toISOString().split('T')[0]
    }))
  } catch {
    // ignore
  }
}

export const useOrderSelectionsState = () => {
  // Cargar selections guardadas al iniciar
  const savedDinner = loadDinnerSelections()

  const [menuItems, setMenuItems] = useState([])
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState(savedDinner?.customResponsesDinner || {})
  const [dinnerMenuSpecial, setDinnerMenuSpecial] = useState(null)
  const [dinnerSpecialChoice, setDinnerSpecialChoice] = useState(savedDinner?.dinnerSpecialChoice || null)
  const [selectedItems, setSelectedItems] = useState({})
  const [selectedItemsDinner, setSelectedItemsDinner] = useState(savedDinner?.selectedItemsDinner || {})

  // Persistir晚餐 selections cuando cambien
  useEffect(() => {
    const data = {
      selectedItemsDinner,
      dinnerSpecialChoice,
      customResponsesDinner
    }
    saveDinnerSelections(data)
  }, [selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner])

  // Wrappers con persistencia para setters de cena
  const setSelectedItemsDinnerPersisted = useCallback((value) => {
    setSelectedItemsDinner(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      saveDinnerSelections({ selectedItemsDinner: next, dinnerSpecialChoice, customResponsesDinner })
      return next
    })
  }, [dinnerSpecialChoice, customResponsesDinner])

  const setDinnerSpecialChoicePersisted = useCallback((value) => {
    setDinnerSpecialChoice(prev => {
      const next = value
      saveDinnerSelections({ selectedItemsDinner, dinnerSpecialChoice: next, customResponsesDinner })
      return next
    })
  }, [selectedItemsDinner, customResponsesDinner])

  const setCustomResponsesDinnerPersisted = useCallback((value) => {
    setCustomResponsesDinner(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      saveDinnerSelections({ selectedItemsDinner, dinnerSpecialChoice, customResponsesDinner: next })
      return next
    })
  }, [selectedItemsDinner, dinnerSpecialChoice])

  return {
    menuItems,
    setMenuItems,
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

