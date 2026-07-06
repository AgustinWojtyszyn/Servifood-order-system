import { Fragment, createElement, useMemo } from 'react'

export const useLunchOptionsUI = ({
  visibleLunchOptions,
  customResponses,
  isGenneia,
  isGenneiaPostreDay,
  canChooseCustomSideForSelection
}) => {
  return useMemo(() => {
    return (visibleLunchOptions || []).map(option => {
      const isPostreGroup = isGenneia && option.title?.toLowerCase().includes('postre')
      const isCustomSideOption = (option.title || '').toLowerCase().includes('guarn')
      const customSideBlocked = isCustomSideOption && !canChooseCustomSideForSelection
      const helperPostreContent = isPostreGroup
        ? createElement(
            Fragment,
            null,
            'Solo elegí ',
            createElement('b', null, 'Postre del día'),
            ' para entregas de martes y jueves. El resto de los días marcá ',
            createElement('b', null, 'Fruta'),
            '.'
          )
        : null
      const choices = (option.options || []).map(opt => {
        const isSelected = customResponses[option.id] === opt
        const isChecked = (customResponses[option.id] || []).includes(opt)
        const isPostreOption = isPostreGroup && opt?.toLowerCase().includes('postre')
        const isDisabled = (isPostreOption && !isGenneiaPostreDay) || customSideBlocked
        return {
          value: opt,
          isSelected,
          isChecked,
          isDisabled,
          showUnavailableLabel: isPostreOption && !isGenneiaPostreDay
        }
      })
      return {
        id: option.id,
        title: option.title,
        required: option.required,
        type: option.type,
        helperPostreContent,
        choices,
        textValue: option.type === 'text' ? (customResponses[option.id] || '') : '',
        isDisabled: customSideBlocked
      }
    })
  }, [visibleLunchOptions, customResponses, isGenneia, isGenneiaPostreDay, canChooseCustomSideForSelection])
}
