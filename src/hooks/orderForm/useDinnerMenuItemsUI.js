import { useMemo } from 'react'

export const useDinnerMenuItemsUI = ({ menuItems, selectedItemsDinner }) => {
  return useMemo(() => {
    return (menuItems || []).map((item, index) => {
      const isSelected = !!selectedItemsDinner[item.id]
      const slotIndex = Number.isFinite(item?.slotIndex) ? item.slotIndex : index
      const isMain = slotIndex === 0
      const hasMainSelected = Object.keys(selectedItemsDinner || {}).some(id => {
        if (!selectedItemsDinner[id]) return false
        const found = (menuItems || []).find(mi => mi.id === id)
        const foundIndex = (menuItems || []).indexOf(found)
        const foundSlot = Number.isFinite(found?.slotIndex) ? found.slotIndex : foundIndex
        return foundSlot === 0
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
}

