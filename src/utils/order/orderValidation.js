import { getTomorrowISOInTimeZone } from '../dateUtils'
import { resolveCustomerName } from './orderCustomerName'
import { canChooseCustomSide } from './orderCustomSideRules'

const isCustomSideOption = (opt) => (opt?.title || '').toLowerCase().includes('guarn')
const SINGLE_MENU_MESSAGE = 'Solo podés seleccionar 1 menú por persona.'

const hasValidResponse = (response) => {
  if (!response) return false
  if (Array.isArray(response) && response.length === 0) return false
  if (typeof response === 'string' && response.trim() === '') return false
  return true
}

const getSelectedItemName = (item = {}) =>
  item.name || item.title || item.menu || item.label || item.option || item.selected_option || ''

const withSideAssociationMetadata = ({ response, option, selectedItems, service }) => {
  if (!isCustomSideOption(option)) return response
  if (!Array.isArray(selectedItems) || selectedItems.length !== 1) return response

  const [item] = selectedItems
  const itemId = item?.id ?? item?.item_id ?? item?.itemId ?? item?.menu_item_id ?? item?.menuItemId
  const itemName = getSelectedItemName(item)

  return {
    ...response,
    item_id: itemId,
    itemId,
    slotIndex: item?.slotIndex ?? item?.item_slot_index ?? 0,
    itemName,
    service
  }
}

const validateOrderSubmission = ({
  user,
  formData,
  _locations,
  selectedTurns,
  dinnerEnabled,
  dinnerMenuEnabled,
  pendingLunch,
  pendingDinner,
  visibleLunchOptions,
  visibleDinnerOptions,
  customResponses,
  customResponsesDinner,
  isGenneiaPostreOption,
  getSelectedItemsList,
  getSelectedItemsListDinner,
  getDinnerOverrideChoice,
  dinnerSpecialTitle,
  validateDinnerExclusivity,
  calculateTotal,
  _calculateTotalDinner,
  companyConfig,
  isOutsideWindow,
  selectedDinnerDate
}) => {
  if (!user?.id) {
    return { error: 'No se pudo validar el usuario. Intenta nuevamente.' }
  }

  if (isOutsideWindow?.()) {
    return { error: 'Pedidos disponibles de 09:00 a 22:00 (hora Buenos Aires). Intenta dentro del horario.' }
  }

  if (pendingLunch && (!dinnerEnabled || !dinnerMenuEnabled || !selectedTurns.dinner)) {
    return { error: 'Ya tenés un pedido registrado para esta fecha y servicio.' }
  }
  if (selectedTurns.dinner && pendingDinner) {
    return { error: 'Ya tenés un pedido registrado para esta fecha y servicio.' }
  }

  if (!formData.location) {
    return { error: 'Por favor selecciona un lugar de trabajo' }
  }

  const customerName = resolveCustomerName({ formData, user })
  if (!customerName) {
    return { error: 'No pudimos validar tu nombre. Completá tu nombre real en el perfil antes de enviar el pedido.' }
  }

  const lunchSelected = selectedTurns.lunch
  const dinnerSelected = selectedTurns.dinner && dinnerEnabled && dinnerMenuEnabled

  if (!lunchSelected && !dinnerSelected) {
    return { error: 'Selecciona al menos almuerzo o cena.' }
  }

  const selectedItemsList = getSelectedItemsList()
  const selectedItemsListDinner = getSelectedItemsListDinner()

  if (lunchSelected && selectedItemsList.length === 0) {
    return { error: 'Selecciona al menos un plato para almuerzo.' }
  }

  if (lunchSelected && selectedItemsList.length > 1) {
    return { error: SINGLE_MENU_MESSAGE }
  }

  const dinnerOverrideChoice = getDinnerOverrideChoice()

  if (dinnerSelected && selectedItemsListDinner.length === 0 && !dinnerOverrideChoice) {
    return { error: 'Selecciona al menos un plato para cena o una opción de cena.' }
  }

  if (dinnerSelected && selectedItemsListDinner.length > 1) {
    return { error: SINGLE_MENU_MESSAGE }
  }

  let customResponsesArray = []
  if (lunchSelected) {
    const canChooseCustomSideForSelection = selectedItemsList.length > 0
      ? selectedItemsList.every(item => canChooseCustomSide(item))
      : false

    if (!canChooseCustomSideForSelection) {
      const blockedCustomSide = (visibleLunchOptions || []).some(opt => {
        if (!isCustomSideOption(opt)) return false
        return hasValidResponse(customResponses[opt.id])
      })
      if (blockedCustomSide) {
        return { error: 'La guarnición distinta no está disponible para esta opción.' }
      }
    }

    const missingRequiredOptions = (visibleLunchOptions || [])
      .filter(opt => {
        if (isCustomSideOption(opt) && !canChooseCustomSideForSelection) return false
        return (opt.required || isGenneiaPostreOption(opt)) && !customResponses[opt.id]
      })
      .map(opt => opt.title)

    if (missingRequiredOptions.length > 0) {
      return { error: `Por favor completa (almuerzo): ${missingRequiredOptions.join(', ')}` }
    }

    customResponsesArray = (visibleLunchOptions || [])
      .filter(opt => {
        const response = customResponses[opt.id]
        if (!response) return false
        if (Array.isArray(response) && response.length === 0) return false
        if (typeof response === 'string' && response.trim() === '') return false
        return true
      })
      .map(opt => withSideAssociationMetadata({
        option: opt,
        selectedItems: selectedItemsList,
        service: 'lunch',
        response: {
          id: opt.id,
          title: opt.title,
          response: customResponses[opt.id]
        }
      }))
  }

  let customResponsesDinnerArray = []
  if (dinnerSelected) {
    if (dinnerOverrideChoice) {
      customResponsesDinnerArray = [{
        id: 'dinner-special',
        title: dinnerSpecialTitle || 'Opción de cena',
        response: dinnerOverrideChoice
      }]
    } else {
      const isGenneia = (companyConfig?.slug || '').toLowerCase() === 'genneia'
      const canChooseCustomSideForDinner = selectedItemsListDinner.length > 0
        ? selectedItemsListDinner.every(item => canChooseCustomSide(item))
        : false

      if (isGenneia && !canChooseCustomSideForDinner) {
        const blockedCustomSide = (visibleDinnerOptions || []).some(opt => {
          if (!isCustomSideOption(opt)) return false
          return hasValidResponse(customResponsesDinner[opt.id])
        })
        if (blockedCustomSide) {
          return { error: 'La guarnición distinta no está disponible para esta opción.' }
        }
      }

      const missingRequiredOptionsDinner = (visibleDinnerOptions || [])
        .filter(opt => {
          if (isGenneia && isCustomSideOption(opt) && !canChooseCustomSideForDinner) return false
          return (opt.required || isGenneiaPostreOption(opt)) && !customResponsesDinner[opt.id]
        })
        .map(opt => opt.title)
      if (missingRequiredOptionsDinner.length > 0) {
        return { error: `Para cena completa: ${missingRequiredOptionsDinner.join(', ')}` }
      }

      customResponsesDinnerArray = (visibleDinnerOptions || [])
        .filter(opt => {
          if (isGenneia && isCustomSideOption(opt) && !canChooseCustomSideForDinner) return false
          const response = customResponsesDinner[opt.id]
          if (!response) return false
          if (Array.isArray(response) && response.length === 0) return false
          if (typeof response === 'string' && response.trim() === '') return false
          return true
        })
        .map(opt => withSideAssociationMetadata({
          option: opt,
          selectedItems: selectedItemsListDinner,
          service: 'dinner',
          response: {
            id: opt.id,
            title: opt.title,
            response: customResponsesDinner[opt.id]
          }
        }))
    }
  }

  const deliveryDate = getTomorrowISOInTimeZone()
  const deliveryDates = {
    lunch: deliveryDate,
    dinner: selectedDinnerDate || deliveryDate
  }

  const turnosSeleccionados = Object.entries(selectedTurns)
    .filter(([, val]) => val)
    .map(([k]) => k)
    .filter(t => t === 'lunch' || (t === 'dinner' && dinnerEnabled && dinnerMenuEnabled))

  if (dinnerEnabled && dinnerMenuEnabled && turnosSeleccionados.length === 0) {
    return { error: 'Elegí al menos almuerzo o cena.' }
  }

  if (dinnerSelected) {
    const exclusivityError = validateDinnerExclusivity()
    if (exclusivityError) {
      return { error: exclusivityError }
    }
  }

  const dinnerItemsForSummary = (dinnerSelected && selectedItemsListDinner.length === 0 && dinnerOverrideChoice)
    ? [{ id: 'dinner-override', name: `Cena: ${dinnerOverrideChoice}`, quantity: 1, isDinnerOverride: true }]
    : selectedItemsListDinner

  const confirmationData = {
    company: companyConfig?.name || '',
    location: formData.location,
    name: customerName,
    email: formData.email || user?.email || '',
    phone: formData.phone || '',
    deliveryDate,
    deliveryDates,
    turnos: turnosSeleccionados,
    lunchSelected,
    dinnerSelected,
    lunchItems: selectedItemsList,
    dinnerItems: dinnerItemsForSummary,
    lunchOptions: customResponsesArray,
    dinnerOptions: customResponsesDinnerArray,
    comments: formData.comments || '',
    totals: {
      lunch: lunchSelected ? calculateTotal() : 0,
      dinner: dinnerSelected ? (dinnerItemsForSummary?.length || 0) : 0
    }
  }

  return {
    error: '',
    data: {
      selectedItemsList,
      selectedItemsListDinner,
      dinnerOverrideChoice,
      customResponsesArray,
      customResponsesDinnerArray,
      deliveryDate,
      deliveryDates,
      turnosSeleccionados,
      lunchSelected,
      dinnerSelected,
      dinnerItemsForSummary,
      confirmationData
    }
  }
}

export { validateOrderSubmission }
