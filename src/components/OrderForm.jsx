import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { ShoppingCart, Plus, Minus, X, ChefHat, User, Settings, Clock, AlertTriangle } from 'lucide-react'
import RequireUser from './RequireUser'

const OrderForm = ({ user, loading }) => {
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasOrderToday, setHasOrderToday] = useState(false)
  const [isPastDeadline, setIsPastDeadline] = useState(false)
  const navigate = useNavigate()

  const locations = ['La Laja']

  useEffect(() => {
    if (!user?.id) return
    checkOrderDeadline()
    fetchMenuItems()
    fetchCustomOptions()
    checkTodayOrder()
    // Pre-fill user data
    setFormData(prev => ({
      ...prev,
      name: user?.user_metadata?.full_name || '',
      email: user?.email || ''
    }))
  }, [user])

  const checkOrderDeadline = () => {
    const now = new Date()
    // Convertir a horario Argentina GMT-3
    const utcHour = now.getUTCHours()
    // Argentina GMT-3
    const argHour = (utcHour + 21) % 24
    // Pedidos permitidos entre las 9:00 y 22:00 del día anterior
    if (argHour < 9 || argHour >= 22) {
      setIsPastDeadline(true)
    } else {
      setIsPastDeadline(false)
    }
  }

  const checkTodayOrder = async () => {
    if (!user?.id) return
    try {
      // Obtener solo los pedidos del usuario actual
      const { data, error } = await db.getOrders(user.id)
      if (!error && data) {
        // Verificar si tiene algún pedido pendiente (no entregado)
        const hasPendingOrder = data.some(order => 
          order.status === 'pending' || 
          order.status === 'preparing' || 
          order.status === 'ready'
        )
        setHasOrderToday(hasPendingOrder)
        
        if (hasPendingOrder) {
          console.log('Usuario ya tiene un pedido pendiente:', data.filter(o => 
            o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
          ))
        }
      }
    } catch (err) {
      console.error('Error checking today order:', err)
    }
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
      const { data, error } = await db.getMenuItems()

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
      const { data, error } = await db.getCustomOptions()
      if (!error && data) {
        setCustomOptions(data)
      }
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
          alert('Solo puedes seleccionar 1 menú por persona.')
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
    } else {
      // Para otros tipos, simplemente guardar el valor
      setCustomResponses(prev => ({
        ...prev,
        [optionId]: value
      }))
    }
  }

  const getSelectedItemsList = () => {
    // Unificar filtro para menú principal
    const selected = menuItems.filter(item => selectedItems[item.id] === true)
    const principal = selected.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal')))
    const others = selected.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))
    return [...principal, ...others]
  }

  const calculateTotal = () => {
    return getSelectedItemsList().length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    if (!user?.id) {
      setError('No se pudo validar el usuario. Intenta nuevamente.')
      setSubmitting(false)
      return
    }

    // Verificar horario límite
    const now = new Date()
    const utcHour = now.getUTCHours()
    const argHour = (utcHour + 21) % 24
    if (argHour < 9 || argHour >= 22) {
      setError('Los pedidos solo pueden realizarse entre las 9:00 y las 22:00 (horario Argentina, GMT-3) el día previo a la entrega.')
      setSubmitting(false)
      setIsPastDeadline(true)
      return
    }

    // Verificar si ya tiene un pedido pendiente
    if (hasOrderToday) {
      setError('Ya tienes un pedido pendiente. Espera a que se complete para crear uno nuevo.')
      setSubmitting(false)
      return
    }

    const selectedItemsList = getSelectedItemsList()

    if (!formData.location) {
      setError('Por favor selecciona un lugar de trabajo')
      setSubmitting(false)
      return
    }

    if (selectedItemsList.length === 0) {
      setError('Por favor selecciona al menos un plato del menú')
      setSubmitting(false)
      return
    }

    // Validar opciones requeridas (solo las que están activas)
    const missingRequiredOptions = customOptions
      .filter(opt => opt.active && opt.required && !customResponses[opt.id])
      .map(opt => opt.title)

    if (missingRequiredOptions.length > 0) {
      setError(`Por favor completa: ${missingRequiredOptions.join(', ')}`)
      setSubmitting(false)
      return
    }

    try {
      // Calcular fecha de entrega (día siguiente)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const deliveryDate = tomorrow.toISOString().split('T')[0]
      
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
        .map(opt => ({
          id: opt.id,
          title: opt.title,
          response: customResponses[opt.id]
        }))

      const orderData = {
        user_id: user.id,
        location: formData.location,
        customer_name: formData.name || user?.user_metadata?.full_name || user?.email || '',
        customer_email: formData.email || user?.email,
        customer_phone: formData.phone,
        items: selectedItemsList.map(item => ({
          id: item.id,
          name: item.name,
          quantity: 1
        })),
        comments: formData.comments,
        delivery_date: deliveryDate,
        status: 'pending',
        total_items: calculateTotal(),
        custom_responses: customResponsesArray
      }

      const { error } = await db.createOrder(orderData)

      if (error) {
        // Mostrar el mensaje real de error de Supabase para depuración
        let msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
        // Verificar si es error de política de base de datos
        if (msg.includes('violates row-level security policy') || 
            msg.includes('new row violates row-level security')) {
          setError('Ya tienes un pedido pendiente. Espera a que se complete para crear uno nuevo.')
        } else {
          setError('Error al crear el pedido: ' + msg)
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (err) {
      // Mostrar el error real si ocurre una excepción
      setError('Error al crear el pedido: ' + (err?.message || JSON.stringify(err)))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="p-3 sm:p-6 flex items-center justify-center min-h-screen">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 rounded-full bg-green-100">
                  <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">¡Pedido creado exitosamente!</h2>
              <p className="text-base sm:text-lg text-green-700">Tu pedido ha sido registrado y será procesado pronto.</p>
              <p className="text-xs sm:text-sm text-green-600 mt-2">Redirigiendo al panel principal...</p>
            </div>
          </div>
        </div>
      </RequireUser>
    )
  }

  return (

    <RequireUser user={user} loading={loading}>
      <div className="p-3 sm:p-6 min-h-[100dvh] flex flex-col" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
        {isPastDeadline ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 sm:p-6 shadow-lg max-w-xl w-full">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-1">Horario de pedidos cerrado</h3>
                  <p className="text-red-800 mb-3">
                    Los pedidos deben realizarse <strong>entre las 9:00 y las 22:00 horas (horario Argentina, GMT-3) del día anterior</strong> a la entrega.
                  </p>
                  <p className="text-red-700 text-sm mb-2">
                    Si necesitas realizar <b>cambios urgentes</b> fuera de horario, comunícate por WhatsApp como <b>última instancia</b> <span className="whitespace-nowrap">(hasta las 7:30)</span>:
                  </p>
                  <a
                    href="https://wa.me/549XXXXXXXXX?text=Hola%2C%20necesito%20realizar%20un%20cambio%20urgente%20en%20mi%20pedido%20de%20ServiFood."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition-colors duration-200 text-sm"
                  >
                    Contactar por WhatsApp
                  </a>
                  <p className="text-xs text-red-500 mt-2">Solo para casos urgentes hasta las 7:30 hs. El resto de los cambios deben gestionarse en horario habitual.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (

            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-4 flex-1">
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2 sm:mb-3">Nuevo Pedido</h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold drop-shadow-lg">Seleccioná tu menú y completa tus datos</p>
                <p className="text-base sm:text-lg text-white/90 mt-1 sm:mt-2">¡Es rápido y fácil!</p>
                <div className="mt-4 mx-auto max-w-2xl">
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-lg shadow text-yellow-900 text-sm sm:text-base">
                    <strong>Importante:</strong> No realices <b>pedidos de prueba</b>. Todos los pedidos se contabilizan para el día siguiente y serán preparados. Si necesitas cancelar un pedido, hazlo desde la aplicación o comunícate por WhatsApp dentro de los <b>15 minutos</b> posteriores a haberlo realizado.
                  </div>
                </div>
              </div>
              {!hasOrderToday && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 sm:p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm sm:text-base text-blue-800 font-medium">
                        Horario de pedidos: <strong>9:00 a 22:00 horas</strong> (horario Argentina, GMT-3) del día anterior a la entrega
                      </p>
                      <p className="text-xs sm:text-sm text-blue-700 mt-1">
                        Si necesitas realizar cambios, presiona el botón <strong>"¿Necesitas ayuda?"</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
                   )}
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Información Personal */}
              <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-2 sm:p-3 rounded-xl">
                    <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Información Personal</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="location" className="block text-sm font-bold text-gray-700 mb-2">
                      Lugar de trabajo *
                    </label>
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="organization"
                    >
                      <option value="">Seleccionar lugar</option>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                      Correo electrónico *
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="input-field"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

{/* Selección de Menú */}
<div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
  <div className="flex items-center gap-3 mb-6">
    <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 text-white p-3 rounded-xl">
      <ChefHat className="h-6 w-6" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Seleccioná tu Menú</h2>
      <p className="text-sm text-gray-600 font-semibold mt-1">
        Elegí uno o más platos disponibles
      </p>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...menuItems.filter(item => item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))),
      ...menuItems.filter(item => !(item.name && (item.name.toLowerCase().includes('menú principal') || item.name.toLowerCase().includes('plato principal'))))].map((item) => (
      <div
        key={item.id}
        className="card bg-white border-2 border-gray-200 rounded-2xl p-5
                   hover:border-primary-500 hover:shadow-xl transition-all duration-300
                   flex flex-col justify-between min-h-[260px]"
      >
        <div>
          {/* 🔥 Título más grande y en negrita */}
          <h3 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">
            {item.name}
          </h3>

          {/* 🔥 Descripción un poco más grande y legible */}
          {item.description && (
            <p className="text-lg text-gray-800 leading-snug font-medium">
              {item.description}
            </p>
          )}
        </div>

        {/* Checkbox funcional */}
        <div className="flex justify-end mt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedItems[item.id] === true}
              onChange={(e) => handleItemSelect(item.id, e.target.checked)}
              className="h-6 w-6 rounded border-gray-400 text-primary-600
                         focus:ring-primary-500 focus:outline-none"
            />
            <span className="text-base font-semibold text-gray-700">
              Seleccionar
            </span>
          </label>
        </div>
      </div>
    ))}
  </div>
</div>

        {/* Resumen del Pedido */}
        {getSelectedItemsList().length > 0 && (
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm shadow-xl border-2 border-green-300">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-2 sm:p-3 rounded-xl">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen del Pedido</h2>
                <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Revisa tu selección antes de confirmar</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              {getSelectedItemsList().map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between sm:justify-start">
                    {/* TEXTO MÁS GRANDE EN EL RESUMEN */}
                    <span className="font-medium text-gray-900 text-lg sm:text-xl">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(item.id, false)}
                      className="ml-2 p-1 rounded-full hover:bg-red-100 text-red-600"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                  <span className="text-gray-600 text-base sm:text-lg">Seleccionado</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex justify-between items-center text-lg sm:text-xl font-semibold">
                <span>Total de items:</span>
                <span>{calculateTotal()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Opciones Personalizadas - Solo mostrar opciones activas */}
        {customOptions.filter(opt => opt.active).length > 0 && (
          <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 sm:p-3 rounded-xl">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Opciones Adicionales</h2>
                <p style={{ fontWeight: '900' }} className="text-xs sm:text-sm text-gray-900 mt-1">Personaliza tu pedido</p>
              </div>
            </div>

            <div className="space-y-6">
              {customOptions.filter(opt => opt.active).map((option) => (
                <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50">
                  <label className="block text-sm text-gray-900 mb-3" style={{ fontWeight: '900' }}>
                    {option.title}
                    {option.required && <span className="text-red-600 ml-1">*</span>}
                  </label>

                  {option.type === 'multiple_choice' && option.options && (
                    <div className="space-y-2">
                      {option.options.map((opt, index) => (
                        <label key={index} className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                          <input
                            type="radio"
                            name={`option-${option.id}`}
                            value={opt}
                            checked={customResponses[option.id] === opt}
                            onChange={(e) => handleCustomResponse(option.id, e.target.value, 'multiple_choice')}
                            className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <span className="ml-3 text-sm text-gray-900" style={{ fontWeight: '900' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {option.type === 'checkbox' && option.options && (
                    <div className="space-y-2">
                      {option.options.map((opt, index) => (
                        <label key={index} className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={(customResponses[option.id] || []).includes(opt)}
                            onChange={(e) => handleCustomResponse(option.id, e.target.value, 'checkbox')}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="ml-3 text-sm text-gray-900" style={{ fontWeight: '900' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {option.type === 'text' && (
                    <textarea
                      id={`custom-option-${option.id}`}
                      name={`custom-option-${option.id}`}
                      value={customResponses[option.id] || ''}
                      onChange={(e) => handleCustomResponse(option.id, e.target.value, 'text')}
                      rows={3}
                      className="input-field"
                      placeholder="Escribe tu respuesta aquí..."
                      style={{ fontWeight: '600' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>📅 Fecha de entrega:</strong> Todos los pedidos se entregan al día siguiente
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Botón de confirmación - SIEMPRE visible al fondo, nunca fijo en mobile */}
        <div className="w-full sm:w-auto bg-gradient-to-t from-white via-white to-white/95 sm:bg-transparent p-4 sm:p-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none border-t-2 sm:border-t-0 border-gray-200 sm:flex sm:justify-end mt-0 sm:mt-6 z-40"
          style={{
            position: 'relative',
            bottom: 'auto',
            left: 'auto',
            right: 'auto',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
          <button
            type="submit"
            disabled={loading || getSelectedItemsList().length === 0 || hasOrderToday || isPastDeadline}
            style={{ 
              backgroundColor: '#16a34a',
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              WebkitAppearance: 'none'
            }}
            className="w-full sm:w-auto hover:bg-green-700 font-black py-5 px-8 rounded-xl shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-2xl border-2 border-green-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Creando pedido...</span>
              </>
            ) : hasOrderToday ? (
              <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Ya tienes un pedido pendiente</span>
            ) : (
              <>
                <ShoppingCart className="h-6 w-6 mr-3" style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2 }} />
                <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Confirmar Pedido</span>
              </>
            )}
          </button>
        </div>
        </form>
      </div>
    </RequireUser>
  )
}

export default OrderForm
