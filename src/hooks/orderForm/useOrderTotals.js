import { useCallback, useMemo } from 'react'
import { buildSelectedItemsList, countSelectedItems } from '../../utils/order/orderFormHelpers'
import { matchesOverrideKeyword } from '../../utils/order/orderBusinessRules'
import { getDinnerOverrideChoice as getDinnerOverrideChoicePure, validateDinnerExclusivity as validateDinnerExclusivityPure } from '../../utils/order/orderDinnerOverride'

export const useOrderTotals = ({
  menuItems,
  dinnerMenuItems,
  selectedItems,
  selectedItemsDinner,
  dinnerSpecialChoice,
  customResponsesDinner,
  visibleDinnerOptions,
  selectedTurns,
  dinnerEnabled,
  dinnerMenuEnabled
} = {}) => {
  const getSelectedItemsList = useCallback(() => buildSelectedItemsList(menuItems, selectedItems), [menuItems, selectedItems])
  const getSelectedItemsListDinner = useCallback(
    () => buildSelectedItemsList(dinnerMenuItems, selectedItemsDinner),
    [dinnerMenuItems, selectedItemsDinner]
  )

  const calculateTotal = useCallback(() => countSelectedItems(getSelectedItemsList()), [getSelectedItemsList])

  const getDinnerOverrideChoice = useCallback(() => getDinnerOverrideChoicePure({
    dinnerSpecialChoice,
    customResponsesDinner,
    visibleDinnerOptions,
    matchesOverrideKeyword
  }), [customResponsesDinner, dinnerSpecialChoice, visibleDinnerOptions])

  const calculateTotalDinner = useCallback(() => {
    const base = countSelectedItems(getSelectedItemsListDinner())
    if (base > 0) return base
    return getDinnerOverrideChoice() ? 1 : 0
  }, [getDinnerOverrideChoice, getSelectedItemsListDinner])

  const validateDinnerExclusivity = useCallback(() => {
    const itemsCount = countSelectedItems(getSelectedItemsListDinner())
    const overrideChoice = getDinnerOverrideChoice()
    return validateDinnerExclusivityPure({ itemsCount, overrideChoice })
  }, [getDinnerOverrideChoice, getSelectedItemsListDinner])

  const hasLunchSelection = useMemo(() => {
    return selectedTurns?.lunch && getSelectedItemsList().length > 0
  }, [getSelectedItemsList, selectedTurns?.lunch])

  const hasDinnerSelection = useMemo(() => {
    return selectedTurns?.dinner
      && dinnerEnabled
      && dinnerMenuEnabled
      && (getSelectedItemsListDinner().length > 0 || !!getDinnerOverrideChoice())
  }, [
    dinnerEnabled,
    dinnerMenuEnabled,
    getDinnerOverrideChoice,
    getSelectedItemsListDinner,
    selectedTurns?.dinner
  ])

  const hasAnySelectedItems = hasLunchSelection || hasDinnerSelection

  return {
    getSelectedItemsList,
    getSelectedItemsListDinner,
    calculateTotal,
    calculateTotalDinner,
    getDinnerOverrideChoice,
    validateDinnerExclusivity,
    hasAnySelectedItems
  }
}
