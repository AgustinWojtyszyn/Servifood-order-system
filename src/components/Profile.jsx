import { useState, useEffect } from 'react'
import { auth } from '../supabaseClient'
import { User, Mail, Save, CheckCircle, AlertCircle } from 'lucide-react'

const Profile = ({ user }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    const emailChanged = formData.email !== user.email

    try {
      const { error } = await auth.updateProfile({
        full_name: formData.fullName,
        email: formData.email
      })

      if (error) {
        setMessage({
          type: 'error',
          text: error.message
        })
      } else {
        if (emailChanged) {
          setMessage({
            type: 'success',
            text: 'Perfil actualizado. Hemos enviado un correo de verificación a tu nueva dirección de email.'
          })
        } else {
          setMessage({
            type: 'success',
            text: '¡Perfil actualizado exitosamente!'
          })
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Error al actualizar el perfil'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-5xl font-bold text-white drop-shadow-2xl mb-2">Mi Perfil</h1>
        <p className="text-xl text-white/90 drop-shadow-lg mt-2">Actualiza tu información personal</p>
      </div>

      <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message.text && (
            <div className={`border-2 px-5 py-4 rounded-xl font-bold text-base flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : 'bg-red-50 border-red-400 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-base font-bold text-gray-800 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="input-field pl-10 text-base font-medium"
                placeholder="Tu nombre completo"
                value={formData.fullName}
                onChange={handleChange}
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-base font-bold text-gray-800 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field pl-10 text-base font-medium"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {formData.email !== user?.email && (
              <p className="mt-2 text-sm text-amber-600 font-semibold">
                Si cambias tu email, deberás verificar la nueva dirección.
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              style={{background: loading ? '#9e9e9e' : 'linear-gradient(to right, #ff9800, #fb8c00)'}}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)')}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Información de la Cuenta</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-semibold">Rol:</span> {user?.user_metadata?.role || 'user'}</p>
            <p><span className="font-semibold">Cuenta creada:</span> {new Date(user?.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
