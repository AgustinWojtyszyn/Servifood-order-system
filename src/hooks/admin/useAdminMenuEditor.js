import { useState } from 'react'

const useAdminMenuEditor = () => {
  const [draftMenuItemsByDate, setDraftMenuItemsByDate] = useState({})
  const [editingMenuByDate, setEditingMenuByDate] = useState({})
  const [savingMenuByDate, setSavingMenuByDate] = useState({})

  const setDraftItemsForDate = (menuDate, items) => {
    setDraftMenuItemsByDate(prev => ({ ...prev, [menuDate]: items }))
  }

  const setEditingForDate = (menuDate, value) => {
    setEditingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const setSavingForDate = (menuDate, value) => {
    setSavingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const clearEditorForDate = (menuDate) => {
    setEditingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setSavingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setDraftMenuItemsByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
  }

  return {
    draftMenuItemsByDate,
    editingMenuByDate,
    savingMenuByDate,
    setDraftItemsForDate,
    setEditingForDate,
    setSavingForDate,
    clearEditorForDate
  }
}

export { useAdminMenuEditor }
