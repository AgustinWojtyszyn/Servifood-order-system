import { useCallback, useState } from 'react'
import { ordersService } from '../../services/orders'
import { EDIT_WINDOW_MINUTES } from '../../constants/orderRules'
import { isOrderEditable } from '../../utils'
import { validateEditOrderForm } from '../../utils/orderEdit/validateEditOrderForm'
import { buildEditOrderPayload } from '../../utils/orderEdit/buildEditOrderPayload'

export const useEditOrderSubmit = ({
  order,
  user,
  formData,
  selectedItemsList,
  customOptions,
  customResponses
}) => {
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    if (!isOrderEditable(order?.created_at, EDIT_WINDOW_MINUTES)) {
      setError(`Solo puedes editar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos de haberlo creado.`)
      return
    }

    setLocalLoading(true)
    setError('')

    const validation = validateEditOrderForm({
      user,
      formData,
      selectedItemsList,
      service: order?.service,
      customOptions,
      customResponses
    })

    if (!validation.ok) {
      setError(validation.error)
      setLocalLoading(false)
      return
    }

    try {
      const orderData = buildEditOrderPayload({
        formData,
        user,
        service: order?.service,
        selectedItemsList,
        customOptions,
        customResponses
      })

      const { error } = await ordersService.updateOrder(order.id, orderData)

      if (error) {
        setError('Error al actualizar el pedido: ' + error.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Error al actualizar el pedido')
    } finally {
      setLocalLoading(false)
    }
  }, [order, user, formData, selectedItemsList, customOptions, customResponses])

  return { handleSubmit, localLoading, error, success, setSuccess }
}
