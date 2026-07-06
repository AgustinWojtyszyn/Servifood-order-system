import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CafeteriaConfirm from './CafeteriaConfirm'
import RequireUser from '../RequireUser'
import LoadingState from '../ui/LoadingState'
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
        <div className="py-10">
          <LoadingState message="Cargando pedido..." />
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
