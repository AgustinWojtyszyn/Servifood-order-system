import { useEffect, useMemo } from 'react'
import { buildSelectedItemsList } from '../../utils/order/orderFormHelpers'
import { canChooseCustomSide } from '../../utils/order/orderCustomSideRules'

export const useCustomSideGuards = ({
  isGenneia,
  selectedTurns,
  menuItems,
  selectedItems,
  selectedItemsDinner,
  visibleLunchOptions,
  visibleDinnerOptions,
  setCustomResponses,
  setCustomResponsesDinner
}) => {
  const customSideOptionIds = useMemo(
    () => (visibleLunchOptions || [])
      .filter(opt => (opt?.title || '').toLowerCase().includes('guarn'))
      .map(opt => opt.id),
    [visibleLunchOptions]
  )

  const canChooseCustomSideForSelection = useMemo(() => {
    const selectedList = buildSelectedItemsList(menuItems, selectedItems)
    if (!selectedList.length) return false
    return selectedList.every(item => canChooseCustomSide(item))
  }, [menuItems, selectedItems])

  const dinnerCustomSideOptionIds = useMemo(
    () => (visibleDinnerOptions || [])
      .filter(opt => (opt?.title || '').toLowerCase().includes('guarn'))
      .map(opt => opt.id),
    [visibleDinnerOptions]
  )

  const canChooseCustomSideForDinner = useMemo(() => {
    if (!isGenneia) return true
    if (!selectedTurns?.dinner) return true
    const selectedList = buildSelectedItemsList(menuItems, selectedItemsDinner)
    if (!selectedList.length) return false
    return selectedList.every(item => canChooseCustomSide(item))
  }, [isGenneia, selectedTurns?.dinner, menuItems, selectedItemsDinner])

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
  }, [canChooseCustomSideForSelection, customSideOptionIds, setCustomResponses])

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
  }, [canChooseCustomSideForDinner, dinnerCustomSideOptionIds, setCustomResponsesDinner])

  return {
    customSideOptionIds,
    dinnerCustomSideOptionIds,
    canChooseCustomSideForSelection,
    canChooseCustomSideForDinner
  }
}

