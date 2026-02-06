import { useState, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { db } from '../supabaseClient'
import { Users, ChefHat, Edit3, Save, X, Plus, Trash2, Settings, ArrowUp, ArrowDown, Shield, Search, Filter, Database, AlertTriangle, Building2 } from 'lucide-react'
import RequireUser from './RequireUser'
import { COMPANY_LIST, COMPANY_CATALOG } from '../constants/companyConfig'

const AdminPanel = () => {
  // Archivar todos los pedidos pendientes
  const [archivingPending, setArchivingPending] = useState(false)
  const handleArchiveAllPendingOrders = async () => {
    const msg =
      'Este botón moverá TODOS los pedidos pendientes (de hoy y días anteriores) al estado "Archivado".\n\n' +
      'Los pedidos archivados NO se eliminan, pero ya no aparecerán como pendientes ni podrán ser modificados.\n' +
      'Esta acción es útil para limpiar la lista de pendientes y mantener el historial.\n\n' +
      '¿Deseas archivar todos los pedidos pendientes ahora?';
    if (!window.confirm(msg)) return;
    setArchivingPending(true)
    try {
      const { error } = await db.archiveAllPendingOrders()
      if (error) {
        alert('❌ Ocurrió un error al archivar los pedidos pendientes. Intenta nuevamente.\n\n' + error.message)
      } else {
        alert('✅ Todos los pedidos pendientes han sido archivados correctamente.\n\nPuedes consultar el historial en la sección de pedidos archivados.')
        fetchData()
      }
    } catch (err) {
      alert('❌ Error inesperado al archivar pedidos pendientes. Intenta nuevamente.')
    } finally {
      setArchivingPending(false)
    }
  }
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [customOptions, setCustomOptions] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editingMenu, setEditingMenu] = useState(false)
  const [newMenuItems, setNewMenuItems] = useState([])
  const [editingOptions, setEditingOptions] = useState(false)
  const [newOption, setNewOption] = useState(null)
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    return stored === null ? true : stored === 'true'
  })
  const todayISO = new Date().toISOString().split('T')[0]
  const [dessertOption, setDessertOption] = useState(null)
  const [dessertOverrideDate, setDessertOverrideDate] = useState(todayISO)
  const [dessertOverrideEnabled, setDessertOverrideEnabled] = useState(false)
  const [loadingDessertOverride, setLoadingDessertOverride] = useState(false)
  const [showDessertConfirm, setShowDessertConfirm] = useState(false)
  const { isAdmin, user, refreshSession, loading } = useAuthContext()
  
  // Estados para búsqueda y filtrado de usuarios
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all', 'admin', 'user'
  
  // Estados para limpieza de datos
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0)
  const [deletingOrders, setDeletingOrders] = useState(false)

  const getCompanyLabel = (slug) => {
    if (!slug) return 'Todas las empresas'
    const match = COMPANY_LIST.find(c => c.slug === slug)
    return match ? match.name : slug
  }

  const getCompanyBadgeClass = (slug) => {
    if (!slug) return 'bg-gray-100 text-gray-700'
    const match = COMPANY_LIST.find(c => c.slug === slug)
    return match?.badgeClass || 'bg-gray-100 text-gray-700'
  }

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    fetchData()
    fetchCompletedOrdersCount()
  }, [isAdmin, user])

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    if (isAdmin && activeTab === 'cleanup') {
      fetchCompletedOrdersCount()
    }
  }, [activeTab, isAdmin, user])

  useEffect(() => {
    if (!dessertOption || !dessertOption.id) return
    fetchDessertOverride(dessertOption.id, dessertOverrideDate)
  }, [dessertOption, dessertOverrideDate])

  const fetchDessertOverride = async (optionId, date) => {
    try {
      setLoadingDessertOverride(true)
      const { data, error } = await db.getCustomOptionOverride({ optionId, date })
      if (error) {
        console.error('Error fetching dessert override', error)
        return
      }
      setDessertOverrideEnabled(!!data?.enabled)
    } catch (err) {
      console.error('Error fetching dessert override', err)
    } finally {
      setLoadingDessertOverride(false)
    }
  }

  const handleToggleDessertOverride = async ({ skipConfirm = false } = {}) => {
    if (!dessertOption) return
    const newValue = !dessertOverrideEnabled

    // Confirmación visual antes de deshabilitar
    if (dessertOverrideEnabled && !skipConfirm) {
      setShowDessertConfirm(true)
      return
    }

    setLoadingDessertOverride(true)
    try {
      const { error } = await db.setCustomOptionOverride({
        optionId: dessertOption.id,
        date: dessertOverrideDate,
        enabled: newValue
      })
      if (error) {
        console.error('Error toggling dessert override', error)
        alert('No se pudo actualizar el postre para esa fecha')
      } else {
        setDessertOverrideEnabled(newValue)
        alert(newValue ? '✅ Postre habilitado para la fecha seleccionada' : 'Postre deshabilitado para esa fecha')
      }
    } catch (err) {
      console.error('Error toggling dessert override', err)
      alert('No se pudo actualizar el postre para esa fecha')
    } finally {
      setLoadingDessertOverride(false)
      setShowDessertConfirm(false)
    }
  }

  const fetchData = async () => {
    setDataLoading(true)
    try {
      const [usersResult, menuResult, optionsResult] = await Promise.all([
        db.getUsers(),
        db.getMenuItems(),
        db.getCustomOptions()
      ])

      if (usersResult.error) {
        console.error('Error fetching users:', usersResult.error)
      } else {
        setUsers(usersResult.data || [])
      }

      const extractNumber = (name) => {
        const match = name?.match(/(\d+)/)
        return match ? parseInt(match[1], 10) : Infinity
      }
      const sortMenuItems = (items) => {
        return [...items].sort((a, b) => extractNumber(a.name) - extractNumber(b.name))
      }
      if (menuResult.error) {
        console.error('Error fetching menu:', menuResult.error)
        // Set default menu items
        setNewMenuItems(sortMenuItems([
          { name: 'Plato Principal 1', description: 'Delicioso plato principal' },
          { name: 'Plato Principal 2', description: 'Otro plato delicioso' },
          { name: 'Ensalada César', description: 'Fresca ensalada' }
        ]))
      } else {
        setMenuItems(sortMenuItems(menuResult.data || []))
        if (menuResult.data && menuResult.data.length > 0) {
          setNewMenuItems(sortMenuItems(menuResult.data.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || ''
          }))))
        } else {
          // Menú por defecto si no hay items
          setNewMenuItems(sortMenuItems([
            { name: 'Plato Principal 1', description: 'Delicioso plato principal' },
            { name: 'Plato Principal 2', description: 'Otro plato delicioso' },
            { name: 'Ensalada César', description: 'Fresca ensalada' }
          ]))
        }
      }

      if (optionsResult.error) {
        console.error('Error fetching custom options:', optionsResult.error)
      } else {
        console.log('📋 Opciones personalizadas recuperadas:', optionsResult.data)
        const opts = optionsResult.data || []
        setCustomOptions(opts)
        const dessert = Array.isArray(opts) ? opts.find(o => o?.title && o.title.toLowerCase().includes('postre')) : null
        setDessertOption(dessert || null)
        if (dessert) {
          await fetchDessertOverride(dessert.id, dessertOverrideDate)
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchCompletedOrdersCount = async () => {
    try {
      const { count, error } = await db.getCompletedOrdersCount()
      if (!error) {
        setCompletedOrdersCount(count || 0)
      }
    } catch (err) {
      console.error('Error fetching completed orders count:', err)
    }
  }

  const handleDeleteCompletedOrders = async () => {
    const confirmed = window.confirm(
      `⚠️ ADVERTENCIA: Estás a punto de eliminar ${completedOrdersCount} pedidos completados.\n\n` +
      '✓ Esta acción liberará espacio en la base de datos\n' +
      '✗ Los pedidos completados serán eliminados permanentemente\n' +
      '✗ Esta acción NO se puede deshacer\n\n' +
      '¿Estás seguro de continuar?'
    )

    if (!confirmed) return

    // Segunda confirmación de seguridad
    const doubleCheck = window.confirm(
      '🔒 CONFIRMACIÓN FINAL\n\n' +
      'Esta es tu última oportunidad de cancelar.\n' +
      `Se eliminarán ${completedOrdersCount} pedidos completados.\n\n` +
      '¿Confirmas que deseas proceder?'
    )

    if (!doubleCheck) return

    setDeletingOrders(true)
    
    try {
      const { error } = await db.deleteCompletedOrders()
      
      if (error) {
        console.error('Error deleting completed orders:', error)
        alert('❌ Error al eliminar los pedidos: ' + error.message)
      } else {
        alert(`✅ Se eliminaron ${completedOrdersCount} pedidos completados exitosamente.\n\n` +
              'Se ha liberado espacio en la base de datos.')
        setCompletedOrdersCount(0)
        fetchData() // Refrescar datos
      }
    } catch (err) {
      console.error('Error:', err)
      alert('❌ Error al eliminar los pedidos')
    } finally {
      setDeletingOrders(false)
    }
  }

  // Función para filtrar usuarios según búsqueda y rol
  const getFilteredUsers = () => {
    return users.filter(user => {
      // Filtro por término de búsqueda (nombre o email)
      const matchesSearch = searchTerm === '' || 
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      
      // Filtro por rol
      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'admin' && user.role === 'admin') ||
        (roleFilter === 'user' && user.role === 'user')
      
      return matchesSearch && matchesRole
    })
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      // Forzar minúsculas para el valor de rol
      const roleValue = newRole.toLowerCase()
      const { data, error } = await db.updateUserRole(userId, roleValue)
      console.log('[SUPABASE UPDATE RESULT]', { data, error })
      if (error) {
        console.error('[SUPABASE ERROR] updateUserRole:', error)
        alert('Error al actualizar el rol: ' + error.message)
        return
      }
      if (!data || (Array.isArray(data) && data.length === 0)) {
        alert('No se pudo actualizar el rol. Verifica las políticas de seguridad o el valor enviado.')
        return
      }
      alert('Rol actualizado correctamente')
      // Actualizar el usuario en la lista local
      if (data && Array.isArray(users)) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: roleValue } : u))
      }
      // Forzar fetchData sin cache
      if (db.getUsers) {
        const { data: freshUsers, error: fetchError } = await db.getUsers(true)
        if (!fetchError && freshUsers) setUsers(freshUsers)
      }
      // Si el usuario actual cambia su propio rol, refrescar sesión
      if (user && user.id === userId) {
        await refreshSession()
      }
    } catch (err) {
      alert('Error al actualizar el rol')
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar al usuario "${userName}"?\n\n` +
      'Esta acción eliminará:\n' +
      '- El usuario de la base de datos\n' +
      '- Todos los pedidos asociados\n\n' +
      'Esta acción NO se puede deshacer.'
    )

    if (!confirmed) return

    try {
      const { error } = await db.deleteUser(userId)
      
      if (error) {
        console.error('Error deleting user:', error)
        alert('Error al eliminar el usuario: ' + error.message)
      } else {
        // Update local state
        setUsers(users.filter(user => user.id !== userId))
        alert('Usuario eliminado exitosamente')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar el usuario')
    }
  }

  const handleMenuUpdate = async () => {
    try {
      // Filter out empty items
      const validItems = newMenuItems.filter(item => item.name.trim() !== '')

      if (validItems.length === 0) {
        alert('Debe haber al menos un plato en el menú')
        return
      }

      const requestId = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      console.debug('[menu][save] request_id', requestId, 'items', validItems.length)
      const { error } = await db.updateMenuItems(validItems, requestId)

      if (error) {
        console.error('Error updating menu:', error)
        alert('Error al actualizar el menú')
      } else {
        setEditingMenu(false)
        alert('Menú actualizado exitosamente')
        fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al actualizar el menú')
    }
  }

  const handleMenuItemChange = (index, field, value) => {
    const updatedItems = [...newMenuItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setNewMenuItems(updatedItems)
  }

  const addMenuItem = () => {
    setNewMenuItems([...newMenuItems, { name: '', description: '' }])
  }

  const removeMenuItem = (index) => {
    if (newMenuItems.length <= 1) {
      alert('Debe haber al menos un plato en el menú')
      return
    }
    const updatedItems = newMenuItems.filter((_, i) => i !== index)
    setNewMenuItems(updatedItems)
  }

  // Funciones para opciones personalizadas
  const handleCreateOption = () => {
    setNewOption({
      title: '',
      type: 'multiple_choice',
      options: [''],
      required: false,
      active: true,
      company: '',
      // Alcance contextual
      meal_scope: 'both',
      days_of_week: null,
      only_holidays: false,
      exclude_holidays: false,
      // flag legacy, no editable control
      dinner_only: false
    })
    setEditingOptions(true)
  }

  const handleEditOption = (option) => {
    if (!option) return
    setNewOption({
      ...option,
      options: Array.isArray(option.options) && option.options.length > 0 ? option.options : [''],
      meal_scope: option.meal_scope || (option.dinner_only ? 'dinner' : 'both'),
      days_of_week: option.days_of_week || null,
      company: option.company || '',
      only_holidays: option.only_holidays || false,
      exclude_holidays: option.exclude_holidays || false
    })
    setEditingOptions(true)
  }

  const handleSaveOption = async () => {
    if (!newOption.title.trim()) {
      alert('El título es requerido')
      return
    }

    if ((newOption.type === 'multiple_choice' || newOption.type === 'checkbox') && 
        newOption.options.filter(opt => opt.trim()).length === 0) {
      alert('Debes agregar al menos una opción')
      return
    }

    try {
      const daysArray = Array.isArray(newOption.days_of_week) ? newOption.days_of_week.filter(Boolean) : []
      const filteredOptions = (newOption.type === 'multiple_choice' || newOption.type === 'checkbox')
        ? newOption.options.filter(opt => opt.trim())
        : null

      const existing = newOption.id ? customOptions.find(opt => opt.id === newOption.id) : null

      const optionData = {
        title: newOption.title,
        type: newOption.type,
        options: filteredOptions,
        order_position: existing?.order_position ?? customOptions.length,
        company: newOption.company || null,
        active: newOption.active ?? true,
        days_of_week: daysArray.length === 0 ? null : daysArray,
        only_holidays: newOption.only_holidays || false,
        exclude_holidays: newOption.exclude_holidays || false,
        meal_scope: newOption.meal_scope || (newOption.dinner_only ? 'dinner' : 'both'),
        required: !!newOption.required
      }

      if (optionData.only_holidays && optionData.exclude_holidays) {
        alert('No podés marcar "Solo feriados" y "Excluir feriados" al mismo tiempo.')
        return
      }

      const { error } = newOption.id
        ? await db.updateCustomOption(newOption.id, optionData)
        : await db.createCustomOption(optionData)
      
      if (error) {
        console.error('❌ Error al guardar opción:', error)
        alert('Error al guardar la opción: ' + error.message)
      } else {
        setNewOption(null)
        setEditingOptions(false)
        await fetchData()
        alert('Opción guardada exitosamente.')
      }
    } catch (err) {
      console.error('❌ Error:', err)
      alert('Error al guardar la opción')
    }
  }

  const handleDeleteOption = async (optionId) => {
    if (!confirm('¿Estás seguro de eliminar esta opción?')) return

    try {
      const { error } = await db.deleteCustomOption(optionId)
      if (error) {
        alert('Error al eliminar la opción')
      } else {
        fetchData()
        alert('Opción eliminada exitosamente')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar la opción')
    }
  }

  const handleToggleOption = async (optionId, currentState) => {
    try {
      const { error } = await db.updateCustomOption(optionId, { active: !currentState })
      if (error) {
        alert('Error al actualizar la opción')
      } else {
        fetchData()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al actualizar la opción')
    }
  }

  const handleMoveOption = async (index, direction) => {
    const newOptions = [...customOptions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newOptions.length) return

    // Intercambiar
    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]]

    try {
      await db.updateCustomOptionsOrder(newOptions)
      fetchData()
    } catch (err) {
      console.error('Error:', err)
      alert('Error al reordenar')
    }
  }

  const handleOptionFieldChange = (field, value) => {
    setNewOption(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (dayNumber) => {
    setNewOption(prev => {
      const current = Array.isArray(prev.days_of_week) ? prev.days_of_week : []
      const exists = current.includes(dayNumber)
      const next = exists ? current.filter(d => d !== dayNumber) : [...current, dayNumber]
      return { ...prev, days_of_week: next.length ? next : null }
    })
  }

  const handleAddOptionChoice = () => {
    setNewOption(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }))
  }


  const handleRemoveOptionChoice = (index) => {
    setNewOption(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const toggleDinnerMenu = (checked) => {
    setDinnerMenuEnabled(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dinner_menu_enabled', checked ? 'true' : 'false')
    }
  }

  const handleOptionChoiceChange = (index, value) => {
    setNewOption(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }))
  }

  // Verificación de admin
  if (!isAdmin && !loading) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <Shield className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700 mb-4">
              Solo los administradores pueden acceder a este panel.
            </p>
            <Link
              to="/dashboard"
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </RequireUser>
    )
  }

  if (loading || dataLoading) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </RequireUser>
    )
  }

  return (
    <RequireUser user={user} loading={loading}>
    <div className="min-h-[100dvh] pt-16 pb-24 p-3 sm:p-6 space-y-6 sm:space-y-8" style={{ paddingBottom: '120px' }}>
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-2xl mb-2">Panel de Administración</h1>
        <p className="text-sm sm:text-base md:text-lg text-white/90 drop-shadow-lg mt-2">Gestiona usuarios y el menú de opciones</p>
      </div>

      {/* Tabs - Scroll horizontal completo en mobile */}
      <div className="border-b-2 border-white/30 w-full" style={{ overflowX: 'auto', minWidth: 0 }}>
        <div className="overflow-x-auto scrollbar-hide -mx-3 sm:-mx-6 md:mx-0" style={{ WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
          <nav className="-mb-0.5 flex space-x-2 sm:space-x-4 md:space-x-8 min-w-max px-3 sm:px-6 md:px-0" style={{ minWidth: '100%', flexWrap: 'nowrap', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-3 sm:px-4 border-b-4 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                activeTab === 'users'
                  ? 'border-secondary-500 text-white drop-shadow'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Usuarios</span>
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-3 px-3 sm:px-4 border-b-4 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                activeTab === 'menu'
                  ? 'border-secondary-500 text-white drop-shadow'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
              }`}
            >
              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Menú</span>
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`py-3 px-3 sm:px-4 border-b-4 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                activeTab === 'options'
                  ? 'border-secondary-500 text-white drop-shadow'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
              }`}
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Opciones</span>
            </button>
          </nav>
        </div>
        
        {/* Botón de Limpiar Cache - Solo para Admins */}
        <div className="px-3 sm:px-4 mt-3">
          <button
            onClick={() => setActiveTab('cleanup')}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cleanup'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30 border-2 border-white/40'
            }`}
          >
            <Database className="h-5 w-5 shrink-0" />
            <span>Limpiar Cache</span>
            {completedOrdersCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-md">
                {completedOrdersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 drop-shadow">👥 Gestión de Usuarios</h2>

          {/* Controles de Búsqueda y Filtrado */}
          <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
            {/* Barra de Búsqueda */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-bold text-gray-900 mb-2">
                Buscar Usuario
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="search"
                  name="search"
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoComplete="search"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Filtro por Rol */}
            <div className="w-full sm:w-48">
              <label htmlFor="roleFilter" className="block text-sm font-bold text-gray-900 mb-2">
                Filtrar por Rol
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="roleFilter"
                  name="roleFilter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium appearance-none"
                >
                  <option value="all">Todos</option>
                  <option value="admin">Administradores</option>
                  <option value="user">Usuarios</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mb-4 text-sm text-gray-600">
            Mostrando <span className="font-bold text-gray-900">{getFilteredUsers().length}</span> de <span className="font-bold text-gray-900">{users.length}</span> usuarios
          </div>

          {/* Vista Mobile - Cards */}
          <div className="block md:hidden space-y-4">
            {getFilteredUsers().map((user) => (
              <div key={user.id} className="border-2 border-gray-200 rounded-xl p-3 bg-white hover:border-primary-300 transition-all">
                {/* Nombre y Badge de Rol */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-gray-900 truncate">
                      {user.full_name || user.email || 'Sin nombre'}
                    </h3>
                    <p className="text-sm text-gray-600 truncate mt-1">{user.email}</p>
                  </div>
                  <span className={`ml-2 shrink-0 inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Usuario'}
                  </span>
                </div>

                {/* Fecha de Registro */}
                <div className="text-xs text-gray-500 mb-3">
                  Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                </div>

                {/* Controles */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <div className="flex-1">
                    <label htmlFor={`mobile-role-${user.id}`} className="block text-xs font-bold text-gray-700 mb-1">Cambiar Rol</label>
                    <select
                      id={`mobile-role-${user.id}`}
                      name={`mobile-role-${user.id}`}
                      value={user.role || 'user'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="w-full text-sm border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                      className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors font-semibold text-sm flex items-center gap-1"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop - Tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-linear-to-r from-primary-600 to-primary-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredUsers().map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-base font-bold text-gray-900">
                        {user.full_name || user.email || 'Sin nombre'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-base text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`table-role-${user.id}`} className="sr-only">Cambiar rol para {user.full_name || user.email || 'usuario'}</label>
                        <select
                          id={`table-role-${user.id}`}
                          name={`table-role-${user.id}`}
                          value={user.role || 'user'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-base border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium min-w-[120px]"
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                          className="p-2.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors shrink-0"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mensaje cuando no hay resultados */}
          {getFilteredUsers().length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'No hay usuarios registrados en el sistema'}
              </p>
              {(searchTerm || roleFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setRoleFilter('all')
                  }}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
          <div className="flex flex-col gap-3 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión del Menú</h2>
            {!editingMenu ? (
              <button
                onClick={() => setEditingMenu(true)}
                className="btn-primary flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
              >
                <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Editar Menú
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleMenuUpdate}
                  className="btn-primary flex items-center justify-center text-sm sm:text-base px-4 py-2.5 flex-1"
                >
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditingMenu(false)
                    fetchData() // Reset changes
                  }}
                  className="btn-secondary flex items-center justify-center text-sm sm:text-base px-4 py-2.5 flex-1"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {!editingMenu ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {menuItems.map((item, index) => (
                <div key={item.id || index} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
                  <h3 className="font-bold text-gray-900 mb-2 text-base">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                <p className="text-blue-800 font-semibold text-center text-sm leading-relaxed">
                  Podés agregar, editar o eliminar opciones del menú. Debe haber al menos un plato.
                </p>
                <div className="mt-3 flex items-center gap-2 justify-center">
                  <input
                    type="checkbox"
                    id="dinner-menu-enabled"
                    name="dinnerMenuEnabled"
                    checked={dinnerMenuEnabled}
                    onChange={(e) => toggleDinnerMenu(e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="dinner-menu-enabled" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
                    Habilitar este menú también para <span className="font-extrabold">cena</span> (solo whitelist)
                  </label>
                </div>
              </div>
              
              {newMenuItems.map((item, index) => {
                const nameId = `menu-item-name-${index}`
                const descId = `menu-item-description-${index}`
                return (
                <div key={index} className="border-2 border-gray-200 rounded-xl bg-white p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => removeMenuItem(index)}
                      className="ml-auto p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                      title="Eliminar plato"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label htmlFor={nameId} className="sr-only">Nombre del plato</label>
                    <input
                      id={nameId}
                      name={nameId}
                      type="text"
                      placeholder="Nombre del plato"
                      value={item.name}
                      onChange={(e) => handleMenuItemChange(index, 'name', e.target.value)}
                      className="input-field font-semibold text-base bg-white text-gray-900 w-full"
                      required
                    />
                    <label htmlFor={descId} className="sr-only">Descripción del plato</label>
                    <input
                      id={descId}
                      name={descId}
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={item.description}
                      onChange={(e) => handleMenuItemChange(index, 'description', e.target.value)}
                      className="input-field text-sm bg-white text-gray-900 w-full"
                    />
                  </div>
                </div>
                )
              })}
              
              <button
                onClick={addMenuItem}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all font-semibold text-sm shadow-sm"
              >
                <Plus className="h-5 w-5" />
                Agregar nuevo plato
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Options Tab */}
      {activeTab === 'options' && (
        <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
            <div className="flex flex-col gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Opciones Personalizables</h2>
                <p className="text-sm text-gray-600 mt-1">Agrega preguntas, encuestas u opciones adicionales para los pedidos</p>
              </div>
              {!editingOptions && (
                <button
                  onClick={handleCreateOption}
                  className="flex items-center justify-center text-sm sm:text-base w-full sm:w-auto px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold shadow-sm hover:bg-gray-800 transition-all"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Nueva Opción
                </button>
              )}
            </div>

            {/* Override de Postre por fecha */}
            {dessertOption && !editingOptions && (
              <div className="mb-4 sm:mb-6 border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Postre bloqueado en fines de semana por defecto</p>
                      <p className="text-sm text-amber-900/80">Si un sábado o domingo hay postre, habilítalo para la fecha.</p>
                      {dessertOverrideEnabled && (
                        <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-green-900 bg-green-100 border border-green-300 px-3 py-1 rounded-full">
                          ● Postre habilitado
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input
                        type="date"
                        value={dessertOverrideDate}
                        onChange={(e) => setDessertOverrideDate(e.target.value)}
                        className="input-field bg-white text-gray-900"
                      />
                      <button
                        onClick={() => handleToggleDessertOverride()}
                        disabled={loadingDessertOverride}
                        className={`px-4 py-3 rounded-lg font-semibold text-sm shadow-sm border ${
                          dessertOverrideEnabled
                            ? 'bg-red-600 text-white border-red-700 hover:bg-red-500'
                            : 'bg-green-600 text-white border-green-700 hover:bg-green-500'
                        }`}
                      >
                        {loadingDessertOverride
                          ? 'Guardando...'
                          : dessertOverrideEnabled
                            ? 'Deshabilitar postre'
                            : 'Habilitar postre'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showDessertConfirm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-6">
                  <div className="mt-6 sm:mt-10 bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Deshabilitar postre</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      ¿Seguro que deseas deshabilitar el postre para la fecha seleccionada? Los usuarios dejarán de ver la opción.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      <button
                        onClick={() => setShowDessertConfirm(false)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleToggleDessertOverride({ skipConfirm: true })}
                        disabled={loadingDessertOverride}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 shadow-sm disabled:opacity-50"
                      >
                        Sí, deshabilitar
                      </button>
                    </div>
                  </div>
                </div>
              )}

          {/* Lista de opciones existentes - Con scroll adaptativo */}
          {!editingOptions && customOptions.length > 0 && (
            <div className="space-y-4 pr-2">
              {customOptions.map((option, index) => (
                <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-all min-w-0">
                  {/* Header con título y badges */}
                  <div className="mb-3">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 wrap-break-word">{option.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        option.type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                        option.type === 'checkbox' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {option.type === 'multiple_choice' ? 'Opción Múltiple' :
                         option.type === 'checkbox' ? 'Casillas' : 'Texto'}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getCompanyBadgeClass(option.company)}`}>
                        {getCompanyLabel(option.company)}
                      </span>
                      {option.required && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                          Requerido
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        option.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {option.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Opciones de respuesta - Con scroll horizontal si es necesario */}
                  {(option.type === 'multiple_choice' || option.type === 'checkbox') && option.options && (
                    <div className="overflow-x-auto pb-2 mb-4 -mx-2 px-2">
                      <div className="flex gap-2 min-w-max">
                        {option.options.map((opt, i) => (
                          <span key={i} className="text-xs sm:text-sm px-3 py-1.5 bg-gray-100 rounded-full text-gray-700 font-medium whitespace-nowrap">
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Controles - Optimizados para mobile */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                    {/* Botones de orden */}
                    <div className="flex gap-2 order-2 sm:order-1">
                      <button
                        onClick={() => handleMoveOption(index, 'up')}
                        disabled={index === 0}
                        className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 flex items-center justify-center gap-1"
                        title="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="text-xs font-medium">Subir</span>
                      </button>
                      <button
                        onClick={() => handleMoveOption(index, 'down')}
                        disabled={index === customOptions.length - 1}
                        className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 flex items-center justify-center gap-1"
                        title="Bajar"
                      >
                        <ArrowDown className="h-4 w-4" />
                        <span className="text-xs font-medium">Bajar</span>
                      </button>
                    </div>
                    
                    {/* Toggle y eliminar */}
                    <div className="flex gap-2 order-1 sm:order-2 sm:ml-auto">
                      <button
                        onClick={() => handleEditOption(option)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm flex items-center gap-1"
                        title="Editar opción"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleOption(option.id, option.active)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          option.active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {option.active ? 'Desactivar' : 'Activar'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteOption(option.id)}
                        className="shrink-0 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 font-semibold text-sm flex items-center gap-1"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {customOptions.length === 0 && !editingOptions && (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No hay opciones personalizadas</h3>
              <p className="text-gray-600 mb-6">Creá opciones adicionales para tus pedidos</p>
            </div>
          )}

          {/* Formulario para nueva opción */}
          {editingOptions && newOption && (
            <div className="border-2 border-primary-300 rounded-xl p-4 sm:p-6 bg-primary-50">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Nueva Opción Personalizable</h3>
                <button
                  onClick={() => {
                    setEditingOptions(false)
                    setNewOption(null)
                  }}
                  className="p-2 hover:bg-red-100 rounded-lg text-red-600 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label htmlFor="new-option-title" className="block text-sm font-bold text-gray-900 mb-2">
                    Título/Pregunta *
                  </label>
                  <input
                    id="new-option-title"
                    name="new-option-title"
                    type="text"
                    value={newOption.title}
                    onChange={(e) => handleOptionFieldChange('title', e.target.value)}
                    className="input-field w-full bg-white text-gray-900"
                    placeholder="Ej: ¿Prefieres alguna bebida?"
                    autoComplete="off"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label htmlFor="new-option-type" className="block text-sm font-bold text-gray-900 mb-2">
                    Tipo de Respuesta *
                  </label>
                  <select
                    id="new-option-type"
                    name="new-option-type"
                    value={newOption.type}
                    onChange={(e) => handleOptionFieldChange('type', e.target.value)}
                    className="input-field w-full bg-white text-gray-900 text-sm sm:text-base"
                  >
                    <option value="multiple_choice">Opción Múltiple (una respuesta)</option>
                    <option value="checkbox">Casillas (múltiples respuestas)</option>
                    <option value="text">Texto Libre</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-option-company" className="block text-sm font-bold text-gray-900 mb-2">
                    Empresa / alcance *
                  </label>
                  <select
                    id="new-option-company"
                    name="new-option-company"
                    value={newOption.company || ''}
                    onChange={(e) => handleOptionFieldChange('company', e.target.value)}
                    className="input-field w-full bg-white text-gray-900 text-sm sm:text-base"
                  >
                    <option value="">Visible para todas las empresas</option>
                    {COMPANY_LIST.map(company => (
                      <option key={company.slug} value={company.slug}>
                        Solo {company.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    Las preguntas se mostrarán únicamente en el flujo de la empresa elegida.
                  </p>
                </div>

                {/* Alcance por comida */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Aplicar a
                    </label>
                    <div className="flex flex-wrap gap-2 text-gray-900">
                      {[
                        { value: 'both', label: 'Ambos' },
                        { value: 'lunch', label: 'Solo almuerzo' },
                        { value: 'dinner', label: 'Solo cena' }
                      ].map(opt => (
                        <label key={opt.value} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                          <input
                            type="radio"
                            name="meal-scope"
                            value={opt.value}
                            checked={newOption.meal_scope === opt.value}
                            onChange={() => handleOptionFieldChange('meal_scope', opt.value)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Feriados */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Feriados
                    </label>
                    <div className="flex flex-col gap-2 text-gray-900">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                        <input
                          type="checkbox"
                          checked={newOption.only_holidays}
                          onChange={(e) => handleOptionFieldChange('only_holidays', e.target.checked)}
                          disabled={newOption.exclude_holidays}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        Solo feriados
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                        <input
                          type="checkbox"
                          checked={newOption.exclude_holidays}
                          onChange={(e) => handleOptionFieldChange('exclude_holidays', e.target.checked)}
                          disabled={newOption.only_holidays}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        Excluir feriados
                      </label>
                    </div>
                  </div>
                </div>

                {/* Días de la semana */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Días de la semana (dejar vacío = todos)
                  </label>
                  <div className="grid grid-cols-7 gap-2 text-center text-gray-900">
                    {[1,2,3,4,5,6,7].map(day => {
                      const labels = ['L','M','X','J','V','S','D']
                      const active = Array.isArray(newOption.days_of_week) && newOption.days_of_week.includes(day)
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`rounded-lg border px-0 py-2 text-sm font-bold ${
                            active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-black border-gray-200'
                          }`}
                        >
                          {labels[day - 1]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Opciones (solo para multiple_choice y checkbox) */}
                {(newOption.type === 'multiple_choice' || newOption.type === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Opciones de Respuesta
                    </label>
                    <div className="space-y-2">
                      {newOption.options.map((opt, index) => (
                        <div key={index} className="flex gap-2">
                          <label htmlFor={`option-choice-${index}`} className="sr-only">
                            Opción {index + 1}
                          </label>
                          <input
                            id={`option-choice-${index}`}
                            name={`option-choice-${index}`}
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChoiceChange(index, e.target.value)}
                            className="input-field flex-1 bg-white text-gray-900"
                            placeholder={`Opción ${index + 1}`}
                          />
                          {newOption.options.length > 1 && (
                            <button
                              onClick={() => handleRemoveOptionChoice(index)}
                              className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg shrink-0"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleAddOptionChoice}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-all font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar opción
                      </button>
                    </div>
                  </div>
                )}

                {/* Requerido */}
                <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
                  <input
                    type="checkbox"
                    id="new-option-required"
                    checked={newOption.required}
                    onChange={(e) => handleOptionFieldChange('required', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="new-option-required" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
                    Campo requerido
                  </label>
                </div>


                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleSaveOption}
                    className="btn-primary flex-1 flex items-center justify-center py-3"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Guardar Opción
                  </button>
                  <button
                    onClick={() => {
                      setEditingOptions(false)
                      setNewOption(null)
                    }}
                    className="btn-secondary flex-1 py-3"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cleanup Tab */}
      {activeTab === 'cleanup' && (
        <div className="space-y-6">
          {/* Advertencia importante */}
          <div className="card bg-linear-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 bg-yellow-400 rounded-full">
                <AlertTriangle className="h-8 w-8 text-yellow-900" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-900 mb-2">⚠️ Recordatorio Importante</h3>
                <div className="text-yellow-800 space-y-2 leading-relaxed">
                  <p className="font-semibold">
                    Recordá limpiar regularmente los pedidos completados para ahorrar recursos en Supabase.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Los pedidos completados ocupan espacio en la base de datos</li>
                    <li>Se recomienda limpiar al final de cada día o semana</li>
                    <li>Esta acción es <strong>irreversible</strong> - los datos no se pueden recuperar</li>
                    <li>Solo se eliminan pedidos con estado "Completado" o "Pendiente"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de limpieza de pedidos completados y pendientes antiguos */}
          <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Limpiar Cache</h2>
                <p className="text-gray-600 mt-1">Libera espacio eliminando pedidos finalizados</p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border-2 border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Completados</p>
                      <p className="text-3xl sm:text-4xl font-bold text-blue-600">
                        {completedOrdersCount}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Listos para eliminar
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Espacio Estimado</p>
                      <p className="text-3xl sm:text-4xl font-bold text-green-600">
                        ~{(completedOrdersCount * 2).toFixed(1)}KB
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Trash2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    A liberar aproximadamente
                  </p>
                </div>
              </div>
            </div>

            {/* Información y controles */}
            <div className="mb-6">
              <button
                onClick={handleArchiveAllPendingOrders}
                disabled={archivingPending}
                className={`w-full py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 mb-2
                  ${archivingPending
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'}
                `}
                title="Archivar todos los pedidos pendientes (de hoy y días anteriores)"
              >
                {archivingPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                    Archivando pedidos pendientes...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5" />
                    Archivar todos los pedidos pendientes
                  </>
                )}
              </button>
              <div className="text-xs text-yellow-700 text-center mt-1">
                <strong>¿Qué hace este botón?</strong><br />
                Archiva todos los pedidos con estado <b>pendiente</b> (de hoy y días anteriores).<br />
                Los pedidos archivados no se eliminan, pero ya no aparecerán como pendientes ni podrán ser modificados.<br />
                Úsalo para limpiar la lista de pendientes y mantener el historial ordenado.
              </div>
            </div>
            {completedOrdersCount > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    ¿Qué se eliminará?
                  </h4>
                  <ul className="text-blue-800 space-y-1 text-sm ml-7">
                    <li>• {completedOrdersCount} pedidos con estado "Completado"</li>
                    <li>• Información de items y opciones personalizadas</li>
                    <li>• Timestamps y datos asociados</li>
                  </ul>
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    ¡Atención! Acción Irreversible
                  </h4>
                  <p className="text-red-800 text-sm leading-relaxed">
                    Una vez eliminados, los pedidos completados <strong>no se pueden recuperar</strong>. 
                    Asegúrate de haber exportado o guardado cualquier información importante antes de proceder.
                  </p>
                </div>

                <button
                  onClick={handleDeleteCompletedOrders}
                  disabled={deletingOrders}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                    deletingOrders
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
                >
                  {deletingOrders ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-6 w-6" />
                      Eliminar {completedOrdersCount} Pedidos Completados
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <Database className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">✨ Todo Limpio</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  No hay pedidos completados para eliminar en este momento.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg text-green-700 font-semibold">
                  <span className="text-2xl">✓</span>
                  Base de datos optimizada
                </div>
              </div>
            )}
          </div>

          {/* Tips adicionales */}
          <div className="card bg-linear-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              💡 Mejores Prácticas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-800">
              <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                <h4 className="font-bold mb-2">🕐 Frecuencia Recomendada</h4>
                <p className="text-sm leading-relaxed">
                  Limpia los pedidos completados una vez por semana o cuando acumules más de 100 pedidos.
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                <h4 className="font-bold mb-2">📊 Antes de Eliminar</h4>
                <p className="text-sm leading-relaxed">
                  Considera exportar reportes o estadísticas importantes desde la sección de Pedidos.
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                <h4 className="font-bold mb-2">💾 Ahorro de Recursos</h4>
                <p className="text-sm leading-relaxed">
                  Mantener la base de datos limpia mejora el rendimiento y reduce costos en Supabase.
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                <h4 className="font-bold mb-2">🔄 Automatización</h4>
                <p className="text-sm leading-relaxed">
                  En el futuro se podría implementar limpieza automática programada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireUser>
  )
}

export default AdminPanel
