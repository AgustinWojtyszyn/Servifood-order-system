import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth'
import { usersService } from '../services/users'
import { safeLocalStorage } from '../utils'

export const useAuth = () => {
  // Persistencia local
  const LOCAL_KEY = 'servifood_user'
  const [user, setUser] = useState(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Cargar usuario inicial y reforzar recuperación de sesión
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[Auth] Inicializando recuperación de sesión...')
      // Diagnóstico: mostrar claves de localStorage y Supabase antes de recuperar sesión
      Object.keys(window.localStorage).forEach(k => {
        if (k.startsWith('sb-')) {
          console.log('[Auth] Clave Supabase en localStorage (antes de recuperar sesión):', k, window.localStorage.getItem(k))
        }
      })
      try {
        let result = await authService.getSession()
        let session = result?.data?.session || result?.session
        let error = result?.error
        if (error) {
          console.error('[Auth] Error al obtener sesión:', error)
        }
        if (session?.user) {
          console.log('[Auth] Sesión encontrada tras refresh:', session.user)
          await loadUserData(session.user)
        } else {
          // Intentar refresh manual del token de sesión
          console.log('[Auth] Intentando refresh manual de sesión Supabase...')
          try {
            const refreshResult = await authService.refreshSession()
            if (refreshResult?.data?.user) {
              console.log('[Auth] Sesión recuperada tras refresh manual:', refreshResult.data.user)
              await loadUserData(refreshResult.data.user)
              return
            }
          } catch (refreshError) {
            console.warn('[Auth] Error en refresh manual:', refreshError)
          }
          // Fallback: intentar recuperar usuario de localStorage y re-loguear
          const stored = window.localStorage.getItem(LOCAL_KEY)
          if (stored) {
            try {
              const localUser = JSON.parse(stored)
              console.log('[Auth] Usuario recuperado de localStorage:', localUser)
              // Si tienes email y password guardados, podrías intentar signIn automático aquí
              // await signIn(localUser.email, localUser.password, true)
              await loadUserData(localUser)
            } catch (e) {
              console.warn('[Auth] Error parseando usuario localStorage:', e)
              setLoading(false)
            }
          } else {
            console.warn('[Auth] No hay sesión activa tras refresh, ni tras refresh manual, ni usuario en localStorage. Mostrando landing/login.')
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('[Auth] Error inicializando sesión:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listener para cambios de autenticación
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Evento de sesión: ${event}`)
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] Usuario autenticado:', session.user)
        await loadUserData(session.user)
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] Usuario ha cerrado sesión.')
        setUser(null)
        window.localStorage.removeItem(LOCAL_KEY)
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = useCallback(async (authUser) => {
    try {
      // Obtener datos adicionales del usuario desde la tabla users
      const { data: userData } = await usersService.getUserById(authUser.id)

      let fullUser
      if (userData) {
        fullUser = {
          ...authUser,
          ...userData,
          user_metadata: {
            ...authUser.user_metadata,
            ...userData
          }
        }
      } else {
        fullUser = authUser
      }
      setUser(fullUser)
      // Guardar en localStorage para persistencia
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(fullUser))
      } catch {}

      // Verificar roles
      const adminStatus = await usersService.isUserAdmin(authUser.id)
      const superAdminStatus = await usersService.isUserSuperAdmin(authUser.id)
      setIsAdmin(adminStatus)
      setIsSuperAdmin(superAdminStatus)
    } catch (error) {
      console.error('Error loading user data:', error)
      setUser(authUser)
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(authUser))
      } catch {}
      setIsAdmin(false)
      setIsSuperAdmin(false)
    } finally {
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

  return {
    // Estado
    user,
    loading,
    isAdmin,
    isSuperAdmin,
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
