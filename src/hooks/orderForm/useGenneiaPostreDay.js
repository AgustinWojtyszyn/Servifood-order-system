import { useMemo } from 'react'

export const useGenneiaPostreDay = ({ isGenneia }) => {
  const argentinaWeekday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
    } catch (_err) {
      return new Date().toLocaleDateString('es-AR', { weekday: 'long' })
    }
  }, [])

  const normalizedWeekday = useMemo(
    () => (argentinaWeekday || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    [argentinaWeekday]
  )

  const isGenneiaPostreDay = !!isGenneia && (normalizedWeekday === 'lunes' || normalizedWeekday === 'miercoles')

  return { isGenneiaPostreDay }
}
