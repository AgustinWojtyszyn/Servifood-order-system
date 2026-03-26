import { useState, useEffect } from 'react'
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
import AdminDinnerOptionSection from './admin/AdminDinnerOptionSection'
import AdminCleanupSection from './admin/AdminCleanupSection'
import { getTomorrowISOInTimeZone } from '../utils/dateUtils'
import { notifyError, notifySuccess, notifyWarning } from '../utils/notice'
import { confirmAction } from '../utils/confirm'
import { useAdminFilters } from '../hooks/admin/useAdminFilters'
import { useAdminUsersData } from '../hooks/admin/useAdminUsersData'
import { useAdminMenuEditor } from '../hooks/admin/useAdminMenuEditor'
import { useAdminMenuData } from '../hooks/admin/useAdminMenuData'
import { useAdminMenuActions } from '../hooks/admin/useAdminMenuActions'
import { useAdminOptionsData } from '../hooks/admin/useAdminOptionsData'
import { useAdminOptionActions } from '../hooks/admin/useAdminOptionActions'
import { useAdminDinnerMenuData } from '../hooks/admin/useAdminDinnerMenuData'
import { useAdminDinnerMenuActions } from '../hooks/admin/useAdminDinnerMenuActions'
import { useAdminCleanupData } from '../hooks/admin/useAdminCleanupData'
import { useAdminCleanupActions } from '../hooks/admin/useAdminCleanupActions'

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users')
  const { isAdmin, user, refreshSession, loading } = useAuthContext()
  const { users, usersLoading, refreshUsers } = useAdminUsersData()
  const tomorrowISO = getTomorrowISOInTimeZone()
  const initialSelectedDates = [tomorrowISO]
  const {
    draftMenuItemsByDate,
    editingMenuByDate,
    savingMenuByDate,
    setDraftItemsForDate,
    setEditingForDate,
    setSavingForDate,
    clearEditorForDate
  } = useAdminMenuEditor()

  const {
    selectedDates,
    menuItemsByDate,
    loadingMenuByDate,
    dinnerMenuEnabled,
    fetchMenuForDate,
    addSelectedDate,
    removeSelectedDate,
    clearMenuDate,
    setMenuItemsForDate,
    toggleDinnerMenu
  } = useAdminMenuData({
    editingMenuByDate,
    draftMenuItemsByDate,
    setDraftItemsForDate,
    initialSelectedDates
  })

  const {
    handleMenuUpdate,
    handleMenuItemChange,
    addMenuItem,
    removeMenuItem
  } = useAdminMenuActions({
    menuItemsByDate,
    draftMenuItemsByDate,
    savingMenuByDate,
    setMenuItemsForDate,
    setDraftItemsForDate,
    setEditingForDate,
    setSavingForDate,
    fetchMenuForDate
  })

  const optionsEnabled = !!user?.id && isAdmin
  const {
    customOptions,
    optionsWithoutDinner,
    optionsLoading,
    refreshOptions,
    dessertOption,
    dessertOverrideDate,
    setDessertOverrideDate,
    dessertOverrideEnabled,
    setDessertOverrideEnabled,
    loadingDessertOverride,
    setLoadingDessertOverride
  } = useAdminOptionsData({ enabled: optionsEnabled, initialDessertDate: tomorrowISO })

  const {
    editingOptions,
    newOption,
    showDessertConfirm,
    handleCreateOption,
    handleEditOption,
    handleSaveOption,
    handleDeleteOption,
    handleToggleOption,
    handleMoveOption,
    handleOptionFieldChange,
    toggleDay,
    handleAddOptionChoice,
    handleRemoveOptionChoice,
    handleOptionChoiceChange,
    handleToggleDessertOverride,
    closeDessertConfirm,
    confirmDessertDisable,
    cancelOptionEdit
  } = useAdminOptionActions({
    customOptions,
    dessertOption,
    dessertOverrideDate,
    dessertOverrideEnabled,
    setDessertOverrideEnabled,
    setLoadingDessertOverride,
    refreshOptions
  })

  const {
    dinnerWeekBaseDate,
    setDinnerWeekBaseDate,
    dinnerSelectedDates,
    dinnerMenusByDate,
    dinnerDateLoading,
    toggleDinnerDate,
    updateDinnerMenuField,
    updateDinnerMenuOption,
    addDinnerMenuOption,
    removeDinnerMenuOption
  } = useAdminDinnerMenuData({ active: activeTab === 'dinner-option' })

  const { dinnerDateSaving, saveDinnerMenuDate } = useAdminDinnerMenuActions({ dinnerMenusByDate })

  const {
    archivedOrdersCount,
    refreshArchivedOrdersCount,
    clearArchivedOrdersCount
  } = useAdminCleanupData({ active: activeTab === 'cleanup' })

  const refreshAdminData = async () => {
    await refreshUsers()
    await refreshOptions()
  }

  const {
    archivingPending,
    deletingOrders,
    handleArchiveAllPendingOrders,
    handleDeleteArchivedOrders
  } = useAdminCleanupActions({
    archivedOrdersCount,
    clearArchivedOrdersCount,
    refreshArchivedOrdersCount,
    onRefreshData: refreshAdminData
  })

  const [expandedPeople, setExpandedPeople] = useState({})
  
  // Estados para búsqueda y filtrado de usuarios
  const {
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    sortBy,
    setSortBy,
    filteredUsers
  } = useAdminFilters({ users })
  
  useEffect(() => {
    if (!user?.id || !isAdmin) return
    refreshUsers()
  }, [isAdmin, user, refreshUsers])

  useEffect(() => {
    if (!user?.id || !isAdmin) return
    if (!Array.isArray(selectedDates) || selectedDates.length === 0) return
    selectedDates.forEach(date => {
      if (!menuItemsByDate.hasOwnProperty(date) && !loadingMenuByDate[date]) {
        fetchMenuForDate(date)
      }
    })
  }, [selectedDates, isAdmin, user, menuItemsByDate, loadingMenuByDate])

  const handleRemoveSelectedDate = (menuDate) => {
    removeSelectedDate(menuDate)
    clearEditorForDate(menuDate)
    clearMenuDate(menuDate)
  }

  const handleSaveAllMenus = async () => {
    if (!selectedDates.length) return
    const confirmed = await confirmAction({
      title: 'Guardar todos los menús',
      message: `Se guardarán ${selectedDates.length} día${selectedDates.length === 1 ? '' : 's'} seleccionados.`,
      confirmText: 'Guardar todos'
    })
    if (!confirmed) return
    for (const menuDate of selectedDates) {
      await handleMenuUpdate(menuDate, { silent: true })
    }
    notifySuccess('Menús guardados correctamente')
  }

  const mergedLoading = optionsLoading || usersLoading

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
        notifyError(`Error al actualizar el rol: ${error.message}`)
        return
      }
      if (!data || (Array.isArray(data) && data.length === 0)) {
        notifyWarning('No se pudo actualizar el rol. Verifica las políticas de seguridad o el valor enviado.')
        return
      }
      notifySuccess('Rol actualizado correctamente')
      await refreshAdminData()
      // Si el usuario actual cambia su propio rol, refrescar sesión
      if (user && user.id === userId) {
        await refreshSession()
      }
    } catch (err) {
      notifyError('Error al actualizar el rol')
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = await confirmAction({
      title: 'Eliminar usuario',
      message:
        `Se eliminarán todos los pedidos asociados al usuario "${userName}".`,
      highlight: 'Esta acción NO se puede deshacer.',
      confirmText: 'Eliminar usuario'
    })
    if (!confirmed) return

    try {
      const { error } = await db.deleteUser(userId)
      
      if (error) {
        console.error('Error deleting user:', error)
        notifyError(`Error al eliminar el usuario: ${error.message}`)
      } else {
        notifySuccess('Usuario eliminado exitosamente')
        await refreshAdminData()
      }
    } catch (err) {
      console.error('Error:', err)
      notifyError('Error al eliminar el usuario')
    }
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

  if (loading || mergedLoading) {
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
          onRemoveDate={handleRemoveSelectedDate}
          onSaveAllMenus={handleSaveAllMenus}
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

      {/* Dinner Option Tab */}
      {activeTab === 'dinner-option' && (
        <AdminDinnerOptionSection
          weekBaseDate={dinnerWeekBaseDate}
          onWeekBaseDateChange={setDinnerWeekBaseDate}
          selectedDates={dinnerSelectedDates}
          onToggleDate={toggleDinnerDate}
          dateLoadingMap={dinnerDateLoading}
          dinnerMenusByDate={dinnerMenusByDate}
          onFieldChange={updateDinnerMenuField}
          onOptionChoiceChange={updateDinnerMenuOption}
          onAddOptionChoice={addDinnerMenuOption}
          onRemoveOptionChoice={removeDinnerMenuOption}
          onSaveDate={saveDinnerMenuDate}
          savingMap={dinnerDateSaving}
        />
      )}

      {/* Custom Options Tab */}
      {activeTab === 'options' && (
        <AdminOptionsSection
          editingOptions={editingOptions}
          newOption={newOption}
          customOptions={optionsWithoutDinner}
          dessertOption={dessertOption}
          dessertOverrideEnabled={dessertOverrideEnabled}
          dessertOverrideDate={dessertOverrideDate}
          loadingDessertOverride={loadingDessertOverride}
          showDessertConfirm={showDessertConfirm}
          onDessertOverrideDateChange={setDessertOverrideDate}
          onToggleDessertOverride={handleToggleDessertOverride}
          onCloseDessertConfirm={closeDessertConfirm}
          onConfirmDessertDisable={confirmDessertDisable}
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
          onCancelOption={cancelOptionEdit}
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
