import { lazy, Suspense, useEffect } from 'react'
import { useAuthContext } from './contexts/authContextValue'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './components/SplashScreen'
import './App.css'

// Importaciones inmediatas (críticas para la carga inicial)
import Layout from './components/Layout'
import Login from './components/Login'
import LandingPage from './components/LandingPage'
import { useScreenMetrics } from './hooks/useScreenMetrics'
import AdminPanel from './components/AdminPanel'
import NoticeHost from './components/NoticeHost'
import ConfirmHost from './components/ConfirmHost'
import RequireAdmin from './components/RequireAdmin'
import LoadingState from './components/ui/LoadingState'

// Lazy loading de componentes (carga diferida)
const Register = lazy(() => import('./components/Register'))
const ForgotPassword = lazy(() => import('./components/ForgotPassword'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const DailyOrders = lazy(() => import('./components/DailyOrders'))
const OrderCompanySelector = lazy(() => import('./components/OrderCompanySelector'))
const OrderForm = lazy(() => import('./components/OrderForm'))
const EditOrderForm = lazy(() => import('./components/EditOrderForm'))
const Profile = lazy(() => import('./components/Profile'))
const MonthlyPanel = lazy(() => import('./components/MonthlyPanel'))
const AuditLogs = lazy(() => import('./components/AuditLogs'))
const OrderDetails = lazy(() => import('./components/OrderDetails'))
const CafeteriaDashboardPage = lazy(() => import('./components/cafeteria/CafeteriaDashboardPage'))
const CafeteriaNewOrderPage = lazy(() => import('./components/cafeteria/CafeteriaNewOrderPage'))
const CafeteriaCurrentOrderPage = lazy(() => import('./components/cafeteria/CafeteriaCurrentOrderPage'))
const CafeteriaSuccessPage = lazy(() => import('./components/cafeteria/CafeteriaSuccessPage'))
const TendenciasPage = lazy(() => import('./pages/TendenciasPage'))

// Excel Analysis queda deshabilitado por defecto mientras Render sirve solo el
// frontend estatico. Reactivar unicamente al migrarlo a Edge Function/backend real.
const ENABLE_EXCEL_ANALYSIS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_EXCEL_ANALYSIS === 'true'
const ExcelAnalysis = ENABLE_EXCEL_ANALYSIS
  ? lazy(() => import('./components/ExcelAnalysis'))
  : null

const ADMIN_ROUTE_PATHS = [
  '/cafeteria',
  '/cafeteria/new',
  '/cafeteria/order',
  '/cafeteria/confirm',
  '/admin',
  '/daily-orders',
  '/monthly-panel',
  '/auditoria',
  '/tendencias',
  '/excel-analysis'
]

// Componente de carga interno (para Suspense)
const InternalLoader = () => (
  <LoadingState variant="fullscreen" message="Cargando..." />
)

const ExcelAnalysisDisabled = () => (
  <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10">
    <section className="w-full rounded-lg border border-white/20 bg-white p-6 text-slate-900 shadow-xl sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-700">
        Funcion temporalmente deshabilitada
      </p>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
        Analisis de Excel no disponible
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        Esta herramienta depende de un endpoint backend que no forma parte del deploy actual.
        Se debe migrar a una Supabase Edge Function o a un backend real antes de volver a habilitarla.
      </p>
    </section>
  </div>
)

function App() {
  const { user, loading } = useAuthContext()
  const isAdminPath = ADMIN_ROUTE_PATHS.includes(window.location.pathname)

  const ScreenMetricsListener = () => {
    useScreenMetrics()
    return null
  }

  const renderAdminRoute = (content) => (
    <RequireAdmin>
      <Layout user={user} loading={loading}>
        {content}
      </Layout>
    </RequireAdmin>
  )

  useEffect(() => {
    if (!import.meta.env.DEV) return

    let lastHighlighted = null

    const describeEl = (el) => {
      const tag = el.tagName?.toLowerCase?.() || 'node'
      const id = el.id ? `#${el.id}` : ''
      const classList = typeof el.className === 'string' && el.className.trim().length
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : ''
      return `${tag}${id}${classList}`
    }

    const captureMetrics = (el) => {
      if (!el) return null
      const style = window.getComputedStyle(el)
      const clientHeight = el.clientHeight || 0
      const scrollHeight = el.scrollHeight || 0
      const dy = scrollHeight - clientHeight
      const vbarPx = Math.max(0, el.offsetWidth - el.clientWidth)
      return {
        el,
        selector: describeEl(el),
        overflowY: style.overflowY,
        height: style.height,
        maxHeight: style.maxHeight,
        clientHeight,
        scrollHeight,
        dy,
        vbarPx
      }
    }

    const logScrollOwners = () => {
      const scopedNodes = document.body
        ? [document.body, ...document.body.querySelectorAll('*')]
        : Array.from(document.querySelectorAll('*'))

      const entries = scopedNodes
        .map((el) => {
          const metrics = captureMetrics(el)
          if (!metrics) return null
          const hasOverflow = ['auto', 'scroll', 'overlay'].includes(metrics.overflowY) && metrics.dy > 2
          const showsScrollbar = metrics.vbarPx > 0 || metrics.overflowY === 'scroll'
          return hasOverflow || showsScrollbar ? metrics : null
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (b.vbarPx !== a.vbarPx) return b.vbarPx - a.vbarPx
          return b.dy - a.dy
        })

      if (lastHighlighted && (!entries.length || lastHighlighted !== entries[0].el)) {
        lastHighlighted.style.outline = ''
        lastHighlighted = null
      }

      if (entries[0]) {
        entries[0].el.style.outline = '2px solid red'
        lastHighlighted = entries[0].el
      }

      if (entries.length) {
        console.groupCollapsed('[scroll-debug] overflow-y containers / visible scrollbars (body descendants)')
        console.table(
          entries
            .slice(0, 20)
            .map(({ selector, overflowY, height, maxHeight, clientHeight, scrollHeight, dy, vbarPx }) => ({
              selector,
              overflowY,
              height,
              maxHeight,
              clientHeight,
              scrollHeight,
              dy,
              vbarPx
            }))
        )
        console.groupEnd()
      } else {
        console.log('[scroll-debug] Sin contenedores con overflow-y auto/scroll/overlay visibles')
      }

      const snapshotTargets = [
        ['html', document.documentElement],
        ['body', document.body],
        ['#root', document.getElementById('root')],
        ['.app-shell', document.querySelector('.app-shell')]
      ]

      const snapshot = snapshotTargets.reduce((acc, [label, el]) => {
        const metrics = captureMetrics(el)
        if (!metrics) return acc
        acc[label] = {
          overflowY: metrics.overflowY,
          height: metrics.height,
          maxHeight: metrics.maxHeight,
          clientHeight: metrics.clientHeight,
          scrollHeight: metrics.scrollHeight,
          dy: metrics.dy,
          vbarPx: metrics.vbarPx
        }
        return acc
      }, {})

      console.log('[scroll-debug] snapshot', snapshot)

      return entries
    }

    window.__logScrollOwners = logScrollOwners
    window.__logScrollY = logScrollOwners
    logScrollOwners()

    return () => {
      if (lastHighlighted) {
        lastHighlighted.style.outline = ''
      }
      if (window.__logScrollY === logScrollOwners) delete window.__logScrollY
      if (window.__logScrollOwners === logScrollOwners) delete window.__logScrollOwners
    }
  }, [])

  return (
    loading && !isAdminPath ? (
      <InternalLoader />
    ) : (
      <Router>
        <ScreenMetricsListener />
        <NoticeHost />
        <ConfirmHost />
        <div
          className="app-shell bg-linear-to-br from-primary-700 via-primary-800 to-primary-900 min-h-dvh min-w-0 w-full overflow-x-hidden overflow-y-visible"
        >
          <Suspense fallback={<InternalLoader />}>
            <Routes>
            <Route path="/" element={
              !loading && (user ? <Navigate to="/dashboard" /> : <LandingPage />)
            } />
            <Route path="/dashboard" element={
              !loading && (user ? <Layout user={user} loading={loading}><Dashboard user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/login" element={
              !loading && (user ? <Navigate to="/dashboard" /> : <Login />)
            } />
            <Route path="/register" element={
              !loading && (user ? <Navigate to="/dashboard" /> : <Register />)
            } />
            <Route path="/forgot-password" element={
              !loading && (user ? <Navigate to="/dashboard" /> : <ForgotPassword />)
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/order" element={
              !loading && (user ? <Layout user={user} loading={loading}><OrderCompanySelector user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/order/:companySlug" element={
              !loading && (user ? <Layout user={user} loading={loading}><OrderForm user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/cafeteria" element={
              renderAdminRoute(<CafeteriaDashboardPage user={user} loading={loading} />)
            } />
            <Route path="/cafeteria/new" element={
              renderAdminRoute(<CafeteriaNewOrderPage user={user} loading={loading} />)
            } />
            <Route path="/cafeteria/order" element={
              renderAdminRoute(<CafeteriaCurrentOrderPage user={user} loading={loading} />)
            } />
            <Route path="/cafeteria/confirm" element={
              renderAdminRoute(<CafeteriaSuccessPage user={user} loading={loading} />)
            } />
            <Route path="/edit-order" element={
              !loading && (user ? <Layout user={user} loading={loading}><EditOrderForm user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/profile" element={
              !loading && (user ? <Layout user={user} loading={loading}><Profile user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/admin" element={
              renderAdminRoute(<AdminPanel loading={loading} />)
            } />
            <Route path="/daily-orders" element={
              renderAdminRoute(<DailyOrders user={user} loading={loading} />)
            } />
            <Route path="/monthly-panel" element={
              renderAdminRoute(<MonthlyPanel user={user} loading={loading} />)
            } />
            <Route path="/orders/:orderId" element={
              !loading && (user ? <Layout user={user} loading={loading}><OrderDetails user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
            } />
            <Route path="/auditoria" element={
              renderAdminRoute(<AuditLogs user={user} loading={loading} />)
            } />
            <Route path="/tendencias" element={
              renderAdminRoute(<TendenciasPage />)
            } />
            <Route path="/excel-analysis" element={
              renderAdminRoute(ENABLE_EXCEL_ANALYSIS ? <ExcelAnalysis /> : <ExcelAnalysisDisabled />)
            } />
            {/* Redirección global para rutas inexistentes */}
            <Route
              path="*"
              element={
                !loading && (
                  <Navigate
                    to={user ? '/dashboard' : '/'}
                    replace
                  />
                )
              }
            />
            </Routes>
          </Suspense>
        </div>
      </Router>
    )
  )
}

export default App
