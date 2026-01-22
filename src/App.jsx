import { lazy, Suspense, useEffect } from 'react'
import { useAuthContext } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, auth } from './supabaseClient'
import SplashScreen from './components/SplashScreen'
import './App.css'
import { HelpCenterProvider } from './contexts/HelpCenterProvider'
import HelpWidget from './components/HelpWidget'

// Importaciones inmediatas (críticas para la carga inicial)
import Layout from './components/Layout'
import Login from './components/Login'
import LandingPage from './components/LandingPage'

// Lazy loading de componentes (carga diferida)
const Register = lazy(() => import('./components/Register'))
const ForgotPassword = lazy(() => import('./components/ForgotPassword'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))
const SuperAdminPanel = lazy(() => import('./components/SuperAdminPanel'))
const DailyOrders = lazy(() => import('./components/DailyOrders'))
const OrderCompanySelector = lazy(() => import('./components/OrderCompanySelector'))
const OrderForm = lazy(() => import('./components/OrderForm'))
const EditOrderForm = lazy(() => import('./components/EditOrderForm'))
const Profile = lazy(() => import('./components/Profile'))
const MonthlyPanel = lazy(() => import('./components/MonthlyPanel'))

// Componente de carga interno (para Suspense)
const InternalLoader = () => (
  <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

function App() {
  const { user, loading } = useAuthContext()

  return (
    loading ? (
      <InternalLoader />
    ) : (
      <HelpCenterProvider>
        <Router>
          <div
            className="app-shell bg-linear-to-br from-primary-700 via-primary-800 to-primary-900 min-h-dvh min-w-0 w-full overflow-x-hidden"
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
              <Route path="/order" element={
                !loading && (user ? <Layout user={user} loading={loading}><OrderCompanySelector user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/order/:companySlug" element={
                !loading && (user ? <Layout user={user} loading={loading}><OrderForm user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/edit-order" element={
                !loading && (user ? <Layout user={user} loading={loading}><EditOrderForm user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/profile" element={
                !loading && (user ? <Layout user={user} loading={loading}><Profile user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/admin" element={
                !loading && (user ? <Layout user={user} loading={loading}><AdminPanel loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/superadmin" element={
                !loading && (user ? <Layout user={user} loading={loading}><SuperAdminPanel user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/daily-orders" element={
                !loading && (user ? <Layout user={user} loading={loading}><DailyOrders user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/monthly-panel" element={
                !loading && (user ? <Layout user={user} loading={loading}><MonthlyPanel user={user} loading={loading} /></Layout> : <Navigate to="/login" />)
              } />
              <Route path="/auth/callback" element={<AuthCallback />} />
              </Routes>
            </Suspense>
            {/* Widget global de ayuda */}
            <HelpWidget />
          </div>
        </Router>
      </HelpCenterProvider>
    )
  )
}

// Componente para manejar callback de autenticación
function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error en callback de auth:', error)
      }
      // Redirigir al dashboard
      window.location.href = '/dashboard'
    }

    handleAuthCallback()
  }, [])

  return <InternalLoader />
}

export default App
