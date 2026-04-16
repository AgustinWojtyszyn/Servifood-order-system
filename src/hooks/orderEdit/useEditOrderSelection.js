import { useCallback, useMemo } from 'react'
import { notifyInfo } from '../../utils/notice'
import { getMenuDish } from '../../utils/order/menuDisplay'

const isSaladDish = (menuItem) => {
  const dish = getMenuDish(menuItem) || ''
  return dish.toLowerCase().includes('ensalada')
}

export const useEditOrderSelection = ({
  service,
  dinnerOverrideChoice,
  menuItems,
  selectedItems,
  setSelectedItems
}) => {
  const getSelectedItemsList = useCallback(() => {
    return (menuItems || []).filter(item => selectedItems?.[item.id] === true)
  }, [menuItems, selectedItems])

  const total = useMemo(() => getSelectedItemsList().length, [getSelectedItemsList])

  const handleItemSelect = useCallback((itemId, isSelected) => {
    if (!isSelected) {
      setSelectedItems(prev => {
        if (!prev) return prev
        if (!Object.prototype.hasOwnProperty.call(prev, itemId)) return prev
        const { [itemId]: _removed, ...rest } = prev
        return rest
      })
      return
    }

    const normalizedService = (service || 'lunch').toLowerCase()
    if (normalizedService === 'dinner') {
      if (dinnerOverrideChoice !== null && dinnerOverrideChoice !== undefined && String(dinnerOverrideChoice).trim() !== '') {
        notifyInfo('Si elegís la opción de cena, no podés seleccionar otro menú u opción.')
        return
      }

      const anySelected = Object.values(selectedItems || {}).some(Boolean)
      if (anySelected && !selectedItems?.[itemId]) {
        notifyInfo('Solo puedes seleccionar 1 menú por persona en cena.')
        return
      }

      setSelectedItems(prev => ({
        ...(prev || {}),
        [itemId]: true
      }))
      return
    }

    const item = (menuItems || []).find(m => m.id === itemId)
    const isEnsalada = isSaladDish(item)

    if (isEnsalada) {
      // Para ensaladas, solo permitir 1 (corregido: desmarca otras ensaladas previas)
      setSelectedItems(prev => {
        const next = { ...(prev || {}), [itemId]: true }
        ;(menuItems || []).forEach(m => {
          if (!m?.id) return
          if (m.id !== itemId && isSaladDish(m)) {
            delete next[m.id]
          }
        })
        return next
      })
      return
    }

    const mainMenuSelected = (menuItems || [])
      .filter(m => !isSaladDish(m))
      .some(m => Boolean(selectedItems?.[m.id]))

    if (mainMenuSelected && !selectedItems?.[itemId]) {
      notifyInfo('Solo puedes seleccionar 1 menú por persona.')
      return
    }

    setSelectedItems(prev => ({
      ...(prev || {}),
      [itemId]: true
    }))
  }, [service, dinnerOverrideChoice, menuItems, selectedItems, setSelectedItems])

  return { handleItemSelect, getSelectedItemsList, total }
}
