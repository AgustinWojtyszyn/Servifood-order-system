export const buildEditOrderPayload = ({
  formData,
  user,
  service,
  selectedItemsList,
  customOptions,
  customResponses
}) => {
  const isEmptyResponse = (value) => {
    if (value === null || value === undefined) return true
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'string') return value.trim() === ''
    return false
  }

  const normalizedService = (service || 'lunch').toLowerCase()
  const dinnerOverrideChoice = customResponses?.['dinner-special']
  const hasDinnerOverrideChoice = !isEmptyResponse(dinnerOverrideChoice)

  const customResponsesArray = (customOptions || [])
    .filter(opt => {
      if (!opt?.active) return false
      const response = customResponses?.[opt.id]
      return !isEmptyResponse(response)
    })
    .map(option => ({
      id: option.id,
      title: option.title,
      response: customResponses?.[option.id]
    }))

  const userName =
    user?.user_metadata?.full_name ||
    formData?.name ||
    user?.email?.split('@')?.[0] ||
    'Usuario'

  const itemsPayload = (normalizedService === 'dinner' && hasDinnerOverrideChoice && (selectedItemsList || []).length === 0)
    ? [{ id: 'dinner-override', name: `Cena: ${dinnerOverrideChoice}`, quantity: 1, isDinnerOverride: true }]
    : (selectedItemsList || []).map(item => ({
        id: item.id,
        name: item.name,
        quantity: 1
      }))

  const customResponsesPayload = (normalizedService === 'dinner' && hasDinnerOverrideChoice && (selectedItemsList || []).length === 0)
    ? [{
        id: 'dinner-special',
        title: (customOptions || []).find(opt => opt?.id === 'dinner-special')?.title || 'Opción de cena',
        response: dinnerOverrideChoice
      }]
    : customResponsesArray

  return {
    location: formData?.location,
    customer_name: userName,
    customer_email: formData?.email || user?.email,
    customer_phone: formData?.phone,
    items: itemsPayload,
    comments: formData?.comments,
    custom_responses: customResponsesPayload
  }
}
