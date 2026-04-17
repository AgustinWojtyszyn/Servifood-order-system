import { useAuthContext } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import RequireUser from './RequireUser'
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
  const { isAdmin, user, refreshSession, loading } = useAuthContext()
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
      <AdminTabs activeTab={activeTab} onChange={setActiveTab} showCafeteria={canExportCafeteria} />

      {/* Users Tab */}
      {activeTab === 'users' && (
        <AdminUsersSection {...usersSection} />
      )}

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <AdminMenuSection {...menuSection} />
      )}

      {activeTab === 'cafeteria' && canExportCafeteria && (
        <AdminCafeteriaSection {...cafeteriaSection} />
      )}

      {/* Dinner Option Tab */}
      {activeTab === 'dinner-option' && (
        <AdminDinnerOptionSection {...dinnerSection} />
      )}

      {/* Custom Options Tab */}
      {activeTab === 'options' && (
        <AdminOptionsSection {...optionsSection} />
      )}

      {/* Cleanup Tab */}
      {activeTab === 'cleanup' && (
        <AdminCleanupSection {...cleanupSection} />
      )}
    </div>
    </RequireUser>
  )
}

export default AdminPanel
