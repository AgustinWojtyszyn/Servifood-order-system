import { useCallback, useState } from 'react'

export const useHealthProbeFilters = ({ healthLogs }) => {
  const [healthRange, setHealthRange] = useState('24h') // '24h' | '7d'
  const [healthOnlyErrors, setHealthOnlyErrors] = useState(false)

  const filteredHealthLogs = useCallback(() => {
    const now = new Date()
    const from = new Date(now)
    if (healthRange === '24h') {
      from.setHours(now.getHours() - 24)
    } else if (healthRange === '7d') {
      from.setDate(now.getDate() - 7)
    }

    return (healthLogs || [])
      .filter((log) => {
        const ts = new Date(log.created_at || log.timestamp || 0)
        if (isNaN(ts)) return false
        if (ts < from || ts > now) return false

        const md = log.metadata || {}
        const status = Number(md.status_code || md.status || 0)
        const supabaseOk = md.supabase_ok

        if (healthOnlyErrors) {
          return (status >= 400) || supabaseOk === false
        }
        return true
      })
      .slice(0, 200)
  }, [healthLogs, healthRange, healthOnlyErrors])

  return {
    healthRange,
    setHealthRange,
    healthOnlyErrors,
    setHealthOnlyErrors,
    filteredHealthLogs
  }
}

