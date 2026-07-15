import { useAuthContext } from '../contexts/authContextValue'
import LoadingState from './ui/LoadingState'
import AdminHeader from './admin/AdminHeader'
import AdminTabs from './admin/AdminTabs'
import AdminUsersSection from './admin/AdminUsersSection'
import AdminMenuSection from './admin/AdminMenuSection'
import AdminOptionsSection from './admin/AdminOptionsSection'
import AdminDinnerOptionSection from './admin/AdminDinnerOptionSection'
import AdminCleanupSection from './admin/AdminCleanupSection'
import AdminCafeteriaSection from './admin/AdminCafeteriaSection'
import { useAdminPanelController } from '../hooks/admin/useAdminPanelController'

const AdminPanel = () => {
  const { isAdmin, user, refreshSession } = useAuthContext()
  const {
    activeTab,
    setActiveTab,
    canExportCafeteria,
    mergedLoading,
    usersSection,
    menuSection,
    cafeteriaSection,
    dinnerSection,
    optionsSection,
    cleanupSection
  } = useAdminPanelController({
    user,
    isAdmin,
    refreshSession
  })

  return (
    <div className="min-h-dvh pt-16 pb-24 p-3 sm:p-6 space-y-6 sm:space-y-8" style={{ paddingBottom: '120px' }}>
      <AdminHeader />

      {/* Tabs - Scroll horizontal completo en mobile */}
      <AdminTabs activeTab={activeTab} onChange={setActiveTab} showCafeteria={canExportCafeteria} />

      {mergedLoading && (
        <LoadingState
          message="Cargando panel..."
          description="El contenido disponible queda listo por secciones."
          tone="slate"
        />
      )}

      {/* Users Tab */}
      {!mergedLoading && activeTab === 'users' && (
        <AdminUsersSection {...usersSection} />
      )}

      {/* Menu Tab */}
      {!mergedLoading && activeTab === 'menu' && (
        <AdminMenuSection {...menuSection} />
      )}

      {!mergedLoading && activeTab === 'cafeteria' && canExportCafeteria && (
        <AdminCafeteriaSection {...cafeteriaSection} />
      )}

      {/* Dinner Option Tab */}
      {!mergedLoading && activeTab === 'dinner-option' && (
        <AdminDinnerOptionSection {...dinnerSection} />
      )}

      {/* Custom Options Tab */}
      {!mergedLoading && activeTab === 'options' && (
        <AdminOptionsSection {...optionsSection} />
      )}

      {/* Cleanup Tab */}
      {!mergedLoading && activeTab === 'cleanup' && (
        <AdminCleanupSection {...cleanupSection} />
      )}
    </div>
  )
}

export default AdminPanel
