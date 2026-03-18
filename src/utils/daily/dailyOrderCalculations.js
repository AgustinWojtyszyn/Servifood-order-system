import { BEVERAGE_KEYWORDS, DINNER_OVERRIDE_KEYWORDS } from './dailyOrderConstants'
import { normalizeDishName } from './dailyOrderFormatters'

export const getCustomSideFromResponses = (responses = []) => {
  if (!Array.isArray(responses) || responses.length === 0) return null
  for (const r of responses) {
    if (r?.title?.toLowerCase().includes('guarn')) {
      return r?.answer ?? r?.response ?? null
    }
  }
  return null
}

export const matchesDinnerOverrideKeyword = (val = '') => {
  const t = (val || '').toString().toLowerCase()
  return DINNER_OVERRIDE_KEYWORDS.some(k => t.includes(k))
}

export const isDinnerOverrideResponse = (resp = {}) => {
  const val = resp?.response ?? resp?.answer ?? null
  if (Array.isArray(val)) return val.some(v => matchesDinnerOverrideKeyword(v))
  return matchesDinnerOverrideKeyword(val)
}

export const getDinnerOverrideSelection = (order) => {
  if (!order || (order.service || 'lunch') !== 'dinner') return null

  if (Array.isArray(order.items)) {
    const overrideItem = order.items.find(it => it?.id === 'dinner-override' || matchesDinnerOverrideKeyword(it?.name))
    if (overrideItem?.name) return overrideItem.name.replace(/^cena:\s*/i, '').trim() || overrideItem.name
  }

  if (Array.isArray(order.custom_responses)) {
    for (const resp of order.custom_responses) {
      if (isDinnerOverrideResponse(resp)) {
        const val = resp?.response ?? resp?.answer
        if (Array.isArray(val)) {
          const match = val.find(v => matchesDinnerOverrideKeyword(v))
          if (match) return match
        }
        return val || null
      }
    }
  }

  return null
}

export const getOtherCustomResponses = (customResponses) => {
  if (!customResponses || !Array.isArray(customResponses)) return []

  return customResponses.filter(r =>
    r.response &&
    !r.title?.toLowerCase().includes('guarnición') &&
    !r.title?.toLowerCase().includes('guarnicion') &&
    !isDinnerOverrideResponse(r)
  )
}

export const isBeverage = (text = '') => {
  const t = (text || '').toLowerCase()
  return BEVERAGE_KEYWORDS.some(k => t.includes(k))
}

export const getBeverageLabel = (customResponses) => {
  if (!Array.isArray(customResponses)) return '—'
  const names = []
  customResponses.forEach(resp => {
    if (isBeverage(resp?.response)) names.push(resp.response)
    if (Array.isArray(resp?.options)) {
      resp.options.forEach(opt => { if (isBeverage(opt)) names.push(opt) })
    }
  })
  if (names.length === 0) return '—'
  const unique = [...new Set(names.map(n => (n || '').trim()))].filter(Boolean)
  const joined = unique.slice(0, 3).join(', ')
  return unique.length > 3 ? `${joined} (+${unique.length - 3})` : joined || '—'
}

export const summarizeOrderItems = (items = []) => {
  if (!Array.isArray(items)) return { principalCount: 0, others: [], remaining: 0, title: '' }
  const principal = items.filter(
    item => item && item.name && item.name.toLowerCase().includes('menú principal')
  )
  const others = items
    .filter(item => item && item.name && !item.name.toLowerCase().includes('menú principal'))
    .map(item => ({ name: normalizeDishName(item.name), qty: item.quantity || 1 }))

  const principalCount = principal.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const displayedOthers = others.slice(0, 3)
  const remaining = Math.max(others.length - displayedOthers.length, 0)

  const titleParts = []
  if (principalCount > 0) titleParts.push(`Plato Principal: ${principalCount}`)
  titleParts.push(...others.map(o => `${o.name} (x${o.qty})`))

  return {
    principalCount,
    others: displayedOthers,
    remaining,
    title: titleParts.join('; ')
  }
}

export const buildOrderPreview = (order) => {
  const items = []
  if (Array.isArray(order?.items)) {
    const principal = order.items.filter(
      item => item && item.name && item.name.toLowerCase().includes('menú principal')
    )
    const others = order.items.filter(
      item => item && item.name && !item.name.toLowerCase().includes('menú principal')
    )
    if (principal.length > 0) {
      const totalPrincipal = principal.reduce((sum, i) => sum + (i.quantity || 1), 0)
      items.push(`Plato Principal: ${totalPrincipal}`)
    }
    others.forEach(i => items.push(`${normalizeDishName(i.name)} (x${i.quantity || 1})`))
  }

  const customSide = getCustomSideFromResponses(order?.custom_responses || [])
  if (customSide) items.push(`Guarnición: ${customSide}`)

  const otherResponses = getOtherCustomResponses(order?.custom_responses || [])
  const customStrings = otherResponses.map(r => {
    const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
    return `${r.title}: ${response}`
  })

  return {
    itemsText: items.length ? items.join(' | ') : 'Sin items',
    optionsText: customStrings.length ? customStrings.join(' | ') : 'Sin opciones adicionales'
  }
}

export const filterOrdersByCompany = (ordersList, company) => {
  if (company === 'all') return ordersList
  const target = (company || '').toLowerCase()
  return (ordersList || []).filter(order => {
    const loc = (order?.location || '').toLowerCase()
    const comp = (order?.company || order?.company_slug || order?.target_company || '').toLowerCase()
    return loc === target || comp === target
  })
}

export const buildTurnSummary = (ordersList = []) => {
  const turnCounts = {
    lunch: { orders: 0, items: 0 },
    dinner: { orders: 0, items: 0 }
  }
  const byLocationTurn = {}

  ;(ordersList || []).forEach((order) => {
    if (!order) return
    const turn = (order.service || 'lunch') === 'dinner' ? 'dinner' : 'lunch'
    const itemsQty = Number(order.total_items || 0)
    const loc = order.location || 'Sin ubicación'

    turnCounts[turn].orders += 1
    turnCounts[turn].items += itemsQty

    if (!byLocationTurn[loc]) byLocationTurn[loc] = { lunch: 0, dinner: 0, total: 0 }
    byLocationTurn[loc][turn] += 1
    byLocationTurn[loc].total += 1
  })

  return { turnCounts, byLocationTurn }
}

export const buildOperationalSummary = (ordersList = []) => {
  const dishCounts = {}
  const sideCounts = {}
  const beverageCounts = {}

  ;(ordersList || []).forEach(order => {
    if (!order) return

    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (!item?.name) return
        const normalizedName = normalizeDishName(item.name)
        dishCounts[normalizedName] = (dishCounts[normalizedName] || 0) + (item.quantity || 1)
      })
    }

    const side = getCustomSideFromResponses(order.custom_responses || [])
    if (side) {
      sideCounts[side] = (sideCounts[side] || 0) + 1
    }

    const customResponses = Array.isArray(order.custom_responses) ? order.custom_responses : []
    customResponses.forEach(resp => {
      const pushBeverage = (value) => {
        if (!value) return
        const label = String(value).trim()
        if (!label || !isBeverage(label)) return
        beverageCounts[label] = (beverageCounts[label] || 0) + 1
      }
      if (Array.isArray(resp?.response)) {
        resp.response.forEach(pushBeverage)
      } else {
        pushBeverage(resp?.response)
      }
      if (Array.isArray(resp?.options)) {
        resp.options.forEach(pushBeverage)
      }
    })
  })

  const sortCounts = (counts) =>
    Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))

  return {
    dishes: sortCounts(dishCounts),
    sides: sortCounts(sideCounts),
    beverages: sortCounts(beverageCounts)
  }
}

export const buildLocationCards = (ordersList = []) => {
  const byLocation = {}

  ;(ordersList || []).forEach(order => {
    if (!order) return
    const loc = order.location || 'Sin ubicación'
    if (!byLocation[loc]) {
      byLocation[loc] = { total: 0, dishCounts: {}, sideCounts: {} }
    }
    byLocation[loc].total += 1

    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (!item?.name) return
        const normalizedName = normalizeDishName(item.name)
        byLocation[loc].dishCounts[normalizedName] =
          (byLocation[loc].dishCounts[normalizedName] || 0) + (item.quantity || 1)
      })
    }

    const side = getCustomSideFromResponses(order.custom_responses || [])
    if (side) {
      byLocation[loc].sideCounts[side] = (byLocation[loc].sideCounts[side] || 0) + 1
    }
  })

  return Object.entries(byLocation)
    .filter(([, data]) => data.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([location, data]) => {
      const topDishes = Object.entries(data.dishCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
      const topSides = Object.entries(data.sideCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
      return { location, total: data.total, topDishes, topSides }
    })
}

export const buildPrintStats = (ordersList = []) => {
  const sideCounts = {}
  const optionCounts = {}
  const turnCounts = {
    lunch: { orders: 0, items: 0 },
    dinner: { orders: 0, items: 0 }
  }
  const byLocationTurn = {}

  ;(ordersList || []).forEach(order => {
    if (!order) return
    const customResponses = Array.isArray(order.custom_responses) ? order.custom_responses : []
    const turn = (order.service || 'lunch') === 'dinner' ? 'dinner' : 'lunch'
    const itemsQty = Number(order.total_items || 0)

    turnCounts[turn].orders += 1
    turnCounts[turn].items += itemsQty

    const loc = order.location || 'Sin ubicación'
    if (!byLocationTurn[loc]) {
      byLocationTurn[loc] = { lunch: 0, dinner: 0, total: 0 }
    }
    byLocationTurn[loc][turn] += 1
    byLocationTurn[loc].total += 1

    const side = getCustomSideFromResponses(customResponses)
    if (side) {
      sideCounts[side] = (sideCounts[side] || 0) + 1
    }

    getOtherCustomResponses(customResponses).forEach(r => {
      const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
      const key = `${r.title}: ${response || '—'}`
      optionCounts[key] = (optionCounts[key] || 0) + 1
    })
  })

  return { sideCounts, optionCounts, turnCounts, byLocationTurn }
}

export const calculateStats = (ordersData = []) => {
  const byLocation = {}
  const byDish = {}
  let totalItems = 0
  let archived = 0
  let pending = 0

  Array.isArray(ordersData) && ordersData.forEach(order => {
    if (!byLocation[order.location]) {
      byLocation[order.location] = 0
    }
    byLocation[order.location]++

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (item?.name) {
          const normalizedName = normalizeDishName(item.name)
          if (!byDish[normalizedName]) {
            byDish[normalizedName] = 0
          }
          byDish[normalizedName] += item.quantity || 1
        }
      })
    }

    totalItems += order.total_items || 0

    if (order.status === 'archived') {
      archived++
    } else {
      pending++
    }
  })

  return {
    total: ordersData.length,
    byLocation,
    byDish,
    totalItems,
    archived,
    pending
  }
}

export const downloadWorkbook = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1200)
}
