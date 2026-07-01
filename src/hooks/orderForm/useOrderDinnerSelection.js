import { useCallback } from 'react'

export const getNextDinnerSelection = (selectedItems = {}, itemId, isSelected) => {
  if (isSelected) return { [itemId]: true }
  return {
    ...selectedItems,
    [itemId]: false
  }
}

export const useOrderDinnerSelection = ({
  dinnerMenuItems,
  selectedItemsDinner,
  setSelectedItemsDinner,
  dinnerSpecialChoice,
  setDinnerSpecialChoice,
  setCustomResponsesDinner,
  clearDinnerOverrideResponses,
  notifyInfo
}) => {
  const handleItemSelectDinner = useCallback((itemId, isSelected) => {
    const item = dinnerMenuItems.find(m => m.id === itemId)
    if (!item) return
    const anySelected = Object.values(selectedItemsDinner).some(Boolean)

    if (isSelected) {
      if (dinnerSpecialChoice) {
        notifyInfo('Si elegís la opción de cena, no podés seleccionar otro menú u opción.')
        return
      }
      if (anySelected && !selectedItemsDinner[itemId]) {
        notifyInfo('Se reemplazó la selección anterior de cena.')
      }
      clearDinnerOverrideResponses()
      setDinnerSpecialChoice(null)
      setSelectedItemsDinner(prev => getNextDinnerSelection(prev, itemId, true))
    } else {
      setSelectedItemsDinner(prev => getNextDinnerSelection(prev, itemId, false))
    }
  }, [
    dinnerMenuItems,
    selectedItemsDinner,
    setSelectedItemsDinner,
    dinnerSpecialChoice,
    setDinnerSpecialChoice,
    clearDinnerOverrideResponses,
    notifyInfo
  ])

  const clearDinnerMenuSelections = useCallback(() => {
    setSelectedItemsDinner({})
  }, [setSelectedItemsDinner])

  const handleDinnerSpecialSelect = useCallback((value) => {
    if (!value) return
    if (dinnerSpecialChoice === value) {
      setDinnerSpecialChoice(null)
      return
    }
    setDinnerSpecialChoice(value)
    setSelectedItemsDinner({})
    setCustomResponsesDinner({})
  }, [dinnerSpecialChoice, setDinnerSpecialChoice, setSelectedItemsDinner, setCustomResponsesDinner])

  return {
    handleItemSelectDinner,
    clearDinnerMenuSelections,
    handleDinnerSpecialSelect
  }
}
