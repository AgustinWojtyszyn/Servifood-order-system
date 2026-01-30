import { supabase, supabaseService } from './supabase'
import { handleError, sanitizeInput } from '../utils'

class AuditService {
  async getAuditLogs(options = {}) {
    const {
      limit = 200,
      actions = null,
      force = false
    } = options

    try {
      const cacheKey = `audit_logs_${limit}_${actions ? actions.join('-') : 'all'}`

      const queryFn = async () => {
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (Array.isArray(actions) && actions.length) {
          query = query.in('action', actions.map((a) => sanitizeInput(a)))
        }

        const { data, error } = await query

        if (error) throw error

        return data || []
      }

      const data = await supabaseService.cachedQuery(cacheKey, queryFn, 15000, force)

      const deduped = []
      const seen = new Set()
      for (const row of data) {
        const key = row.request_id ? `${row.request_id}-${row.action}` : `${row.id}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(row)
      }

      return { data: deduped, error: null }
    } catch (error) {
      return { data: [], error: handleError(error, 'getAuditLogs') }
    }
  }
}

export const auditService = new AuditService()
