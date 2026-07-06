import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CafeteriaHome from './CafeteriaHome'
import RequireUser from '../RequireUser'
import LoadingState from '../ui/LoadingState'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'

const CafeteriaNewOrderPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading } = useCafeteriaPendingOrder(user)

  useEffect(() => {
    if (pendingLoading) return
    if (pendingOrder) {
      navigate('/cafeteria/order', { replace: true })
    }
  }, [pendingLoading, pendingOrder, navigate])

  if (pendingLoading || pendingOrder) {
    return (
      <RequireUser user={user} loading={loading}>
        <div className="py-10">
          <LoadingState message="Cargando pedido..." />
        </div>
      </RequireUser>
    )
  }

  return <CafeteriaHome user={user} loading={loading} />
}

export default CafeteriaNewOrderPage
