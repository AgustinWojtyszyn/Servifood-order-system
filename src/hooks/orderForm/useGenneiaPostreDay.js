import { useMemo } from 'react'
import { getTomorrowISOInTimeZone } from '../../utils/dateUtils'
import { isPostreDeliveryDate } from '../../utils/order/companySpecialRules'

export const useGenneiaPostreDay = ({ isGenneia, deliveryDate }) => {
  const effectiveDeliveryDate = deliveryDate || getTomorrowISOInTimeZone()

  const isGenneiaPostreDay = useMemo(
    () => !!isGenneia && isPostreDeliveryDate(effectiveDeliveryDate),
    [effectiveDeliveryDate, isGenneia]
  )

  return { isGenneiaPostreDay }
}
