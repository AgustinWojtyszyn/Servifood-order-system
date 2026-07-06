import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RequireUser from '../RequireUser'
import LoadingState from '../ui/LoadingState'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'

const CafeteriaEntryPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading, error } = useCafeteriaPendingOrder(user)

  useEffect(() => {
    if (pendingLoading || error) return
    if (pendingOrder) {
      navigate('/cafeteria/order', { replace: true })
    } else {
      navigate('/cafeteria/new', { replace: true })
    }
  }, [pendingLoading, pendingOrder, error, navigate])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="flex items-center justify-center py-10">
        {pendingLoading ? (
          <LoadingState variant="inline" message="Cargando pedido..." />
        ) : (
          <div className="text-white font-semibold">
            {error || 'Redirigiendo...'}
          </div>
        )}
      </div>
    </RequireUser>
  )
}

export default CafeteriaEntryPage
