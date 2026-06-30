import { useCallback } from 'react'

export const getNextLunchSelection = (selectedItems = {}, itemId, isSelected) => {
  if (isSelected) return { [itemId]: true }
  return {
    ...selectedItems,
    [itemId]: false
  }
}

export const useOrderLunchSelection = ({
  selectedItems,
  setSelectedItems,
  notifyInfo
}) => {
  const handleItemSelect = useCallback((itemId, isSelected) => {
    if (isSelected && Object.values(selectedItems || {}).some(Boolean) && !selectedItems?.[itemId]) {
      notifyInfo?.('Solo podés seleccionar 1 menú por persona.')
    }
    setSelectedItems(prev => getNextLunchSelection(prev, itemId, isSelected))
  }, [selectedItems, setSelectedItems, notifyInfo])

  return { handleItemSelect }
}
