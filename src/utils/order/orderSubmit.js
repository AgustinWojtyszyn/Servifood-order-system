import { ordersService } from '../../services/orders'
import { buildIdempotencyStorageKey, generateIdempotencyKey } from './orderIdempotency'
import { buildOrderPayload } from './orderPayload'
import { hasDinnerOverrideInResponses } from './orderBusinessRules'

const submitOrders = async ({
  turnosSeleccionados,
  selectedItemsList,
  selectedItemsListDinner,
  customResponsesArray,
  customResponsesDinnerArray,
  dinnerOverrideChoice,
  user,
  formData,
  deliveryDate,
  calculateTotal,
  calculateTotalDinner
}) => {
  for (const service of turnosSeleccionados) {
    const isDinner = service === 'dinner'
    const overrideChoice = isDinner ? dinnerOverrideChoice : null
    const itemsForService = isDinner ? selectedItemsListDinner : selectedItemsList
    const responsesForService = isDinner ? customResponsesDinnerArray : customResponsesArray

    if (isDinner) {
      const hasOverride = hasDinnerOverrideInResponses(responsesForService)
      if (itemsForService.length > 0 && hasOverride) {
        return {
          ok: false,
          errorMessage: 'Para cena elegí menú o la opción adicional (MP/veggie), no ambas.',
          forceLunchOnly: false
        }
      }
      if (itemsForService.length > 1) {
        return {
          ok: false,
          errorMessage: 'Solo un menú por persona en cena.',
          forceLunchOnly: false
        }
      }
    }

    const totalItems = service === 'dinner' ? calculateTotalDinner() : calculateTotal()
    const { orderData, idempotencySignature } = buildOrderPayload({
      service,
      user,
      formData,
      deliveryDate,
      itemsForService,
      responsesForService,
      dinnerOverrideChoice: overrideChoice,
      totalItems,
      idempotencyKey: null
    })

    const idempotencyStorageKey = buildIdempotencyStorageKey(
      itemsForService,
      formData.location,
      idempotencySignature,
      service,
      user?.id || 'anon'
    )

    let idempotencyKey = null
    if (typeof window !== 'undefined') {
      const existingKey = sessionStorage.getItem(idempotencyStorageKey)
      idempotencyKey = existingKey || generateIdempotencyKey()
      sessionStorage.setItem(idempotencyStorageKey, idempotencyKey)
    } else {
      idempotencyKey = generateIdempotencyKey()
    }

    orderData.idempotency_key = idempotencyKey

    const { error } = await ordersService.createOrder(orderData)

    if (error) {
      const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
      if (msg.includes('dinner') || msg.toLowerCase().includes('service') || msg.includes('feature')) {
        return {
          ok: false,
          errorMessage: 'No tenés habilitada la cena. Deja solo almuerzo o pedí alta a un admin.',
          forceLunchOnly: true
        }
      }
      if (msg.includes('violates row-level security policy') || msg.includes('new row violates row-level security')) {
        return {
          ok: false,
          errorMessage: 'Ya tienes un pedido pendiente. Espera a que se complete para crear uno nuevo.',
          forceLunchOnly: false
        }
      }
      return {
        ok: false,
        errorMessage: 'Error al crear el pedido: ' + msg,
        forceLunchOnly: false
      }
    }
  }

  return { ok: true }
}

export { submitOrders }
