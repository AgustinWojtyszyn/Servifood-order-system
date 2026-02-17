import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../supabaseClient'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import servifoodLogo from '../assets/servifood logo.jpg'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inFlightRef = useRef(false)

  const COOLDOWN_MS = 60 * 1000
  const getCooldownKey = (value) => `pw_reset_last_${encodeURIComponent(value)}`
  const getLastResetAt = (value) => {
    try {
      return Number(localStorage.getItem(getCooldownKey(value)) || 0)
    } catch {
      return 0
    }
  }
  const setLastResetAt = (value, ts) => {
    try {
      localStorage.setItem(getCooldownKey(value), String(ts))
    } catch {
      // ignore storage errors
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true)
    setError('')
    try {
      const normalizedEmail = (email || '').trim().toLowerCase()
      const last = normalizedEmail ? getLastResetAt(normalizedEmail) : 0
      if (normalizedEmail && last && (Date.now() - last) < COOLDOWN_MS) {
        setError('Error al enviar el correo de recuperación')
        return
      }

      const { error } = await auth.resetPassword(normalizedEmail)

      if (error) {
        setError(error.message || 'Error al enviar el correo de recuperación')
        return
      }

      if (normalizedEmail) setLastResetAt(normalizedEmail, Date.now())
      setSuccess(true)
    } catch (err) {
      setError('Error al enviar el correo de recuperación')
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8" style={{background: 'linear-gradient(to bottom right, #1a237e, #283593, #303f9f)'}}>
        <div className="max-w-md w-full">
          <div className="text-center bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 border-4 border-white/20">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-green-100 rounded-full p-3 sm:p-4">
                <CheckCircle className="h-14 w-14 sm:h-20 sm:w-20 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">
              ¡Correo enviado!
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
              Hemos enviado un enlace de recuperación a tu correo electrónico.
            </p>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
            <div className="mt-4 sm:mt-6">
              <Link
                to="/login"
                className="inline-block text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{background: 'linear-gradient(to right, #ff9800, #fb8c00)'}}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)'}
              >
                Volver al Inicio de Sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8" style={{background: 'linear-gradient(to bottom right, #1a237e, #283593, #303f9f)'}}>
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img 
              src={servifoodLogo} 
              alt="Servifood Catering Logo" 
              className="h-24 sm:h-32 md:h-40 w-auto"
            />
          </div>
          <h2 className="mt-4 sm:mt-8 text-3xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-2xl">
            Recuperar Contraseña
          </h2>
          <p className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-white drop-shadow-lg">
            Ingresa tu correo electrónico
          </p>
          <p className="mt-2 text-xs sm:text-sm" style={{color: 'rgba(255, 255, 255, 0.8)'}}>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{color: '#ffa726'}}>
              Inicia sesión aquí
            </Link>
          </p>
        </div>

        <div className="card bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-white/20">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field pl-10 border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{background: loading ? '#9e9e9e' : 'linear-gradient(to right, #ff9800, #fb8c00)'}}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)')}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>

              <Link
                to="/login"
                className="w-full flex justify-center items-center gap-2 py-3 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
