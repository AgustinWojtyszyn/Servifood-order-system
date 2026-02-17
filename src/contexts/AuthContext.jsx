import { createContext, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'

// Crear contexto
const AuthContext = createContext()

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar el contexto
export const useAuthContext = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de un AuthProvider')
  }

  return context
}

// HOC para componentes que requieren autenticación
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="animate-pulse-slow">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-200 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Intentar refrescar la sesión y recargar la página actual
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

    return <Component {...props} />
  }
}

// HOC para componentes que requieren rol de admin
export const withAdmin = (Component) => {
  return function AdminComponent(props) {
    const { isAdmin, isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="animate-pulse-slow">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-200 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Verificando permisos...</p>
            </div>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Intentar refrescar la sesión y recargar la página actual
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

    return <Component {...props} />
  }
}

// HOC para componentes que requieren rol de superadmin
export const withSuperAdmin = (Component) => {
  return function SuperAdminComponent(props) {
    const { isSuperAdmin, isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="animate-pulse-slow">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-200 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Verificando permisos...</p>
            </div>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Acceso requerido
            </h2>
            <p className="text-gray-600 mb-6">
              Debes iniciar sesión para acceder a esta página.
            </p>
            <a
              href="/login"
              className="btn-primary"
            >
              Iniciar sesión
            </a>
          </div>
        </div>
      )
    }

    if (!isSuperAdmin) {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Acceso denegado
            </h2>
            <p className="text-gray-600 mb-6">
              Se requieren permisos de superadministrador.
            </p>
            <a
              href="/admin"
              className="btn-secondary"
            >
              Ir al panel de admin
            </a>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}
