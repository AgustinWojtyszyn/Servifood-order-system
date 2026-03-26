import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '../../supabaseClient'
import { matchesOverrideKeyword } from '../../utils/order/orderBusinessRules'

const useAdminOptionsData = ({ enabled = true, initialDessertDate = '' } = {}) => {
  const [customOptions, setCustomOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [dessertOption, setDessertOption] = useState(null)
  const [dessertOverrideDate, setDessertOverrideDate] = useState(initialDessertDate)
  const [dessertOverrideEnabled, setDessertOverrideEnabled] = useState(false)
  const [loadingDessertOverride, setLoadingDessertOverride] = useState(false)

  const fetchDessertOverride = useCallback(async (optionId, date) => {
    if (!optionId || !date) return
    try {
      setLoadingDessertOverride(true)
      const { data, error } = await db.getCustomOptionOverride({ optionId, date })
      if (error) {
        console.error('Error fetching dessert override', error)
        return
      }
      setDessertOverrideEnabled(!!data?.enabled)
    } catch (err) {
      console.error('Error fetching dessert override', err)
    } finally {
      setLoadingDessertOverride(false)
    }
  }, [])

  const refreshOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const optionsResult = await db.getCustomOptions()
      if (optionsResult.error) {
        console.error('Error fetching custom options:', optionsResult.error)
        return
      }

      const opts = optionsResult.data || []
      setCustomOptions(opts)

      const dessert = Array.isArray(opts)
        ? opts.find(o => o?.title && o.title.toLowerCase().includes('postre'))
        : null
      setDessertOption(dessert || null)
      if (dessert) {
        await fetchDessertOverride(dessert.id, dessertOverrideDate)
      }
    } catch (err) {
      console.error('Error fetching options:', err)
    } finally {
      setOptionsLoading(false)
    }
  }, [dessertOverrideDate, fetchDessertOverride])

  useEffect(() => {
    if (!enabled) return
    refreshOptions()
  }, [enabled, refreshOptions])

  useEffect(() => {
    if (!dessertOption?.id) return
    fetchDessertOverride(dessertOption.id, dessertOverrideDate)
  }, [dessertOption, dessertOverrideDate, fetchDessertOverride])

  const isDinnerOption = (option) => {
    if (!option) return false
    const title = (option.title || '').toString()
    if (matchesOverrideKeyword(title)) return true
    const opts = Array.isArray(option.options) ? option.options : []
    return opts.some((opt) => matchesOverrideKeyword(opt))
  }

  const optionsWithoutDinner = useMemo(
    () => customOptions.filter(opt => !isDinnerOption(opt)),
    [customOptions]
  )

  return {
    customOptions,
    optionsWithoutDinner,
    optionsLoading,
    refreshOptions,
    dessertOption,
    dessertOverrideDate,
    setDessertOverrideDate,
    dessertOverrideEnabled,
    setDessertOverrideEnabled,
    loadingDessertOverride,
    setLoadingDessertOverride
  }
}

export { useAdminOptionsData }
