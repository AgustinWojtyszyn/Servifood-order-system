import { supabase } from '../../supabaseClient'
import { COUNTABLE_STATUSES } from '../monthly/monthlyOrderConstants'
import { addSideItem, createSideBuckets, isOptionName } from '../monthly/monthlyOrderCalculations'
import { normalizeLabel, toDisplayString } from '../monthly/monthlyOrderFormatters'
import { normalizeOrderForReadOnly } from '../order/normalizeOrderForReadOnly'

const PAGE_SIZE = 1000

export const fetchOrdersByRange = async ({ start, end }) => {
  let from = 0
  let all = []
  while (true) {
    let query = supabase
      .from('orders')
      .select('id,status,delivery_date,created_at,items,custom_responses,location')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (start) query = query.gte('delivery_date', start)
    if (end) query = query.lte('delivery_date', end)

    const { data, error } = await query
    if (error) throw error
    const batch = data || []
    all = all.concat(batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return (all || []).filter(o => COUNTABLE_STATUSES.includes(o.status))
}

const parseItems = (items) => {
  if (Array.isArray(items)) return items
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const parseResponses = (responses) => {
  if (Array.isArray(responses)) return responses
  if (typeof responses === 'string') {
    try {
      const parsed = JSON.parse(responses)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeMenuLabel = (name = '') => {
  const base = toDisplayString(name)
  if (!base) return null
  const normalized = normalizeLabel(base)

  const optionMatch = normalized.match(/opcion\s*0?([1-6])\b/)
  if (optionMatch) return `Opción ${optionMatch[1]}`

  if (isOptionName(base)) {
    const match = base.match(/\d+/)
    return match ? `Opción ${match[0]}` : 'Opción'
  }

  if (normalized.includes('menu principal') || normalized.includes('plato principal')) {
    return 'Plato principal'
  }

  return null
}

export const buildMenuCounts = (orders = []) => {
  const counts = {}
  orders.forEach(order => {
    const { normalizedItems } = normalizeOrderForReadOnly(order)
    normalizedItems.forEach(item => {
      const label = normalizeMenuLabel(item?.name || '')
      if (!label) return
      const qty = Number(item?.quantity || 1)
      counts[label] = (counts[label] || 0) + qty
    })
  })
  return counts
}

const hasDinnerMenuKeyword = (normalized = '') => {
  if (!normalized) return false
  return (
    normalized.includes('cena') ||
    normalized.includes('menu de cena') ||
    normalized.includes('menu cena') ||
    normalized.includes('opcion cena') ||
    normalized.includes('opcional cena') ||
    normalized.includes('menu principal') ||
    normalized.includes('plato principal')
  )
}

const isMainDishResponse = (value = '', title = '') => {
  const normalized = normalizeLabel(value)
  const normalizedTitle = normalizeLabel(title)
  if (!normalized) return false
  if (hasDinnerMenuKeyword(normalized) || hasDinnerMenuKeyword(normalizedTitle)) return true
  if (normalized.includes('milanesa')) return true
  if (normalized.includes('bife')) return true
  if (normalized.includes('veggie')) return true
  if (normalized.includes('empanadas de verduras')) return true
  if (normalized.includes('empanada de verduras')) return true
  return false
}

export const buildSideBucketsFromOrders = (orders = []) => {
  const buckets = createSideBuckets()
  orders.forEach(order => {
    const { normalizedCustomResponses } = normalizeOrderForReadOnly(order)
    normalizedCustomResponses.forEach(resp => {
      const respValue = toDisplayString(resp?.response)
      const respTitle = toDisplayString(resp?.title)
      if (respValue && !isMainDishResponse(respValue, respTitle)) addSideItem(respValue, buckets)
      if (Array.isArray(resp?.options)) {
        resp.options.forEach(opt => {
          const value = toDisplayString(opt)
          if (value && !isMainDishResponse(value, respTitle)) addSideItem(value, buckets)
        })
      }
    })
  })
  return buckets
}

export const buildBifeCounts = (orders = []) => {
  const counts = {}
  orders.forEach(order => {
    const { normalizedItems } = normalizeOrderForReadOnly(order)
    normalizedItems.forEach(item => {
      const rawName = toDisplayString(item?.name)
      const normalized = normalizeLabel(rawName)
      if (!normalized || !normalized.includes('bife')) return
      const baseName = rawName.replace(/^\s*opci[oó]n\s*\d+\s*-\s*/i, '').trim()
      const qty = Number(item?.quantity || 1)
      counts[baseName] = (counts[baseName] || 0) + qty
    })
  })
  return counts
}

export const buildRanking = (counts = {}) => {
  const entries = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
  const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0)
  const items = entries.map(([label, count]) => ({
    label,
    count: Number(count || 0),
    percent: total ? (Number(count || 0) / total) * 100 : 0
  }))
  return { items, total }
}
