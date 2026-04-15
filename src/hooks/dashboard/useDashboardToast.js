import { useCallback, useEffect, useRef, useState } from 'react'

export const useDashboardToast = () => {
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = useCallback((message, variant = 'info') => {
    setToast({ message, variant })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  return { toast, showToast }
}

