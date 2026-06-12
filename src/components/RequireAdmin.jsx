import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { notifyWarning } from '../utils/notice'

const AdminLoader = () => (
  <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white font-medium">Verificando permisos...</p>
    </div>
  </div>
)

const AdminDeniedRedirect = () => {
  const navigate = useNavigate()

  useEffect(() => {
    notifyWarning('No tenés permisos para acceder a esta sección.')
    navigate('/dashboard', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-primary-700 via-primary-800 to-primary-900 px-4">
      <div className="max-w-md rounded-xl border border-white/20 bg-white p-6 text-center shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Acceso restringido</h2>
        <p className="mt-2 text-gray-700">No tenés permisos para acceder a esta sección.</p>
      </div>
    </div>
  )
}

export default function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return <AdminLoader />
  }

  if (!user?.id) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (!isAdmin) {
    return <AdminDeniedRedirect />
  }

  return <>{children}</>
}
