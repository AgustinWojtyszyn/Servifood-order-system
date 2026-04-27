import { buildResponsesMap, mapOrderItemsToSelection } from './orderSelectionHelpers'
import { isDinnerOverrideValue } from './orderBusinessRules'

const normalizeLocation = ({ draftLocation, locations, fallbackLocation }) => {
  if (draftLocation && locations.includes(draftLocation)) return draftLocation
  return locations[0] || fallbackLocation || ''
}

export const buildDraftFromPayload = ({
  payload,
  menuItems,
  dinnerMenuItems,
  locations,
  dinnerEnabled,
  dinnerMenuEnabled
}) => {
  const draftItems = Array.isArray(payload?.items) ? payload.items : []
  const draftResponses = Array.isArray(payload?.custom_responses) ? payload.custom_responses : []
  const draftService = (payload?.service || 'lunch').toLowerCase()
  const responsesMap = buildResponsesMap(draftResponses)

  const baseFormData = {
    comments: payload?.comments || '',
    location: normalizeLocation({ draftLocation: payload?.location, locations, fallbackLocation: locations[0] })
  }

  if (draftService === 'dinner' && dinnerEnabled && dinnerMenuEnabled) {
    const selectedDinnerMap = mapOrderItemsToSelection(draftItems, dinnerMenuItems)
    return {
      service: 'dinner',
      selectedItems: {},
      selectedItemsDinner: selectedDinnerMap,
      // Compat: el OrderForm original no limpiaba respuestas de almuerzo al repetir cena.
      customResponses: undefined,
      customResponsesDinner: responsesMap,
      selectedTurns: { lunch: false, dinner: true },
      mode: 'dinner',
      // Compat: el OrderForm original no tocaba dinnerSpecialChoice al repetir.
      dinnerSpecialChoice: undefined,
      ...baseFormData
    }
  }

  const selectedMap = mapOrderItemsToSelection(draftItems, menuItems)
  return {
    service: 'lunch',
    selectedItems: selectedMap,
    selectedItemsDinner: {},
    customResponses: responsesMap,
    customResponsesDinner: {},
    selectedTurns: { lunch: true, dinner: false },
    mode: 'lunch',
    // Compat: el OrderForm original no tocaba dinnerSpecialChoice al repetir.
    dinnerSpecialChoice: undefined,
    ...baseFormData
  }
}

// Aplica la sugerencia con el comportamiento especial de Genneia para cena:
// si hay override, no selecciona platos y setea dinnerSpecialChoice.
export const buildDraftFromSuggestion = ({
  suggestion,
  menuItems,
  dinnerMenuItems,
  locations,
  isGenneia
}) => {
  const suggestionService = (suggestion?.service || 'lunch').toLowerCase()
  const isDinnerSuggestion = suggestionService === 'dinner'
  const responsesMap = buildResponsesMap(suggestion?.custom_responses || [])
  const hasDinnerOverride = Object.values(responsesMap).some((value) => isDinnerOverrideValue(value))

  const baseFormData = {
    comments: suggestion?.comments || '',
    location: normalizeLocation({ draftLocation: suggestion?.location, locations, fallbackLocation: locations[0] })
  }

  if (isGenneia && isDinnerSuggestion) {
    const selectedDinnerMap = mapOrderItemsToSelection(suggestion?.items || [], dinnerMenuItems)
    if (hasDinnerOverride) {
      const overrideValue = Object.values(responsesMap || {}).find((value) => isDinnerOverrideValue(value))
      return {
        service: 'dinner',
        selectedItems: {},
        selectedItemsDinner: {},
        customResponses: {},
        customResponsesDinner: {},
        selectedTurns: { lunch: false, dinner: true },
        mode: 'dinner',
        dinnerSpecialChoice: typeof overrideValue === 'string' ? overrideValue : null,
        hasDinnerOverride,
        ...baseFormData
      }
    }

    return {
      service: 'dinner',
      selectedItems: {},
      selectedItemsDinner: selectedDinnerMap,
      customResponses: {},
      customResponsesDinner: responsesMap,
      selectedTurns: { lunch: false, dinner: true },
      mode: 'dinner',
      dinnerSpecialChoice: null,
      hasDinnerOverride,
      ...baseFormData
    }
  }

  const selectedMap = mapOrderItemsToSelection(suggestion?.items || [], menuItems)
  return {
    service: 'lunch',
    selectedItems: selectedMap,
    selectedItemsDinner: {},
    customResponses: responsesMap,
    customResponsesDinner: {},
    // Compat: el OrderForm original no forzaba turno/modo al repetir sugerencia (salvo cena Genneia).
    selectedTurns: undefined,
    mode: undefined,
    dinnerSpecialChoice: null,
    hasDinnerOverride: false,
    ...baseFormData
  }
}
