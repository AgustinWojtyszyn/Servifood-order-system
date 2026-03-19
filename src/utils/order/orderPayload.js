import { buildOrderItemLabel } from './orderFormatters'
import { computePayloadSignature } from './orderIdempotency'

const buildOrderPayload = ({
  service,
  user,
  formData,
  deliveryDate,
  itemsForService,
  responsesForService,
  dinnerOverrideChoice,
  totalItems,
  idempotencyKey
}) => {
  const isDinner = service === 'dinner'

  const itemsToSend = (isDinner && dinnerOverrideChoice && itemsForService.length === 0)
    ? [{ id: 'dinner-override', name: `Cena: ${dinnerOverrideChoice}`, quantity: 1 }]
    : itemsForService

  const normalizedItemsToSend = itemsToSend.map(item => ({
    ...item,
    name: buildOrderItemLabel(item),
    quantity: 1
  }))

  const idempotencySignature = computePayloadSignature(
    normalizedItemsToSend,
    responsesForService,
    formData.comments,
    deliveryDate,
    formData.location,
    service
  )

  const orderData = {
    user_id: user.id,
    location: formData.location,
    customer_name: formData.name || user?.user_metadata?.full_name || user?.email || '',
    customer_email: formData.email || user?.email,
    customer_phone: formData.phone,
    items: normalizedItemsToSend.map(item => ({
      id: item.id,
      name: item.name,
      quantity: 1
    })),
    comments: formData.comments,
    delivery_date: deliveryDate,
    status: 'pending',
    total_items: totalItems,
    custom_responses: responsesForService,
    idempotency_key: idempotencyKey,
    service
  }

  return {
    orderData,
    normalizedItemsToSend,
    idempotencySignature
  }
}

export { buildOrderPayload }
