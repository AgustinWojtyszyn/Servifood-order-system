import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CafeteriaConfirm from './CafeteriaConfirm'
import RequireUser from '../RequireUser'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'

const CafeteriaCurrentOrderPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading } = useCafeteriaPendingOrder(user)

  useEffect(() => {
    if (pendingLoading) return
    if (!pendingOrder) {
      navigate('/cafeteria/new', { replace: true })
    }
  }, [pendingLoading, pendingOrder, navigate])

  if (pendingLoading || !pendingOrder) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </RequireUser>
    )
  }

  return (
    <CafeteriaConfirm
      user={user}
      loading={loading}
      orderId={pendingOrder.id}
      initialOrder={pendingOrder}
    />
  )
}

export default CafeteriaCurrentOrderPage
