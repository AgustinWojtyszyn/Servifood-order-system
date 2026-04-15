import { useCallback } from 'react'

export const useOrderCustomResponses = ({
  visibleLunchOptions,
  setCustomResponses,
  notifyInfo,
  canChooseCustomSideForSelection,
  dinnerSpecialChoice,
  setCustomResponsesDinner,
  isBeverageOrDessertOption,
  canChooseCustomSideForDinner
} = {}) => {
  const handleCustomResponse = useCallback((optionId, value, type) => {
    const option = (visibleLunchOptions || []).find(opt => opt?.id === optionId)
    const isCustomSideOption = (option?.title || '').toLowerCase().includes('guarn')
    if (isCustomSideOption && !canChooseCustomSideForSelection) {
      notifyInfo?.('La guarnición distinta no está disponible para esta opción.')
      return
    }

    if (type === 'checkbox') {
      setCustomResponses(prev => {
        const current = prev[optionId] || []
        const isChecked = current.includes(value)
        return {
          ...prev,
          [optionId]: isChecked
            ? current.filter(v => v !== value)
            : [...current, value]
        }
      })
      return
    }

    if (type === 'multiple_choice') {
      setCustomResponses(prev => {
        const current = prev[optionId]
        return {
          ...prev,
          [optionId]: current === value ? null : value
        }
      })
      return
    }

    setCustomResponses(prev => ({
      ...prev,
      [optionId]: value
    }))
  }, [canChooseCustomSideForSelection, notifyInfo, setCustomResponses, visibleLunchOptions])

  const setCustomResponsesDinnerSafe = useCallback((updater, optionMeta) => {
    if (dinnerSpecialChoice && !isBeverageOrDessertOption(optionMeta)) {
      notifyInfo?.('Si elegís la opción de cena, no podés seleccionar otras opciones.')
      return
    }
    const isCustomSideOption = (optionMeta?.title || '').toLowerCase().includes('guarn')
    if (isCustomSideOption && !canChooseCustomSideForDinner) {
      notifyInfo?.('La guarnición distinta no está disponible para esta opción.')
      return
    }
    setCustomResponsesDinner(prev => (typeof updater === 'function' ? updater(prev) : updater))
  }, [canChooseCustomSideForDinner, dinnerSpecialChoice, isBeverageOrDessertOption, notifyInfo, setCustomResponsesDinner])

  return { handleCustomResponse, setCustomResponsesDinnerSafe }
}

