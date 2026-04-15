import { useCallback } from 'react'
import { getMenuDish } from '../../utils/order/menuDisplay'

export const useOrderLunchSelection = ({
  menuItems,
  selectedItems,
  setSelectedItems,
  notifyInfo
}) => {
  const handleItemSelect = useCallback((itemId, isSelected) => {
    const item = menuItems.find(m => m.id === itemId)
    const dish = getMenuDish(item)
    const isEnsalada = dish.toLowerCase().includes('ensalada')

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
          .filter(m => !getMenuDish(m).toLowerCase().includes('ensalada'))
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
  }, [menuItems, selectedItems, setSelectedItems, notifyInfo])

  return { handleItemSelect }
}

