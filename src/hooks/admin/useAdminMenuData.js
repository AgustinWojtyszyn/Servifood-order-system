import { useState } from 'react'
import { db } from '../../supabaseClient'
import { sortMenuItems } from '../../utils/admin/adminCalculations'

const useAdminMenuData = ({ editingMenuByDate, draftMenuItemsByDate, setDraftItemsForDate, initialSelectedDates = [] }) => {
  const [selectedDates, setSelectedDates] = useState(initialSelectedDates)
  const [menuItemsByDate, setMenuItemsByDate] = useState({})
  const [loadingMenuByDate, setLoadingMenuByDate] = useState({})
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    return stored === null ? true : stored === 'true'
  })

  const buildDefaultMenuItems = () => sortMenuItems([
    { name: 'Plato Principal 1', description: 'Delicioso plato principal' },
    { name: 'Plato Principal 2', description: 'Otro plato delicioso' },
    { name: 'Ensalada César', description: 'Fresca ensalada' }
  ])

  const normalizeMenuItems = (items = []) =>
    sortMenuItems(items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || ''
    })))

  const setMenuItemsForDate = (menuDate, items) => {
    setMenuItemsByDate(prev => ({ ...prev, [menuDate]: items }))
  }

  const setLoadingForDate = (menuDate, value) => {
    setLoadingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const fetchMenuForDate = async (menuDate) => {
    setLoadingForDate(menuDate, true)
    try {
      const { data, error } = await db.getMenuItemsByDate(menuDate)
      if (error) {
        console.error('Error fetching menu:', error)
        setMenuItemsForDate(menuDate, [])
        if (!editingMenuByDate[menuDate]) {
          setDraftItemsForDate(menuDate, buildDefaultMenuItems())
        }
        return
      }

      const sorted = sortMenuItems(data || [])
      setMenuItemsForDate(menuDate, sorted)

      const shouldUpdateDraft = !editingMenuByDate[menuDate] || !draftMenuItemsByDate[menuDate]
      if (shouldUpdateDraft) {
        if (sorted.length > 0) {
          setDraftItemsForDate(menuDate, normalizeMenuItems(sorted))
        } else {
          setDraftItemsForDate(menuDate, buildDefaultMenuItems())
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingForDate(menuDate, false)
    }
  }

  const addSelectedDate = (menuDate) => {
    if (!menuDate) return
    setSelectedDates(prev => {
      const next = prev.includes(menuDate) ? prev : [...prev, menuDate]
      return next.sort()
    })
  }

  const removeSelectedDate = (menuDate) => {
    setSelectedDates(prev => prev.filter(date => date !== menuDate))
  }

  const clearMenuDate = (menuDate) => {
    setLoadingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setMenuItemsByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
  }

  const toggleDinnerMenu = (checked) => {
    setDinnerMenuEnabled(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dinner_menu_enabled', checked ? 'true' : 'false')
    }
  }

  return {
    selectedDates,
    menuItemsByDate,
    loadingMenuByDate,
    dinnerMenuEnabled,
    fetchMenuForDate,
    addSelectedDate,
    removeSelectedDate,
    clearMenuDate,
    setMenuItemsForDate,
    toggleDinnerMenu
  }
}

export { useAdminMenuData }
