import { useAuth } from '../hooks/useAuth'
import { AuthContext } from './authContextValue'

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}
