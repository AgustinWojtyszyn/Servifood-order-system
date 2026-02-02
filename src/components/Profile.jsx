import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Mail, Save, CheckCircle, AlertCircle } from 'lucide-react'
import RequireUser from './RequireUser'

const Profile = ({ user, loading }) => {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [lastUpdateInfo, setLastUpdateInfo] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    setFormData({
      fullName: user.user_metadata?.full_name || '',
      email: user.email || ''
    })
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    if (!user?.id) {
      setMessage({ type: 'error', text: 'No se pudo validar el usuario. Intenta nuevamente.' })
      setSubmitting(false)
      return
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const nameChanged = formData.fullName !== (user.user_metadata?.full_name || '')
    const emailChanged = formData.email !== user.email
    const lastNameChange = user.user_metadata?.full_name_last_changed_at ? new Date(user.user_metadata.full_name_last_changed_at).getTime() : null
    const lastEmailChange = user.user_metadata?.email_last_changed_at ? new Date(user.user_metadata.email_last_changed_at).getTime() : null

    const canChangeName = !nameChanged || !lastNameChange || (now - lastNameChange) >= ONE_DAY_MS
    const canChangeEmail = !emailChanged || !lastEmailChange || (now - lastEmailChange) >= ONE_DAY_MS

    if (!canChangeName) {
      const remainingHours = Math.ceil((ONE_DAY_MS - (now - lastNameChange)) / (60 * 60 * 1000))
      setMessage({ type: 'error', text: `Solo puedes cambiar el nombre cada 24 horas. Intenta de nuevo en ${remainingHours}h.` })
      setSubmitting(false)
      return
    }

    if (!canChangeEmail) {
      const remainingHours = Math.ceil((ONE_DAY_MS - (now - lastEmailChange)) / (60 * 60 * 1000))
      setMessage({ type: 'error', text: `Solo puedes cambiar el correo cada 24 horas. Intenta de nuevo en ${remainingHours}h.` })
      setSubmitting(false)
      return
    }

    try {
      const metadata = {
        ...(user.user_metadata || {}),
        full_name: formData.fullName
      }

      if (nameChanged) {
        metadata.full_name_last_changed_at = new Date().toISOString()
      }
      if (emailChanged) {
        metadata.email_last_changed_at = new Date().toISOString()
      }

      const payload = { data: metadata }
      if (emailChanged) {
        payload.email = formData.email
      }

      const { error } = await supabase.auth.updateUser(payload)

      if (error) {
        setMessage({
          type: 'error',
          text: error.message
        })
        setLastUpdateInfo(null)
      } else {
        setLastUpdateInfo({
          emailChanged,
          fullNameChanged: nameChanged,
          email: formData.email
        })
        setMessage({
          type: 'success',
          text: emailChanged
            ? 'Perfil actualizado. Hemos enviado un correo de verificación a tu nueva dirección de email.'
            : '¡Perfil actualizado exitosamente!'
        })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Error al actualizar el perfil'
      })
      setLastUpdateInfo(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div className="p-3 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2">Mi Perfil</h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-lg mt-2">Actualiza tu información personal</p>
      </div>

      <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20 max-w-4xl w-full mx-auto p-8 sm:p-10">
        <div className="mb-4 sm:mb-5 text-sm sm:text-base text-amber-800 bg-amber-50 border border-amber-300 rounded-xl p-3 sm:p-4 font-semibold">
          Solo puedes cambiar tu nombre o correo <b>una vez cada 24 horas</b>. Si cambias el correo, te enviaremos un email al nuevo correo para confirmarlo.
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {message.text && (
            <div className={`border-2 px-4 sm:px-5 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 sm:gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : 'bg-red-50 border-red-400 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              )}
              <span className="flex-1">{message.text}</span>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm sm:text-base font-bold text-gray-800 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="input-field pl-9 sm:pl-10 text-sm sm:text-base font-medium"
                placeholder="Tu nombre completo"
                value={formData.fullName}
                onChange={handleChange}
              />
              <User className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 font-semibold">Recuerda: solo puedes actualizar el nombre cada 24 horas.</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm sm:text-base font-bold text-gray-800 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field pl-9 sm:pl-10 text-sm sm:text-base font-medium"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              <Mail className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            {formData.email !== user?.email && (
              <p className="mt-2 text-xs sm:text-sm text-amber-600 font-semibold">
                Si cambiás tu email, deberás verificar la nueva dirección.
              </p>
            )}
            <p className="mt-1 text-xs sm:text-sm text-gray-600 font-semibold">Solo puedes actualizar el correo cada 24 horas.</p>
          </div>

          <div className="flex gap-3 sm:gap-4 pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={loading || submitting}
              className="flex-1 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              style={{background: (loading || submitting) ? '#9e9e9e' : 'linear-gradient(to right, #ff9800, #fb8c00)'}}
              onMouseEnter={(e) => !(loading || submitting) && (e.currentTarget.style.background = 'linear-gradient(to right, #fb8c00, #f57c00)')}
              onMouseLeave={(e) => !(loading || submitting) && (e.currentTarget.style.background = 'linear-gradient(to right, #ff9800, #fb8c00)')}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>

        {lastUpdateInfo && message.type === 'success' && (
          <div className="mt-6 sm:mt-8 p-4 sm:p-5 rounded-xl border-2 border-green-300 bg-green-50 text-green-900 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5" />
              <p className="font-bold text-base sm:text-lg">Cambios guardados correctamente</p>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base font-semibold">
              {lastUpdateInfo.fullNameChanged && <li>Nombre actualizado.</li>}
              {lastUpdateInfo.emailChanged && (
                <li>
                  Enviamos un correo de verificación a <b>{lastUpdateInfo.email}</b>. Revisa tu bandeja y confirma para finalizar el cambio.
                </li>
              )}
              {!lastUpdateInfo.fullNameChanged && !lastUpdateInfo.emailChanged && (
                <li>No hubo cambios en nombre o correo.</li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-200">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Información de la Cuenta</h3>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
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
    </RequireUser>
  )
}

export default Profile
