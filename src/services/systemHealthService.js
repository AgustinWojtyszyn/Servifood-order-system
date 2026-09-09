import { supabase } from './supabase'

export const getSystemHealthDashboard = async ({ days = 30 } = {}) => {
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 90)
  const { data, error } = await supabase.rpc('get_system_health_dashboard', {
    p_days: safeDays
  })

  return {
    data: data && typeof data === 'object' ? data : null,
    error
  }
}
