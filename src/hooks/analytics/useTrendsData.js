import { useEffect, useMemo, useRef, useState } from 'react'
import { filterOrdersByCompany } from '../../utils/daily/dailyOrderCalculations'
import {
  buildBifeCounts,
  buildMenuCounts,
  buildRanking,
  buildSideBucketsFromOrders,
  fetchOrdersByRange
} from '../../utils/analytics/trendsHelpers'

export const useTrendsData = ({ company, dateRange }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchId = useRef(0)

  useEffect(() => {
    let mounted = true
    const loadOrders = async () => {
      const currentId = ++fetchId.current
      try {
        setLoading(true)
        setError(null)
        const data = await fetchOrdersByRange({
          start: dateRange?.start || '',
          end: dateRange?.end || ''
        })
        if (!mounted || currentId !== fetchId.current) return
        setOrders(data || [])
      } catch (err) {
        if (!mounted || currentId !== fetchId.current) return
        setError(err)
      } finally {
        if (mounted && currentId === fetchId.current) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    return () => {
      mounted = false
    }
  }, [dateRange?.start, dateRange?.end])

  const filteredOrders = useMemo(() => {
    let list = orders || []
    if (company && company !== 'all') {
      list = filterOrdersByCompany(list, company)
    }
    return list
  }, [orders, company])

  const menuRanking = useMemo(() => buildRanking(buildMenuCounts(filteredOrders)), [filteredOrders])
  const bifeRanking = useMemo(() => buildRanking(buildBifeCounts(filteredOrders)), [filteredOrders])

  const sideBuckets = useMemo(() => buildSideBucketsFromOrders(filteredOrders), [filteredOrders])
  const sidesRanking = useMemo(() => buildRanking(sideBuckets.tiposGuarniciones), [sideBuckets])
  const beveragesRanking = useMemo(() => buildRanking(sideBuckets.tiposBebidas), [sideBuckets])

  const topMenu = menuRanking.items[0]?.label || '—'
  const topBife = bifeRanking.items[0]?.label || '—'
  const topSide = sidesRanking.items[0]?.label || '—'
  const topBeverage = beveragesRanking.items[0]?.label || '—'

  const optionRanking = useMemo(() => {
    const optionItems = menuRanking.items.filter(item => /^Opción\s+\d+/i.test(item.label))
    return { items: optionItems }
  }, [menuRanking.items])

  const mainMenuRanking = useMemo(() => {
    const mainItems = menuRanking.items.filter(item => !/^Opción\s+\d+/i.test(item.label))
    return { items: mainItems }
  }, [menuRanking.items])

  return {
    loading,
    error,
    totalOrders: filteredOrders.length,
    menuRanking,
    optionRanking,
    mainMenuRanking,
    bifeRanking,
    sidesRanking,
    beveragesRanking,
    topMenu,
    topBife,
    topSide,
    topBeverage
  }
}
