import { useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { usersService } from '../services/users'
import { isOrderEditable } from '../utils'
import { EDIT_WINDOW_MINUTES } from '../constants/orderRules'
import RequireUser from './RequireUser'
import { useOverlayLock } from '../contexts/OverlayLockContext'
import OrderHistorySection from './dashboard/OrderHistorySection'
import ArchivedOrdersSection from './dashboard/ArchivedOrdersSection'
import DeleteConfirmModal from './dashboard/DeleteConfirmModal'
import SupportCard from './dashboard/SupportCard'
import WeeklyOrdersSection from './dashboard/WeeklyOrdersSection'
import DashboardHeader from './dashboard/DashboardHeader'
import StatsCards from './dashboard/StatsCards'
import ToastBanner from './dashboard/ToastBanner'
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../utils/notice'
import { confirmAction } from '../utils/confirm'
import {
  getCustomSideFromResponses,
  summarizeOrderItems,
  serviceBadge,
  formatWeeklyDate,
  getServiceLabel,
  getStatusLabel,
  getMainMenuLabel,
  formatOrderDate
} from '../utils/dashboard/dashboardHelpers.jsx'
import { useDashboardToast } from '../hooks/dashboard/useDashboardToast'
import { useDashboardCountdown } from '../hooks/dashboard/useDashboardCountdown'
import { useDashboardOrders } from '../hooks/dashboard/useDashboardOrders'
import { useDashboardDerived } from '../hooks/dashboard/useDashboardDerived'
import { useDashboardOrderActions } from '../hooks/dashboard/useDashboardOrderActions'
import OrderRegisteredCard from './dashboard/OrderRegisteredCard'

const Dashboard = ({ user, loading }) => {
  const navigate = useNavigate()

  const { toast, showToast } = useDashboardToast()
  const { countdownLabel, countdownValue, countdownTone } = useDashboardCountdown()

  const {
    orders,
    setOrders,
    ordersLoading,
    isAdmin,
    refreshing,
    stats,
    fetchOrders,
    calculateStats,
    handleRefresh
  } = useDashboardOrders({ user, db, usersService })

  const {
    weeklyOrders,
    headerOrder,
    headerStatus,
    headerSummary,
    deliveryText,
    isDeliveringTomorrow
  } = useDashboardDerived({ orders })

  const {
    deleteConfirmOrder,
    deleteSubmitting,
    handleEditOrder,
    handleDeleteOrder,
    confirmDeleteOrder,
    closeDeleteConfirm,
    handleViewOrder
  } = useDashboardOrderActions({
    orders,
    setOrders,
    fetchOrders,
    calculateStats,
    navigate,
    db,
    isOrderEditable,
    EDIT_WINDOW_MINUTES,
    confirmAction,
    notifyError,
    notifyInfo,
    notifySuccess,
    notifyWarning,
    showToast
  })

  useOverlayLock(!!deleteConfirmOrder)

  const formatDate = formatOrderDate

  if (ordersLoading) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </RequireUser>
    )
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div className="p-6 space-y-6 pb-8">
      <ToastBanner toast={toast} />
      <DashboardHeader
        user={user}
        countdownLabel={countdownLabel}
        countdownValue={countdownValue}
        countdownTone={countdownTone}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        headerOrder={headerOrder}
        headerStatus={headerStatus}
        headerSummary={headerSummary}
        canEditOrder={(order) => isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
      />

      <div className="mt-8">
        <StatsCards stats={stats} />
      </div>

      <OrderRegisteredCard
        headerOrder={headerOrder}
        headerSummary={headerSummary}
        deliveryText={deliveryText}
        isDeliveringTomorrow={isDeliveringTomorrow}
      />

      <WeeklyOrdersSection
        weeklyOrders={weeklyOrders}
        formatWeeklyDate={formatWeeklyDate}
        getServiceLabel={getServiceLabel}
        getMainMenuLabel={getMainMenuLabel}
        getStatusLabel={getStatusLabel}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
        canEditOrder={(order) => isOrderEditable(order.created_at, EDIT_WINDOW_MINUTES)}
      />

      {/* Support Card - Para usuarios normales */}
      {!isAdmin && <SupportCard />}

      <ArchivedOrdersSection
        isAdmin={isAdmin}
        orders={orders}
        formatDate={formatDate}
        onViewOrder={handleViewOrder}
      />

      <OrderHistorySection
        orders={orders}
        formatDate={formatDate}
        summarizeOrderItems={summarizeOrderItems}
        getCustomSideFromResponses={getCustomSideFromResponses}
        serviceBadge={serviceBadge}
      />

      {deleteConfirmOrder && (
        <DeleteConfirmModal
          order={deleteConfirmOrder}
          onConfirm={confirmDeleteOrder}
          onClose={closeDeleteConfirm}
          submitting={deleteSubmitting}
        />
      )}

      </div>
    </RequireUser>
  )
}

export default Dashboard
