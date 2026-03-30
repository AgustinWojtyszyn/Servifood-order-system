import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ordersService } from '../services/orders'
import { Plus, Minus, X, Clock, AlertTriangle, Save, CheckCircle } from 'lucide-react'
import { isOrderEditable } from '../utils'
import { EDIT_WINDOW_MINUTES } from '../constants/orderRules'
import { notifyInfo } from '../utils/notice'
import RequireUser from './RequireUser'
import { COMPANY_LOCATIONS } from '../constants/companyConfig'
import EditOrderCustomOptionsSection from './edit-order/EditOrderCustomOptionsSection'
import EditOrderPersonalInfoSection from './edit-order/EditOrderPersonalInfoSection'
import EditOrderSummarySection from './edit-order/EditOrderSummarySection'
import EditOrderMenuSection from './edit-order/EditOrderMenuSection'
import { Sound } from '../utils/Sound'
import { getTomorrowISOInTimeZone } from '../utils/dateUtils'


export default function EditOrderForm({ user, loading }) {
  const [menuItems, setMenuItems] = useState([])
  const [customOptions, setCustomOptions] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [selectedItems, setSelectedItems] = useState({})
  const [formData, setFormData] = useState({
    location: '',
    name: '',
    email: '',
    phone: '',
    comments: ''
  })
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const order = location.state?.order

  const locations = COMPANY_LOCATIONS

  useEffect(() => {
    if (!order) {
      navigate('/dashboard')
      return
    }

    if (!isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)) {
      notifyInfo(`Solo puedes editar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos de haberlo creado.`)
      navigate('/dashboard')
      return
    }

    fetchMenuItems()
    fetchCustomOptions()
    loadOrderData()
  }, [order, navigate])

  useEffect(() => {
    if (success) {
      Sound.playSuccess()
    }
  }, [success])

  const loadOrderData = () => {
    if (!order) return

    // Load form data
    setFormData({
      location: order.location || '',
      name: order.customer_name || user?.user_metadata?.full_name || '',
      email: order.customer_email || user?.email || '',
      phone: order.customer_phone || '',
      comments: order.comments || ''
    })

    // Load selected items
    const selected = {}
    if (order.items) {
      order.items.forEach(item => {
        selected[item.id] = true
      })
    }
    setSelectedItems(selected)

    // Load custom responses
    const responses = {}
    if (order.custom_responses) {
      order.custom_responses.forEach(resp => {
        responses[resp.option_id] = resp.response
      })
    }
    setCustomResponses(responses)
  }

  const extractNumber = (name) => {
    const match = name?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : Infinity
  }

  const sortMenuItems = (items) => {
    return [...items].sort((a, b) => extractNumber(a.name) - extractNumber(b.name))
  }

  const fetchMenuItems = async () => {
    try {
      const fallbackDate = getTomorrowISOInTimeZone()
      const menuDate = order?.delivery_date || fallbackDate
      const { data, error } = await db.getMenuItemsByDate(menuDate)

      if (error) {
        console.error('Error fetching menu:', error)
        // Set default menu items if none exist
        setMenuItems(sortMenuItems([
          { id: 1, name: 'Plato Principal 1', description: 'Delicioso plato principal' },
          { id: 2, name: 'Plato Principal 2', description: 'Otro plato delicioso' },
          { id: 3, name: 'Plato Principal 3', description: 'Plato especial del día' },
          { id: 4, name: 'Plato Principal 4', description: 'Plato vegetariano' },
          { id: 5, name: 'Plato Principal 5', description: 'Plato de la casa' },
          { id: 6, name: 'Plato Principal 6', description: 'Plato recomendado' }
        ]))
      } else {
        setMenuItems(sortMenuItems(data || []))
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchCustomOptions = async () => {
    try {
      const fallbackDate = getTomorrowISOInTimeZone()
      const deliveryDate = order?.delivery_date || fallbackDate
      const service = order?.service || 'lunch'
      const filterByMealScope = (options = [], meal) =>
        (options || []).filter(opt => {
          const scope = opt?.meal_scope || (opt?.dinner_only ? 'dinner' : 'both')
          return scope === 'both' || scope === meal
        })
      const { data, error } = await db.getVisibleCustomOptions({
        company: order?.company || order?.company_id || null,
        meal: service,
        date: deliveryDate
      })
      if (!error && data) setCustomOptions(filterByMealScope(data, service))
      if (error) console.error('Error fetching visible custom options:', error)
    } catch (err) {
      console.error('Error fetching custom options:', err)
    }
  }

  const handleItemSelect = (itemId, isSelected) => {
    const item = menuItems.find(m => m.id === itemId)
    const isEnsalada = item?.name?.toLowerCase().includes('ensalada')

    if (isSelected) {
      // Si está seleccionando
      if (isEnsalada) {
        // Para ensaladas, solo permitir 1
        setSelectedItems(prev => ({
          ...prev,
          [itemId]: true
        }))
      } else {
        // Para menús principales, verificar si ya hay uno seleccionado
        const mainMenuSelected = menuItems
          .filter(m => !m.name?.toLowerCase().includes('ensalada'))
          .some(m => selectedItems[m.id])

        if (mainMenuSelected && !selectedItems[itemId]) {
          notifyInfo('Solo puedes seleccionar 1 menú por persona.')
          return
        }

        setSelectedItems(prev => ({
          ...prev,
          [itemId]: true
        }))
      }
    } else {
      // Si está deseleccionando
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: false
      }))
    }
  }

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCustomResponse = (optionId, value, type) => {
    if (type === 'checkbox') {
      // Para checkboxes, mantener un array de valores seleccionados
      setCustomResponses(prev => {
        const current = prev[optionId] || []
        const isChecked = current.includes(value)
        return {
          ...prev,
          [optionId]: isChecked
            ? current.filter(v => v !== value)
            : [...current, value]
        }
      })
      return
    }

    if (type === 'multiple_choice') {
      // Permitir deseleccionar si se hace clic en la opción ya elegida
      setCustomResponses(prev => {
        const current = prev[optionId]
        return {
          ...prev,
          [optionId]: current === value ? null : value
        }
      })
      return
    }

    // Para otros tipos, simplemente guardar el valor
    setCustomResponses(prev => ({
      ...prev,
      [optionId]: value
    }))
  }

  const getSelectedItemsList = () => {
    return menuItems.filter(item => selectedItems[item.id] === true)
  }

  const calculateTotal = () => {
    return getSelectedItemsList().length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isOrderEditable(order?.created_at, EDIT_WINDOW_MINUTES)) {
      setError(`Solo puedes editar tu pedido dentro de los primeros ${EDIT_WINDOW_MINUTES} minutos de haberlo creado.`)
      return
    }

    setLocalLoading(true)
    setError('')
    if (!user?.id) {
      setError('No se pudo validar el usuario. Intenta nuevamente.')
      setLocalLoading(false)
      return
    }

    const selectedItemsList = getSelectedItemsList()

    if (!formData.location) {
      setError('Por favor selecciona un lugar de trabajo')
      setLocalLoading(false)
      return
    }

    if (selectedItemsList.length === 0) {
      setError('Por favor selecciona al menos un plato del menú')
      setLocalLoading(false)
      return
    }

    // Validar opciones requeridas (solo las que están activas)
    const missingRequiredOptions = customOptions
      .filter(opt => opt.active && opt.required && !customResponses[opt.id])
      .map(opt => opt.title)

    if (missingRequiredOptions.length > 0) {
      setError(`Por favor completa: ${missingRequiredOptions.join(', ')}`)
      setLocalLoading(false)
      return
    }

    try {
      // Preparar respuestas personalizadas (solo las activas con respuesta válida)
      const customResponsesArray = customOptions
        .filter(opt => {
          if (!opt.active) return false
          const response = customResponses[opt.id]
          // Verificar que la respuesta existe y no está vacía
          if (!response) return false
          if (Array.isArray(response) && response.length === 0) return false
          if (typeof response === 'string' && response.trim() === '') return false
          return true
        })
        .map(option => ({
          option_id: option.id,
          title: option.title,
          response: customResponses[option.id]
        }))

      // Obtener el nombre del usuario desde auth
      const userName = user?.user_metadata?.full_name ||
                      formData.name ||
                      user?.email?.split('@')[0] ||
                      'Usuario'

      const orderData = {
        location: formData.location,
        customer_name: userName, // Usar el nombre del usuario autenticado
        customer_email: formData.email || user?.email,
        customer_phone: formData.phone,
        items: selectedItemsList.map(item => ({
          id: item.id,
          name: item.name,
          quantity: 1
        })),
        comments: formData.comments,
        custom_responses: customResponsesArray
      }

      const { error } = await ordersService.updateOrder(order.id, orderData)

      if (error) {
        setError('Error al actualizar el pedido: ' + error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Error al actualizar el pedido')
    } finally {
      setLocalLoading(false)
    }
  }

  if (!order) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </RequireUser>
    )
  }

  if (success) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="p-3 sm:p-6 flex items-center justify-center min-h-dvh">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 rounded-full bg-green-100">
                  <Save className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">¡Pedido actualizado exitosamente!</h2>
              <p className="text-base sm:text-lg text-green-700">Los cambios han sido guardados.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center justify-center rounded-full bg-[#0b1f3a] text-white font-bold text-sm px-5 py-2.5 shadow-md"
                >
                  Volver al dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm px-5 py-2.5 shadow-md"
                >
                  Seguir revisando
                </button>
              </div>
            </div>
          </div>
        </div>
      </RequireUser>
    )
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div className="p-3 sm:p-6 pb-32 sm:pb-6 min-h-dvh">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-4">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2 sm:mb-3">Editar Pedido</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold drop-shadow-lg">Modifica tu pedido antes de que sea procesado</p>
          <p className="text-base sm:text-lg text-white/90 mt-1 sm:mt-2">¡Solo tienes {EDIT_WINDOW_MINUTES} minutos para editarlo!</p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm sm:text-base text-blue-800 font-medium">
                <strong>Edición disponible:</strong> Solo puedes editar pedidos dentro de los primeros {EDIT_WINDOW_MINUTES} minutos de creación
              </p>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                Después de este tiempo, contacta al soporte si necesitas cambios
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <EditOrderPersonalInfoSection
            formData={formData}
            locations={locations}
            onChange={handleFormChange}
          />

          <EditOrderMenuSection
            items={menuItems}
            selectedItems={selectedItems}
            onToggleItem={handleItemSelect}
          />

          <EditOrderSummarySection
            items={getSelectedItemsList()}
            total={calculateTotal()}
            onRemove={(itemId) => handleItemSelect(itemId, false)}
          />

          <EditOrderCustomOptionsSection
            options={customOptions}
            customResponses={customResponses}
            onCustomResponse={handleCustomResponse}
          />

          {/* Información Adicional */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Información Adicional</h2>

            <div>
              <label htmlFor="additional-comments" className="block text-sm font-bold text-gray-700 mb-2">
                Comentarios adicionales
              </label>
              <textarea
                id="additional-comments"
                name="comments"
                value={formData.comments}
                onChange={handleFormChange}
                rows={4}
                className="input-field"
                placeholder="Instrucciones especiales, alergias, etc."
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          {/* Botón de confirmación - Sticky en mobile con safe area */}
          <div className="fixed sm:relative bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto bg-linear-to-t from-white via-white to-white/95 sm:bg-transparent p-4 sm:p-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none border-t-2 sm:border-t-0 border-gray-200 sm:flex sm:justify-end mt-0 sm:mt-6 z-50" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 sm:flex-none bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || getSelectedItemsList().length === 0}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  WebkitAppearance: 'none'
                }}
                className="flex-1 sm:flex-none hover:bg-green-700 font-black py-5 px-8 rounded-xl shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-2xl border-2 border-green-600"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-6 w-6 mr-3" style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2 }} />
                    <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </RequireUser>
  )
}
