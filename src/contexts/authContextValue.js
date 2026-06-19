import { createContext, useContext } from 'react'

const AuthContext = createContext()

const useAuthContext = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de un AuthProvider')
  }

  return context
}

export { AuthContext, useAuthContext }
