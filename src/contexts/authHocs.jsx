import { useAuthContext } from './authContextValue'
import LoadingState from '../components/ui/LoadingState'

// HOC para componentes que requieren autenticación
export const withAuth = (_Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="px-3 py-6 sm:px-6">
          <LoadingState message="Cargando..." tone="slate" />
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Sesión expirada o no detectada
            </h2>
            <p className="text-gray-600 mb-6">
              Por favor, recarga la página para intentar restaurar tu sesión.
            </p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return <_Component {...props} />
  }
}

// HOC para componentes que requieren rol de admin
export const withAdmin = (_Component) => {
  return function AdminComponent(props) {
    const { isAdmin, isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="px-3 py-6 sm:px-6">
          <LoadingState message="Verificando permisos..." tone="slate" />
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Sesión expirada o no detectada
            </h2>
            <p className="text-gray-600 mb-6">
              Por favor, recarga la página para intentar restaurar tu sesión.
            </p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    if (!isAdmin) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Acceso denegado
            </h2>
            <p className="text-gray-600 mb-6">
              No tienes permisos para acceder a esta página.
            </p>
            <a
              href="/dashboard"
              className="btn-secondary"
            >
              Ir al dashboard
            </a>
          </div>
        </div>
      )
    }

    return <_Component {...props} />
  }
}
