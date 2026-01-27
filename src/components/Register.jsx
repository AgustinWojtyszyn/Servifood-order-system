import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../supabaseClient'
import { Eye, EyeOff, CheckCircle, Mail, AlertCircle } from 'lucide-react'
import servifoodLogo from '../assets/servifood logo.jpg'

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    if (!formData.fullName || !formData.email) {
      setError('Completa tu nombre y correo electrónico')
      return
    }
    setError('')
    setStep(2)
  }

  const handleBackStep = (e) => {
    e.preventDefault()
    setStep(1)
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await auth.signUp(formData.email, formData.password, {
        full_name: formData.fullName
      })

      if (error) {
        console.error('Error de registro:', error)
        
        // Mensajes de error más específicos
        if (error.message.includes('already registered')) {
          setError('Este correo electrónico ya está registrado. Por favor, inicia sesión.')
        } else if (error.message.includes('invalid email')) {
          setError('El correo electrónico no es válido')
        } else {
          setError(error.message || 'Error al crear la cuenta')
        }
      } else {
        console.log('Usuario registrado exitosamente:', data)
        setUserEmail(formData.email)
        setSuccess(true)
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err)
      setError(`Error al crear la cuenta: ${err.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden flex flex-col justify-center py-4 px-2 sm:py-8 sm:px-6 lg:px-8" style={{background: 'linear-gradient(to bottom right, #1a237e, #283593, #303f9f)', minHeight: '100dvh'}}>
        <div className="w-full max-w-md mx-4 sm:mx-auto flex flex-col flex-1 justify-center" style={{paddingBottom: '2rem'}}>
          <div className="text-center bg-white rounded-3xl shadow-2xl p-10 border-4 border-white/20 mt-4 mb-4">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 rounded-full p-4">
                <Mail className="h-20 w-20 text-blue-600" />
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              ¡Verifica tu email!
            </h2>
            <p className="text-lg text-gray-700 mb-4 font-semibold">
              Te hemos enviado un correo de verificación a:
            </p>
            <p className="text-lg text-blue-600 font-bold mb-6 break-all">
              {userEmail}
            </p>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-yellow-800 mb-2">
                    ⚠️ Importante:
                  </p>
                  <p className="text-sm text-yellow-700">
                    Debés confirmar tu correo electrónico antes de poder iniciar sesión. 
                    Revisá tu bandeja de entrada y haz clic en el enlace de verificación.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-bold text-gray-800 mb-3">
                📧 Pasos a seguir:
              </p>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Abre tu correo electrónico</li>
                <li>Busca el email de ServiFood / Supabase</li>
                <li>Hacé clic en el enlace de confirmación</li>
                <li>Regresá acá e inicia sesión</li>
              </ol>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              💡 <strong>Tip:</strong> Si no encuentras el correo, revisa tu carpeta de spam o correo no deseado.
            </p>
            
            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="block w-full text-white font-bold py-4 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{background: 'linear-gradient(to right, #2196f3, #1976d2)'}}
              >
                Ir a Iniciar Sesión
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="block w-full text-gray-700 font-semibold py-3 px-6 text-base rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Registrar otra cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-[100dvh] flex flex-col justify-center items-center px-2 py-2 sm:py-4" style={{background: 'linear-gradient(to bottom right, #1a237e, #283593, #303f9f)', minHeight: '100dvh'}}>
      <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center" style={{maxHeight: '98vh'}}>
        <div className="text-center mb-2 sm:mb-6 pt-1 pb-1">
          <div className="flex justify-center mb-2 sm:mb-4">
            <img 
              src={servifoodLogo} 
              alt="Servifood Catering Logo" 
              className="max-h-20 sm:max-h-32 md:max-h-40 w-auto object-contain"
              style={{maxWidth: '90vw'}}
            />
          </div>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-2xl mb-1 sm:mb-2">
            Crear Cuenta
          </h2>
          <p className="text-sm sm:text-lg md:text-xl font-bold text-white drop-shadow-lg mb-1 sm:mb-2">
            ¡Unite a ServiFood!
          </p>
          <p className="text-xs sm:text-base md:text-lg drop-shadow" style={{color: 'rgba(255, 255, 255, 0.9)'}}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold hover:underline transition-colors" style={{color: '#ffa726'}}>
              Inicia sesión aquí
            </Link>
          </p>
          <p className="text-xs sm:text-sm mt-1">
            <Link to="/" className="font-semibold hover:underline" style={{color: '#ffcc80'}}>
              ← Volver al inicio
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-8 border-4 border-white/20" style={{maxHeight: 'none', overflow: 'visible', minWidth: '320px', width: '100%'}}>
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleNextStep}>
              {error && (
                <div className="bg-red-50 border-2 border-red-400 text-red-800 px-5 py-4 rounded-xl font-bold text-base">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="fullName" className="block text-base font-bold text-gray-900 mb-2">
                  Nombre Completo
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="input-field text-base font-medium bg-white text-gray-900"
                  placeholder="Juan Pérez"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-base font-bold text-gray-900 mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field text-base font-medium bg-white text-gray-900"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center text-white font-bold py-4 px-6 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  style={{background: 'linear-gradient(to right, #ff9800, #fb8c00)'}}
                >
                  Siguiente
                </button>
              </div>
            </form>
          )}
          {step === 2 && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-2 border-red-400 text-red-800 px-5 py-4 rounded-xl font-bold text-base">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="password" className="block text-base font-bold text-gray-900 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12 text-base font-medium bg-white text-gray-900"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-base font-bold text-gray-900 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12 text-base font-medium bg-white text-gray-900"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="w-1/2 flex justify-center items-center text-gray-700 font-bold py-4 px-6 text-lg rounded-xl shadow-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  onClick={handleBackStep}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  style={{background: loading ? '#9e9e9e' : 'linear-gradient(to right, #ff9800, #fb8c00)'}}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)')}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Creando tu cuenta...
                    </>
                  ) : (
                    'Crear Cuenta Gratis'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
