import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conflictDetected, setConflictDetected] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setConflictDetected(false)
      setOtpSent(false)

      const params = new URLSearchParams(window.location.search)
      const isLinkFlow = params.get('link') === '1'
      const isLinkedReturn = params.get('linked') === '1'

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (cancelled) return

      const sessionUser = sessionData?.session?.user
      if (!sessionUser) {
        if (!isLinkFlow) {
          navigate(sessionError ? '/login?confirmed=0' : '/login?confirmed=1', { replace: true })
          return
        }
        setError('No se pudo iniciar sesión. Por favor, intenta nuevamente.')
        setLoading(false)
        return
      }

      const isGoogleProvider =
        sessionUser?.app_metadata?.provider === 'google' ||
        (Array.isArray(sessionUser?.identities) && sessionUser.identities.some((i) => i.provider === 'google'))
      const normalizedEmail = sessionUser.email?.toLowerCase().trim()
      setCurrentEmail(sessionUser.email || '')

      if (!isLinkFlow && !isGoogleProvider) {
        navigate(sessionError ? '/login?confirmed=0' : '/login?confirmed=1', { replace: true })
        return
      }

      if (!normalizedEmail) {
        setError('No se pudo obtener el email del usuario.')
        setLoading(false)
        return
      }

      if (isLinkFlow) {
        const alreadyLinked = Array.isArray(sessionUser.identities) && sessionUser.identities.some((i) => i.provider === 'google')
        if (!alreadyLinked) {
          const { error: linkError } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?linked=1` }
          })
          if (cancelled) return
          if (linkError) {
            setError(linkError.message || 'Error al vincular Google.')
            setLoading(false)
          }
          return
        }
      }

      const { data: existingUser, error: dbError } = await supabase
        .schema('public')
        .from('users')
        .select('id, email')
        .eq('email', normalizedEmail)
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (dbError) {
        setError('No se pudo validar la cuenta. Intenta nuevamente.')
        setLoading(false)
        return
      }

      if (isLinkedReturn) {
        const googleLinked = Array.isArray(sessionUser.identities) && sessionUser.identities.some((i) => i.provider === 'google')
        if (!googleLinked) {
          setError('No se pudo completar el vínculo con Google.')
          setLoading(false)
          return
        }
      }

      const hasConflict = existingUser?.id && existingUser.id !== sessionUser.id
      if (hasConflict) {
        setConflictDetected(true)
        setLoading(false)
        return
      }

      navigate('/', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleStartLinkFlow = async () => {
    if (!currentEmail) {
      setError('No se pudo obtener el email para iniciar el vínculo.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await supabase.auth.signOut()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?link=1` }
      })
      if (otpError) {
        setError(otpError.message || 'Error al enviar el email de verificación.')
        setLoading(false)
        return
      }
      setOtpSent(true)
      setLoading(false)
    } catch (err) {
      setError('Error al iniciar el vínculo con Google. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    setError('')
    try {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError('No se pudo cerrar sesión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-dvh flex flex-col justify-center items-center px-2 py-2 sm:py-4" style={{background: 'linear-gradient(to bottom right, #1a237e, #283593, #303f9f)', minHeight: '100dvh'}}>
      <div className="card bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-white/20 px-6 py-6 sm:px-8 sm:py-8 max-w-lg w-full">
        {error && (
          <div className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-xl font-bold text-sm sm:text-base mb-4">
            {error}
          </div>
        )}

        {conflictDetected ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Cuenta existente detectada
              </h2>
              <p className="text-sm sm:text-base text-gray-700">
                Ya existe una cuenta registrada con este email. Para usar Google en tu cuenta existente, vinculala.
              </p>
            </div>

            {otpSent && (
              <div className="bg-green-50 border-2 border-green-300 text-green-800 px-4 py-3 rounded-xl font-bold text-sm sm:text-base">
                Te enviamos un email para confirmar que sos el dueño. Abrilo para continuar.
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleStartLinkFlow}
                disabled={loading}
                className="w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{background: loading ? '#9e9e9e' : 'linear-gradient(to right, #ff9800, #fb8c00)'}}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)')}
              >
                {loading ? 'Enviando...' : 'Vincular esta cuenta de Google a mi cuenta existente'}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-bold py-3 rounded-xl shadow-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-800 font-semibold">
            {loading ? 'Iniciando sesión...' : 'Redirigiendo...'}
          </div>
        )}
      </div>
    </div>
  )
}
