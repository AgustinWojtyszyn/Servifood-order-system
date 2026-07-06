import { Navigate, useLocation } from 'react-router-dom'

export default function RequireUser({ user, loading, children }) {
  const location = useLocation()

  if (loading) {
    return user?.id ? <>{children}</> : null
  }

  if (!user?.id) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}
