import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import RequireUser from '../RequireUser'
import { loadCafeteriaOrder } from '../../cafeteria/cafeteriaStorage'
import { COMPANY_LIST } from '../../constants/companyConfig'

const CafeteriaSuccessPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const order = location.state?.order || loadCafeteriaOrder() || null
  const redirectSeconds = 5

  const summary = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : []
    const totalItems = Number(order?.totalItems || items.reduce((acc, item) => acc + Number(item?.quantity || 0), 0))
    const companyName = COMPANY_LIST.find((c) => c.slug === order?.company_slug)?.name || order?.company_name || 'Sin empresa'
    const highlights = items.slice(0, 3).map((item) => item?.name).filter(Boolean)
    return { totalItems, companyName, highlights }
  }, [order])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, redirectSeconds * 1000)
    return () => clearTimeout(timeoutId)
  }, [navigate])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-10 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-gray-900">Pedido confirmado</h1>
          <p className="mt-2 text-base sm:text-lg text-gray-600 font-semibold">
            Tu solicitud de cafetería quedó registrada.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</p>
              <p className="text-base font-black text-gray-900 mt-1">{summary.companyName}</p>
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary.totalItems || 0}</p>
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">
                {summary.highlights.length ? summary.highlights.join(', ') : 'Sin detalle'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0b1f3a] text-white font-bold text-base px-6 py-3 shadow-md"
          >
            Ir al dashboard
          </button>

          <p className="mt-3 text-xs sm:text-sm text-gray-500 font-semibold">
            Redirigiendo al dashboard...
          </p>
        </div>
      </div>
    </RequireUser>
  )
}

export default CafeteriaSuccessPage
