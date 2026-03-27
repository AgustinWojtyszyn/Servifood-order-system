import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth'
import { safeLocalStorage } from '../utils'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const logRoleDebug = (...args) => {
    if (import.meta.env.DEV) {
      console.log('[Auth][role-debug]', ...args)
    }
  }

  // Cargar usuario inicial
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { session, error } = await authService.getSession()

        if (error) {
          if (import.meta.env.DEV) {
            console.error('[Auth] getSession error', error)
          }
          throw error
        }

        if (import.meta.env.DEV) {
          console.log('[Auth] initial session', session ? 'found' : 'none')
        }

        if (session?.user) {
          await loadUserData(session.user)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listener para cambios de autenticación
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV) {
        console.log('[Auth] onAuthStateChange', event, session ? 'has session' : 'no session')
      }
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = useCallback(async (authUser) => {
    try {
      if (import.meta.env.DEV) {
        console.log('[Auth] loadUserData start', authUser?.id)
      }
      // Usar directamente los datos del usuario de Supabase sin consultar tabla users
      const adminAllowlist = [
        'ae177d76-9f35-44ac-a662-1b1e4146dbe4',
        '0732486b-6b27-4bf6-bf25-42d84b47662b'
      ]
      const roleFromMetadata = authUser?.user_metadata?.role || authUser?.app_metadata?.role || authUser?.role
      const normalizedRole = roleFromMetadata || (adminAllowlist.includes(authUser?.id) ? 'admin' : null)
      const isAdminRole = normalizedRole === 'admin'

      logRoleDebug('raw user metadata', {
        id: authUser?.id,
        email: authUser?.email,
        roleFromMetadata,
        app_metadata: authUser?.app_metadata,
        user_metadata: authUser?.user_metadata
      })

      setUser((prev) => prev || { ...authUser, role: normalizedRole })
      setIsAdmin(isAdminRole)

      logRoleDebug('computed flags', {
        isAdmin: isAdminRole
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      setUser((prev) => prev || authUser)
      setIsAdmin(false)
    } finally {
      if (import.meta.env.DEV) {
        console.log('[Auth] loadUserData done')
      }
      setLoading(false)
    }
  }, [])

  const signIn = useCallback(async (email, password, rememberMe = false) => {
    setLoading(true)
    try {
      const result = await authService.signIn(email, password, rememberMe)

      if (result.error) {
        setLoading(false)
        return result
      }

      // Usuario ya se cargará automáticamente por el listener
      return result
    } catch (error) {
      setLoading(false)
      return { data: null, error }
    }
  }, [])

  const signUp = useCallback(async (email, password, metadata = {}) => {
    setLoading(true)
    try {
      const result = await authService.signUp(email, password, metadata)

      if (result.error) {
        setLoading(false)
        return result
      }

      // Usuario ya se cargará automáticamente por el listener
      return result
    } catch (error) {
      setLoading(false)
      return { data: null, error }
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const result = await authService.signOut()

      if (result.error) {
        setLoading(false)
        return result
      }

      // Usuario ya se limpiará automáticamente por el listener
      return result
    } catch (error) {
      setLoading(false)
      return { data: null, error }
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: { message: 'Usuario no autenticado' } }

    try {
      const result = await authService.updateProfile(updates)

      if (result.error) {
        return result
      }

      // Actualizar estado local
      setUser(prev => prev ? { ...prev, ...updates } : null)

      return result
    } catch (error) {
      return { data: null, error }
    }
  }, [user])

  const updatePassword = useCallback(async (newPassword) => {
    try {
      return await authService.updatePassword(newPassword)
    } catch (error) {
      return { data: null, error }
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      return await authService.resetPassword(email)
    } catch (error) {
      return { data: null, error }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const result = await authService.refreshSession()

      if (result.error) {
        return result
      }

      // Recargar datos del usuario si es necesario
      if (result.data?.user) {
        await loadUserData(result.data.user)
      }

      return result
    } catch (error) {
      return { data: null, error }
    }
  }, [loadUserData])

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Auth] state', { user, loading, isAdmin })
    }
  }, [user, loading, isAdmin])

  return {
    // Estado
    user,
    loading,
    isAdmin,
    isAuthenticated: !!user,

    // Acciones
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    refreshSession
  }
}
