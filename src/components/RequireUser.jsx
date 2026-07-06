import { Navigate, useLocation } from 'react-router-dom'
import LoadingState from './ui/LoadingState'

export default function RequireUser({ user, loading, children }) {
  const location = useLocation()

  if (loading) {
    return <LoadingState variant="fullscreen" message="Cargando..." />
  }

  if (!user?.id) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}
