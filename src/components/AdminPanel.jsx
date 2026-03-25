import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { db } from '../supabaseClient'
import { Shield } from 'lucide-react'
import RequireUser from './RequireUser'
import { Sound } from '../utils/Sound'
import AdminHeader from './admin/AdminHeader'
import AdminTabs from './admin/AdminTabs'
import AdminUsersSection from './admin/AdminUsersSection'
import AdminMenuSection from './admin/AdminMenuSection'
import AdminOptionsSection from './admin/AdminOptionsSection'
import AdminCleanupSection from './admin/AdminCleanupSection'
import { sortMenuItems } from '../utils/admin/adminCalculations'

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
      const { data, error } = await db.archiveAllPendingOrders()
      if (error) {
        alert('❌ Ocurrió un error al archivar los pedidos pendientes. Intenta nuevamente.\n\n' + error.message)
      } else {
        const affected = Array.isArray(data) ? data.length : 0
        alert(
          affected === 0
            ? 'No hay pedidos pendientes para archivar.'
            : `✅ Pedidos archivados correctamente: ${affected}\n\nPuedes consultar el historial en la sección de pedidos archivados.`
        )
        Sound.playSuccess()
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
  const [customOptions, setCustomOptions] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const tomorrowISO = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const [selectedDates, setSelectedDates] = useState([tomorrowISO])
  const [menuItemsByDate, setMenuItemsByDate] = useState({})
  const [draftMenuItemsByDate, setDraftMenuItemsByDate] = useState({})
  const [editingMenuByDate, setEditingMenuByDate] = useState({})
  const [savingMenuByDate, setSavingMenuByDate] = useState({})
  const [loadingMenuByDate, setLoadingMenuByDate] = useState({})
  const [editingOptions, setEditingOptions] = useState(false)
  const [newOption, setNewOption] = useState(null)
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    return stored === null ? true : stored === 'true'
  })
  const [dessertOption, setDessertOption] = useState(null)
  const [dessertOverrideDate, setDessertOverrideDate] = useState(tomorrowISO)
  const [dessertOverrideEnabled, setDessertOverrideEnabled] = useState(false)
  const [loadingDessertOverride, setLoadingDessertOverride] = useState(false)
  const [showDessertConfirm, setShowDessertConfirm] = useState(false)
  const { isAdmin, user, refreshSession, loading } = useAuthContext()
  const [expandedPeople, setExpandedPeople] = useState({})
  
  // Estados para búsqueda y filtrado de usuarios
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all', 'admin', 'user'
  const [sortBy, setSortBy] = useState('name_asc') // name_asc, name_desc, created_desc, created_asc
  const deferredSearchTerm = useDeferredValue(searchTerm)
  
  // Estados para limpieza de datos
  const [archivedOrdersCount, setArchivedOrdersCount] = useState(0)
  const [deletingOrders, setDeletingOrders] = useState(false)

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    fetchData()
    fetchArchivedOrdersCount()
  }, [isAdmin, user])

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    if (isAdmin && activeTab === 'cleanup') {
      fetchArchivedOrdersCount()
    }
  }, [activeTab, isAdmin, user])

  useEffect(() => {
    if (!dessertOption || !dessertOption.id) return
    fetchDessertOverride(dessertOption.id, dessertOverrideDate)
  }, [dessertOption, dessertOverrideDate])

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    if (!Array.isArray(selectedDates) || selectedDates.length === 0) return
    selectedDates.forEach(date => {
      if (!menuItemsByDate.hasOwnProperty(date) && !loadingMenuByDate[date]) {
        fetchMenuForDate(date)
      }
    })
  }, [selectedDates, isAdmin, user, menuItemsByDate, loadingMenuByDate])

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

  const buildDefaultMenuItems = () => sortMenuItems([
    { name: 'Plato Principal 1', description: 'Delicioso plato principal' },
    { name: 'Plato Principal 2', description: 'Otro plato delicioso' },
    { name: 'Ensalada César', description: 'Fresca ensalada' }
  ])

  const normalizeMenuItems = (items = []) =>
    sortMenuItems(items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || ''
    })))

  const setMenuItemsForDate = (menuDate, items) => {
    setMenuItemsByDate(prev => ({ ...prev, [menuDate]: items }))
  }

  const setDraftItemsForDate = (menuDate, items) => {
    setDraftMenuItemsByDate(prev => ({ ...prev, [menuDate]: items }))
  }

  const setEditingForDate = (menuDate, value) => {
    setEditingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const setSavingForDate = (menuDate, value) => {
    setSavingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const setLoadingForDate = (menuDate, value) => {
    setLoadingMenuByDate(prev => ({ ...prev, [menuDate]: value }))
  }

  const fetchMenuForDate = async (menuDate) => {
    setLoadingForDate(menuDate, true)
    try {
      const { data, error } = await db.getMenuItemsByDate(menuDate)
      if (error) {
        console.error('Error fetching menu:', error)
        setMenuItemsForDate(menuDate, [])
        if (!editingMenuByDate[menuDate]) {
          setDraftItemsForDate(menuDate, buildDefaultMenuItems())
        }
        return
      }

      const sorted = sortMenuItems(data || [])
      setMenuItemsForDate(menuDate, sorted)

      const shouldUpdateDraft = !editingMenuByDate[menuDate] || !draftMenuItemsByDate[menuDate]
      if (shouldUpdateDraft) {
        if (sorted.length > 0) {
          setDraftItemsForDate(menuDate, normalizeMenuItems(sorted))
        } else {
          setDraftItemsForDate(menuDate, buildDefaultMenuItems())
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingForDate(menuDate, false)
    }
  }

  const addSelectedDate = (menuDate) => {
    if (!menuDate) return
    setSelectedDates(prev => {
      const next = prev.includes(menuDate) ? prev : [...prev, menuDate]
      return next.sort()
    })
  }

  const removeSelectedDate = (menuDate) => {
    setSelectedDates(prev => prev.filter(date => date !== menuDate))
    setEditingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setSavingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setLoadingMenuByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setMenuItemsByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
    setDraftMenuItemsByDate(prev => {
      const next = { ...prev }
      delete next[menuDate]
      return next
    })
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
      const [peopleResult, accountsResult, optionsResult] = await Promise.all([
        db.getAdminPeopleUnified(),
        db.getUsers(),
        db.getCustomOptions()
      ])

      if (peopleResult.error) {
        console.error('Error fetching admin people:', peopleResult.error)
      } else {
        const normalizeName = (value) => {
          const raw = (value || '').toString().trim().toLowerCase()
          const withoutDiacritics = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          // Si el nombre viene "contaminado" con dominio (ej: "mercado.com.ar"), corta desde el primer punto
          const withoutDomainTail = withoutDiacritics.replace(/\.[a-z0-9].*$/, '')
          // Elimina caracteres que no aportan al nombre
          return withoutDomainTail.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
        }
        const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase()
        const toDateMs = (value) => {
          const ms = value ? new Date(value).getTime() : NaN
          return Number.isFinite(ms) ? ms : null
        }

        const accountRows = Array.isArray(accountsResult?.data) ? accountsResult.data : []
        const accountById = new Map(accountRows.map(acc => [acc.id, acc]))
        const accountByEmail = new Map()
        for (const acc of accountRows) {
          const key = normalizeEmail(acc.email)
          if (!key || accountByEmail.has(key)) continue
          accountByEmail.set(key, acc)
        }
        const resolveAccountsForPerson = (person) => {
          const accounts = []
          const seen = new Set()
          const userIds = Array.isArray(person.user_ids) ? person.user_ids.filter(Boolean) : []
          const emails = Array.isArray(person.emails) ? person.emails.filter(Boolean) : []

          for (const id of userIds) {
            const acc = accountById.get(id)
            if (acc && !seen.has(acc.id)) {
              accounts.push(acc)
              seen.add(acc.id)
            }
          }

          for (const email of emails) {
            const acc = accountByEmail.get(normalizeEmail(email))
            if (acc && !seen.has(acc.id)) {
              accounts.push(acc)
              seen.add(acc.id)
            }
          }

          return accounts
        }
        const mappedPeople = (peopleResult.data || []).map(person => {
          const primaryUserId = Array.isArray(person.user_ids) ? person.user_ids[0] : null
          const emails = Array.isArray(person.emails) ? person.emails.filter(Boolean) : []
          const accounts = resolveAccountsForPerson(person)
          const primaryAccount = primaryUserId ? accountById.get(primaryUserId) : accounts[0] || null
          const primaryAccountId = primaryAccount?.id || primaryUserId || null
          const normalizedMembersCount = Math.max(
            person.members_count || 1,
            accounts.length || 0,
            Array.isArray(person.user_ids) ? person.user_ids.length : 0,
            emails.length
          )
          return {
            id: person.person_id,
            person_id: person.person_id,
            group_id: person.group_id,
            full_name: person.display_name || emails[0] || 'Sin nombre',
            email: emails[0] || '',
            emails,
            user_ids: Array.isArray(person.user_ids) ? person.user_ids : [],
            primary_user_id: primaryAccountId,
            members_count: normalizedMembersCount,
            is_grouped: !!person.is_grouped || accounts.length > 1 || normalizedMembersCount > 1,
            created_at: person.first_created || person.last_created || primaryAccount?.created_at || null,
            role: primaryAccount?.role || 'user',
            accounts
          }
        })

        const dedupedPeople = []
        for (const person of mappedPeople) {
          const personEmails = new Set((person.emails || []).map(normalizeEmail).filter(Boolean))
          const personUserIds = new Set((person.user_ids || []).filter(Boolean))
          const personName = normalizeName(person.full_name || person.email)
          const personAccounts = Array.isArray(person.accounts) ? person.accounts : []

          const existing = dedupedPeople.find(p => {
            const existingEmails = new Set((p.emails || []).map(normalizeEmail).filter(Boolean))
            const existingUserIds = new Set((p.user_ids || []).filter(Boolean))
            const existingName = normalizeName(p.full_name || p.email)

            const hasSharedUserId = [...personUserIds].some(id => existingUserIds.has(id))
            const hasSharedEmail = [...personEmails].some(email => existingEmails.has(email))
            const hasSameName = personName !== '' && personName === existingName

            return hasSharedUserId || hasSharedEmail || hasSameName
          })

          if (!existing) {
            dedupedPeople.push(person)
            continue
          }

          const mergedAccounts = []
          const mergedAccountIds = new Set()
          for (const acc of [...(existing.accounts || []), ...personAccounts]) {
            if (!acc?.id || mergedAccountIds.has(acc.id)) continue
            mergedAccountIds.add(acc.id)
            mergedAccounts.push(acc)
          }
          const mergedEmails = [...new Set([...(existing.emails || []), ...(person.emails || [])])]
          const mergedUserIds = [...new Set([...(existing.user_ids || []), ...(person.user_ids || [])])]
          const existingCreatedMs = toDateMs(existing.created_at)
          const personCreatedMs = toDateMs(person.created_at)
          const earliestMs = [existingCreatedMs, personCreatedMs].filter(v => v !== null).sort((a, b) => a - b)[0]

          existing.accounts = mergedAccounts
          existing.emails = mergedEmails
          existing.user_ids = mergedUserIds
          existing.email = mergedEmails[0] || existing.email || person.email || ''
          existing.full_name = existing.full_name || person.full_name
          existing.members_count = Math.max(
            existing.members_count || 1,
            person.members_count || 1,
            mergedUserIds.length,
            mergedEmails.length,
            mergedAccounts.length
          )
          existing.is_grouped = existing.is_grouped || person.is_grouped || mergedUserIds.length > 1 || mergedEmails.length > 1 || mergedAccounts.length > 1
          existing.role = existing.role === 'admin' || person.role === 'admin' ? 'admin' : 'user'
          existing.primary_user_id = existing.primary_user_id || person.primary_user_id || mergedUserIds[0] || mergedAccounts[0]?.id || null
          if (earliestMs) {
            existing.created_at = new Date(earliestMs).toISOString()
          }
        }

        setUsers(dedupedPeople)
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

  const fetchArchivedOrdersCount = async () => {
    try {
      const { count, error } = await db.getArchivedOrdersCount()
      if (!error) {
        setArchivedOrdersCount(count || 0)
      }
    } catch (err) {
      console.error('Error fetching archived orders count:', err)
    }
  }

  const handleDeleteArchivedOrders = async () => {
    const confirmed = window.confirm(
      `⚠️ ADVERTENCIA: Estás a punto de eliminar ${archivedOrdersCount} pedidos archivados.\n\n` +
      '✓ Esta acción liberará espacio en la base de datos\n' +
      '✗ Los pedidos archivados serán eliminados permanentemente\n' +
      '✗ Esta acción NO se puede deshacer\n\n' +
      '¿Estás seguro de continuar?'
    )

    if (!confirmed) return

    // Segunda confirmación de seguridad
    const doubleCheck = window.confirm(
      '🔒 CONFIRMACIÓN FINAL\n\n' +
      'Esta es tu última oportunidad de cancelar.\n' +
      `Se eliminarán ${archivedOrdersCount} pedidos archivados.\n\n` +
      '¿Confirmas que deseas proceder?'
    )

    if (!doubleCheck) return

    setDeletingOrders(true)
    
    try {
      const { error } = await db.deleteArchivedOrders()
      
      if (error) {
        console.error('Error deleting archived orders:', error)
        alert('❌ Error al eliminar los pedidos: ' + error.message)
      } else {
        alert(`✅ Se eliminaron ${archivedOrdersCount} pedidos archivados exitosamente.\n\n` +
              'Se ha liberado espacio en la base de datos.')
        setArchivedOrdersCount(0)
        fetchData() // Refrescar datos
      }
    } catch (err) {
      console.error('Error:', err)
      alert('❌ Error al eliminar los pedidos')
    } finally {
      setDeletingOrders(false)
    }
  }

  const userSearchIndex = useMemo(() => {
    return users.map(user => {
      const allEmails = Array.isArray(user.emails)
        ? user.emails.filter(Boolean).map(e => e.toLowerCase())
        : (user.email ? [user.email.toLowerCase()] : [])
      const emailUsernames = allEmails.map(e => e.split('@')[0]).filter(Boolean)
      const searchableText = [
        user.full_name || '',
        user.email || '',
        ...allEmails,
        ...emailUsernames
      ].join(' ').toLowerCase()
      return { user, searchableText }
    })
  }, [users])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    const filtered = userSearchIndex.filter(({ user, searchableText }) => {
      const matchesSearch = normalizedSearch === '' || searchableText.includes(normalizedSearch)
      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'admin' && user.role === 'admin') ||
        (roleFilter === 'user' && user.role === 'user')
      return matchesSearch && matchesRole
    }).map(entry => entry.user)

    const normalizedName = (user) => (user.full_name || user.email || '').toLowerCase()
    const createdAtMs = (user) => (user.created_at ? new Date(user.created_at).getTime() : 0)

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc') return normalizedName(a).localeCompare(normalizedName(b), 'es')
      if (sortBy === 'name_desc') return normalizedName(b).localeCompare(normalizedName(a), 'es')
      if (sortBy === 'created_asc') return createdAtMs(a) - createdAtMs(b)
      return createdAtMs(b) - createdAtMs(a) // created_desc
    })
  }, [deferredSearchTerm, roleFilter, sortBy, userSearchIndex])

  const togglePersonDetails = (personId) => {
    if (!personId) return
    setExpandedPeople(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }))
  }

  const isPersonExpanded = (personId) => !!expandedPeople[personId]

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
        setUsers(users.map(u => u.primary_user_id === userId ? { ...u, role: roleValue } : u))
      }
      await fetchData()
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
        setUsers(users.filter(person => person.primary_user_id !== userId))
        alert('Usuario eliminado exitosamente')
        await fetchData()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar el usuario')
    }
  }

  const normalizeForComparison = (items = []) =>
    items.map(item => ({
      name: (item.name || '').trim(),
      description: (item.description || '').trim()
    }))

  const isSameMenu = (a, b) =>
    JSON.stringify(normalizeForComparison(a)) === JSON.stringify(normalizeForComparison(b))

  const getPreviousDateISO = (dateISO) => {
    const d = new Date(`${dateISO}T00:00:00`)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  const handleMenuUpdate = async (menuDate) => {
    if (savingMenuByDate[menuDate]) return

    try {
      const draftItems = draftMenuItemsByDate[menuDate] || []
      const validItems = draftItems.filter(item => item.name.trim() !== '')

      if (validItems.length === 0) {
        alert('Debe haber al menos un plato en el menú')
        return
      }

      const prevDate = getPreviousDateISO(menuDate)
      let prevItems = menuItemsByDate[prevDate]
      if (!prevItems) {
        const { data: prevData, error: prevError } = await db.getMenuItemsByDate(prevDate)
        if (prevError) {
          console.error('Error fetching previous menu:', prevError)
        } else {
          prevItems = sortMenuItems(prevData || [])
          setMenuItemsForDate(prevDate, prevItems)
        }
      }

      if ((prevItems || []).length > 0 && isSameMenu(validItems, prevItems)) {
        const confirmed = window.confirm('Estás repitiendo el menú del día anterior. ¿Querés continuar?')
        if (!confirmed) return
      }

      setSavingForDate(menuDate, true)
      const requestId = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      console.debug('[menu][save] request_id', requestId, 'items', validItems.length, 'menu_date', menuDate)
      const { error } = await db.updateMenuItemsByDate(menuDate, validItems, requestId)

      if (error) {
        console.error('Error updating menu:', error)
        alert('Error al actualizar el menú')
      } else {
        setEditingForDate(menuDate, false)
        Sound.playSuccess()
        alert('Menú actualizado exitosamente')
        await fetchMenuForDate(menuDate)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al actualizar el menú')
    } finally {
      setSavingForDate(menuDate, false)
    }
  }

  const handleMenuItemChange = (menuDate, index, field, value) => {
    const current = draftMenuItemsByDate[menuDate] || []
    const updatedItems = [...current]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setDraftItemsForDate(menuDate, updatedItems)
  }

  const addMenuItem = (menuDate) => {
    const current = draftMenuItemsByDate[menuDate] || []
    setDraftItemsForDate(menuDate, [...current, { name: '', description: '' }])
  }

  const removeMenuItem = (menuDate, index) => {
    const current = draftMenuItemsByDate[menuDate] || []
    if (current.length <= 1) {
      alert('Debe haber al menos un plato en el menú')
      return
    }
    const updatedItems = current.filter((_, i) => i !== index)
    setDraftItemsForDate(menuDate, updatedItems)
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
    <div className="min-h-dvh pt-16 pb-24 p-3 sm:p-6 space-y-6 sm:space-y-8" style={{ paddingBottom: '120px' }}>
      <AdminHeader />

      {/* Tabs - Scroll horizontal completo en mobile */}
      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Users Tab */}
      {activeTab === 'users' && (
        <AdminUsersSection
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filteredUsers={filteredUsers}
          usersCount={users.length}
          onClearFilters={() => {
            setSearchTerm('')
            setRoleFilter('all')
          }}
          isPersonExpanded={isPersonExpanded}
          onTogglePersonDetails={togglePersonDetails}
          onRoleChange={handleRoleChange}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <AdminMenuSection
          selectedDates={selectedDates}
          menuItemsByDate={menuItemsByDate}
          draftMenuItemsByDate={draftMenuItemsByDate}
          editingMenuByDate={editingMenuByDate}
          savingMenuByDate={savingMenuByDate}
          loadingMenuByDate={loadingMenuByDate}
          dinnerMenuEnabled={dinnerMenuEnabled}
          onToggleDinnerMenu={toggleDinnerMenu}
          onAddDate={addSelectedDate}
          onRemoveDate={removeSelectedDate}
          onEditMenu={(menuDate) => setEditingForDate(menuDate, true)}
          onSaveMenu={handleMenuUpdate}
          onCancelMenu={(menuDate) => {
            setEditingForDate(menuDate, false)
            fetchMenuForDate(menuDate)
          }}
          onMenuItemChange={handleMenuItemChange}
          onAddMenuItem={addMenuItem}
          onRemoveMenuItem={removeMenuItem}
          onPrimeSuccess={() => Sound.primeSuccess()}
        />
      )}

      {/* Custom Options Tab */}
      {activeTab === 'options' && (
        <AdminOptionsSection
          editingOptions={editingOptions}
          newOption={newOption}
          customOptions={customOptions}
          dessertOption={dessertOption}
          dessertOverrideEnabled={dessertOverrideEnabled}
          dessertOverrideDate={dessertOverrideDate}
          loadingDessertOverride={loadingDessertOverride}
          showDessertConfirm={showDessertConfirm}
          onDessertOverrideDateChange={setDessertOverrideDate}
          onToggleDessertOverride={handleToggleDessertOverride}
          onCloseDessertConfirm={() => setShowDessertConfirm(false)}
          onConfirmDessertDisable={() => handleToggleDessertOverride({ skipConfirm: true })}
          onCreateOption={handleCreateOption}
          onEditOption={handleEditOption}
          onToggleOption={handleToggleOption}
          onMoveOption={handleMoveOption}
          onDeleteOption={handleDeleteOption}
          onFieldChange={handleOptionFieldChange}
          onToggleDay={toggleDay}
          onOptionChoiceChange={handleOptionChoiceChange}
          onAddOptionChoice={handleAddOptionChoice}
          onRemoveOptionChoice={handleRemoveOptionChoice}
          onSaveOption={handleSaveOption}
          onCancelOption={() => {
            setEditingOptions(false)
            setNewOption(null)
          }}
        />
      )}

      {/* Cleanup Tab */}
      {activeTab === 'cleanup' && (
        <AdminCleanupSection
          archivingPending={archivingPending}
          archivedOrdersCount={archivedOrdersCount}
          deletingOrders={deletingOrders}
          onArchiveAllPendingOrders={handleArchiveAllPendingOrders}
          onDeleteArchivedOrders={handleDeleteArchivedOrders}
        />
      )}
    </div>
    </RequireUser>
  )
}

export default AdminPanel
