import { getTomorrowISOInTimeZone } from '../dateUtils'

const validateOrderSubmission = ({
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
  isGenneiaPostreOption,
  getSelectedItemsList,
  getSelectedItemsListDinner,
  getDinnerOverrideChoice,
  dinnerSpecialTitle,
  validateDinnerExclusivity,
  calculateTotal,
  calculateTotalDinner,
  companyConfig,
  isOutsideWindow
}) => {
  if (!user?.id) {
    return { error: 'No se pudo validar el usuario. Intenta nuevamente.' }
  }

  if (isOutsideWindow?.()) {
    return { error: 'Pedidos disponibles de 09:00 a 22:00 (hora Buenos Aires). Intenta dentro del horario.' }
  }

  if (pendingLunch && (!dinnerEnabled || !dinnerMenuEnabled || !selectedTurns.dinner)) {
    return { error: 'Ya tienes un pedido de almuerzo pendiente. Espera a que se complete.' }
  }
  if (selectedTurns.dinner && pendingDinner) {
    return { error: 'Ya tienes un pedido de cena pendiente. Espera a que se complete.' }
  }

  if (!formData.location) {
    return { error: 'Por favor selecciona un lugar de trabajo' }
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

  const dinnerOverrideChoice = getDinnerOverrideChoice()

  if (dinnerSelected && selectedItemsListDinner.length === 0 && !dinnerOverrideChoice) {
    return { error: 'Selecciona al menos un plato para cena o una opción de cena.' }
  }

  let customResponsesArray = []
  if (lunchSelected) {
    const missingRequiredOptions = (visibleLunchOptions || [])
      .filter(opt => (opt.required || isGenneiaPostreOption(opt)) && !customResponses[opt.id])
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
      .map(opt => ({
        id: opt.id,
        title: opt.title,
        response: customResponses[opt.id]
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
      const missingRequiredOptionsDinner = (visibleDinnerOptions || [])
        .filter(opt => (opt.required || isGenneiaPostreOption(opt)) && !customResponsesDinner[opt.id])
        .map(opt => opt.title)
      if (missingRequiredOptionsDinner.length > 0) {
        return { error: `Para cena completa: ${missingRequiredOptionsDinner.join(', ')}` }
      }

      customResponsesDinnerArray = (visibleDinnerOptions || [])
        .filter(opt => {
          const response = customResponsesDinner[opt.id]
          if (!response) return false
          if (Array.isArray(response) && response.length === 0) return false
          if (typeof response === 'string' && response.trim() === '') return false
          return true
        })
        .map(opt => ({
          id: opt.id,
          title: opt.title,
          response: customResponsesDinner[opt.id]
        }))
    }
  }

  const deliveryDate = getTomorrowISOInTimeZone()

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
    ? [{ id: 'dinner-override', name: `Cena: ${dinnerOverrideChoice}`, quantity: 1 }]
    : selectedItemsListDinner

  const confirmationData = {
    company: companyConfig?.name || '',
    location: formData.location,
    name: formData.name || user?.user_metadata?.full_name || user?.email || '',
    email: formData.email || user?.email || '',
    phone: formData.phone || '',
    deliveryDate,
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
      turnosSeleccionados,
      lunchSelected,
      dinnerSelected,
      dinnerItemsForSummary,
      confirmationData
    }
  }
}

export { validateOrderSubmission }
