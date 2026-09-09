import { supabase } from './supabase'

export const getCompanyConsumptionOrders = async ({ startDate, endDate }) => {
  const { data, error } = await supabase.rpc('get_company_consumption_report', {
    p_month_start: startDate,
    p_month_end: endDate
  })
  return { data: Array.isArray(data) ? data : [], error }
}

// Backwards-compatible alias while callers/tests migrate to the generic report.
export const getIgarretaIsemarConsumptionOrders = getCompanyConsumptionOrders
