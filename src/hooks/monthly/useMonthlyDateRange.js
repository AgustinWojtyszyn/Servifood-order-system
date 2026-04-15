import { useCallback, useEffect, useRef, useState } from 'react'

export const useMonthlyDateRange = ({
  pushLog,
  fetchMetrics,
  resetMetricsState,
  setMetricsLoading,
  setSelectedDate
}) => {
  const [draftRange, setDraftRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const manualFetchRef = useRef(false)

  const isDraftValid = draftRange.start && draftRange.end && draftRange.start <= draftRange.end

  useEffect(() => {
    if (manualFetchRef.current) return
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      fetchMetrics(dateRange)
    }
  }, [dateRange, fetchMetrics])

  const handleClearRange = useCallback(() => {
    setDraftRange({ start: '', end: '' })
    setDateRange({ start: '', end: '' })
    resetMetricsState()
    setSelectedDate(null)
  }, [resetMetricsState, setSelectedDate])

  const handleApplyRange = useCallback(async () => {
    if (!isDraftValid) return
    const newRange = { ...draftRange }
    manualFetchRef.current = true
    setMetricsLoading(true)
    resetMetricsState()
    setSelectedDate(null)
    setDateRange(newRange)
    pushLog?.('apply-range', { range: newRange })
    try {
      await fetchMetrics(newRange)
    } finally {
      manualFetchRef.current = false
    }
  }, [draftRange, fetchMetrics, isDraftValid, pushLog, resetMetricsState, setMetricsLoading, setSelectedDate])

  return {
    draftRange,
    setDraftRange,
    dateRange,
    setDateRange,
    isDraftValid,
    handleClearRange,
    handleApplyRange
  }
}

