import { useMemo, useCallback } from 'react'
import { COMPANY_CATALOG } from '../../constants/companyConfig'
import { Sound } from '../../utils/Sound'
import { notifyInfo } from '../../utils/notice'
import { useOrderSubmit } from '../useOrderSubmit'
import { useOrderBootstrap } from '../useOrderBootstrap'
import { useOrderRepeatPayload } from './useOrderRepeatPayload'
import { useOrderSuggestionHandlers } from './useOrderSuggestionHandlers'
import { useOrderCompany } from './useOrderCompany'
import { useGenneiaPostreDay } from './useGenneiaPostreDay'
import { useGenneiaPostreRules } from './useGenneiaPostreRules'
import { useCustomSideGuards } from './useCustomSideGuards'
import { useLunchOptionsUI } from './useLunchOptionsUI'
import { useDinnerMenuItemsUI } from './useDinnerMenuItemsUI'
import { useOrderLunchSelection } from './useOrderLunchSelection'
import { useOrderDinnerSelection } from './useOrderDinnerSelection'
import { useOrderCustomResponses } from './useOrderCustomResponses'
import { useOrderTotals } from './useOrderTotals'
import { useOrderFormEffects } from './useOrderFormEffects'
import { useOrderFormState } from './useOrderFormState'
import { useOrderSelectionsState } from './useOrderSelectionsState'
import {
  isBeverageOrDessertOption,
  isDinnerOverrideValue,
  isGenneiaPostreOption,
  isOutsideWindow
} from '../../utils/order/orderBusinessRules'
import { clearDinnerOverrideResponses as clearDinnerOverrideResponsesPure } from '../../utils/order/orderDinnerOverride'

export const useOrderFlowController = ({ user, locationState, navigate } = {}) => {
  const {
    formData, setFormData,
    mode, setMode,
    dinnerEnabled, setDinnerEnabled,
    selectedTurns, setSelectedTurns,
    success, setSuccess,
    hasOrderToday, setHasOrderToday,
    pendingLunch, setPendingLunch,
    pendingDinner, setPendingDinner,
    suggestion, setSuggestion,
    suggestionVisible, setSuggestionVisible,
    suggestionLoading, setSuggestionLoading,
    suggestionSummary, setSuggestionSummary,
    suggestionMode, setSuggestionMode,
    dinnerMenuEnabled, setDinnerMenuEnabled
  } = useOrderFormState()

  const {
    menuItems, setMenuItems,
    customOptionsLunch, setCustomOptionsLunch,
    customOptionsDinner, setCustomOptionsDinner,
    customResponses, setCustomResponses,
    customResponsesDinner, setCustomResponsesDinner,
    dinnerMenuSpecial, setDinnerMenuSpecial,
    dinnerSpecialChoice, setDinnerSpecialChoice,
    selectedItems, setSelectedItems,
    selectedItemsDinner, setSelectedItemsDinner
  } = useOrderSelectionsState()

  const {
    companySlugParam,
    rawCompanySlug,
    companyConfig,
    companyOptionsSlug,
    isGenneia,
    locations
  } = useOrderCompany()

  const isGenneiaPostreOptionLocal = useCallback(
    (option = {}) => isGenneiaPostreOption(isGenneia, option),
    [isGenneia]
  )
  const { isGenneiaPostreDay } = useGenneiaPostreDay({ isGenneia })

  const activeOptions = useMemo(
    () => (customOptionsLunch || []).filter(opt => opt.active),
    [customOptionsLunch]
  )

  const visibleLunchOptions = useMemo(
    () => activeOptions.filter(Boolean),
    [activeOptions]
  )

  const visibleDinnerOptions = useMemo(() => {
    if (!dinnerEnabled) return []
    return (customOptionsDinner || []).filter(opt => opt.active)
  }, [customOptionsDinner, dinnerEnabled])

  const {
    canChooseCustomSideForSelection,
    canChooseCustomSideForDinner
  } = useCustomSideGuards({
    isGenneia,
    selectedTurns,
    menuItems,
    selectedItems,
    selectedItemsDinner,
    visibleLunchOptions,
    visibleDinnerOptions,
    setCustomResponses,
    setCustomResponsesDinner
  })

  const lunchOptionsUI = useLunchOptionsUI({
    visibleLunchOptions,
    customResponses,
    isGenneia,
    isGenneiaPostreDay,
    canChooseCustomSideForSelection
  })

  const dinnerMenuItemsUI = useDinnerMenuItemsUI({ menuItems, selectedItemsDinner })

  const allCustomOptions = useMemo(() => {
    const seen = new Set()
    return [...(customOptionsLunch || []), ...(customOptionsDinner || [])].filter(opt => {
      if (!opt?.id) return false
      if (seen.has(opt.id)) return false
      seen.add(opt.id)
      return true
    })
  }, [customOptionsLunch, customOptionsDinner])

  useGenneiaPostreRules({
    isGenneia,
    isGenneiaPostreDay,
    allCustomOptions,
    visibleDinnerOptions,
    isGenneiaPostreOption: isGenneiaPostreOptionLocal,
    setCustomResponses,
    setCustomResponsesDinner
  })

  useOrderBootstrap({
    user,
    rawCompanySlug,
    companyOptionsSlug,
    dinnerEnabled,
    setDinnerEnabled,
    setSelectedTurns,
    setMode,
    setFormData,
    setMenuItems,
    setCustomOptionsLunch,
    setCustomOptionsDinner,
    setDinnerMenuSpecial,
    setPendingLunch,
    setPendingDinner,
    setHasOrderToday,
    setSuggestion,
    setSuggestionMode,
    setSuggestionVisible,
    setSuggestionSummary,
    setSuggestionLoading
  })

  useOrderFormEffects({
    companySlugParam,
    rawCompanySlug,
    companyCatalog: COMPANY_CATALOG,
    navigate,
    dinnerMenuSpecial,
    setDinnerSpecialChoice,
    locations,
    setFormData,
    setCustomResponses,
    success,
    playSuccess: Sound.playSuccess
  })

  useOrderRepeatPayload({
    locationState,
    menuItems,
    menuItemsLength: menuItems.length,
    locations,
    dinnerEnabled,
    dinnerMenuEnabled,
    setSelectedItems,
    setSelectedItemsDinner,
    setCustomResponses,
    setCustomResponsesDinner,
    setDinnerSpecialChoice,
    setSelectedTurns,
    setMode,
    setFormData
  })

  const { handleItemSelect } = useOrderLunchSelection({
    menuItems,
    selectedItems,
    setSelectedItems,
    notifyInfo
  })

  const handleFormChange = useCallback((e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }, [formData, setFormData])

  const { handleCustomResponse, setCustomResponsesDinnerSafe } = useOrderCustomResponses({
    visibleLunchOptions,
    setCustomResponses,
    notifyInfo,
    canChooseCustomSideForSelection,
    dinnerSpecialChoice,
    setCustomResponsesDinner,
    isBeverageOrDessertOption,
    canChooseCustomSideForDinner
  })

  const clearDinnerOverrideResponses = useCallback(() => {
    setCustomResponsesDinner(prev => clearDinnerOverrideResponsesPure({ prevResponses: prev, isDinnerOverrideValue }))
  }, [setCustomResponsesDinner])

  const {
    getSelectedItemsList,
    getSelectedItemsListDinner,
    calculateTotal,
    calculateTotalDinner,
    getDinnerOverrideChoice,
    validateDinnerExclusivity,
    hasAnySelectedItems
  } = useOrderTotals({
    menuItems,
    selectedItems,
    selectedItemsDinner,
    dinnerSpecialChoice,
    customResponsesDinner,
    visibleDinnerOptions,
    selectedTurns,
    dinnerEnabled,
    dinnerMenuEnabled
  })

  const {
    handleItemSelectDinner,
    clearDinnerMenuSelections,
    handleDinnerSpecialSelect
  } = useOrderDinnerSelection({
    menuItems,
    selectedItemsDinner,
    setSelectedItemsDinner,
    dinnerSpecialChoice,
    setDinnerSpecialChoice,
    setCustomResponsesDinner,
    clearDinnerOverrideResponses,
    notifyInfo
  })

  const { handleRepeatSuggestion, handleDismissSuggestion } = useOrderSuggestionHandlers({
    suggestion,
    setSuggestionVisible,
    setSuggestion,
    setSuggestionSummary,
    setSuggestionMode,
    menuItems,
    locations,
    isGenneia,
    setSelectedItems,
    setSelectedItemsDinner,
    setCustomResponses,
    setCustomResponsesDinner,
    setDinnerSpecialChoice,
    setSelectedTurns,
    setMode,
    setFormData,
    clearDinnerOverrideResponses
  })

  const submit = useOrderSubmit({
    user,
    formData,
    locations,
    selectedTurns,
    dinnerEnabled,
    dinnerMenuEnabled,
    pendingLunch,
    pendingDinner,
    visibleLunchOptions,
    visibleDinnerOptions,
    customResponses,
    customResponsesDinner,
    isGenneiaPostreOption: isGenneiaPostreOptionLocal,
    getSelectedItemsList,
    getSelectedItemsListDinner,
    getDinnerOverrideChoice,
    dinnerSpecialTitle: dinnerMenuSpecial?.title,
    validateDinnerExclusivity,
    calculateTotal,
    calculateTotalDinner,
    companyConfig,
    isOutsideWindow,
    setSelectedTurns,
    setSuccess,
    navigate,
    rawCompanySlug
  })

  const toggleLunchTurn = useCallback(() => {
    setSelectedTurns(prev => ({ ...prev, lunch: !prev.lunch }))
  }, [setSelectedTurns])

  const toggleDinnerTurn = useCallback(() => {
    setSelectedTurns(prev => ({ ...prev, dinner: !prev.dinner }))
  }, [setSelectedTurns])

  const removeLunchItem = useCallback((itemId) => {
    handleItemSelect(itemId, false)
  }, [handleItemSelect])

  return {
    success,
    company: { companyConfig, isGenneia, locations, rawCompanySlug, companySlugParam, companyOptionsSlug },
    form: { formData, handleFormChange, hasOrderToday },
    turns: { selectedTurns, toggleLunchTurn, toggleDinnerTurn, dinnerEnabled, dinnerMenuEnabled },
    lunch: {
      menuItems,
      selectedItems,
      handleItemSelect,
      getSelectedItemsList,
      calculateTotal,
      lunchOptionsUI,
      handleCustomResponse,
      removeLunchItem
    },
    dinner: {
      dinnerMenuItemsUI,
      visibleDinnerOptions,
      customResponsesDinner,
      setCustomResponsesDinnerSafe,
      canChooseCustomSideForDinner,
      calculateTotalDinner,
      handleItemSelectDinner,
      clearDinnerMenuSelections,
      dinnerMenuSpecial,
      dinnerSpecialChoice,
      handleDinnerSpecialSelect,
      isGenneiaPostreDay,
      isDinnerOverrideValue
    },
    suggestions: {
      suggestionVisible,
      suggestion,
      suggestionMode,
      suggestionSummary,
      suggestionLoading,
      handleRepeatSuggestion,
      handleDismissSuggestion
    },
    submit: {
      ...submit,
      hasAnySelectedItems
    }
  }
}

