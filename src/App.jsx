import { lazy, Suspense, useState, useEffect } from 'react'
import { useAuthContext } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, auth } from './supabaseClient'
import SplashScreen from './components/SplashScreen'
import './App.css'

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
const AdminChat = lazy(() => import('./components/AdminChat'))
const OrderForm = lazy(() => import('./components/OrderForm'))
const EditOrderForm = lazy(() => import('./components/EditOrderForm'))
const Profile = lazy(() => import('./components/Profile'))

// Componente de carga interno (para Suspense)
const InternalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

function App() {
  const { user, loading } = useAuthContext()

  const [timeoutReached, setTimeoutReached] = useState(false);
  // Timeout de 7 segundos para mostrar fallback si loading no termina
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setTimeoutReached(true);
        console.error('[App] Timeout: la sesión no se recuperó en 7 segundos. Verifica conexión o Supabase.');
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !timeoutReached) {
    console.log('[App] Mostrando loader inicial, esperando recuperación de sesión...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white text-base font-medium">Cargando sesión...</p>
          <p className="text-white/70 text-xs mt-2">Si ves esto más de 7 segundos, revisa los logs de consola.</p>
        </div>
      </div>
    );
  }
  if (loading && timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-700 via-red-800 to-red-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white text-base font-bold">Error al recuperar sesión</p>
          <p className="text-white/70 text-xs mt-2">No se pudo recuperar la sesión. Intenta recargar o revisa tu conexión.</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 min-h-screen min-w-0 w-full h-auto overflow-x-hidden overflow-y-auto">
        <Suspense fallback={<InternalLoader />}>
          <Routes>
            <Route path="/" element={
              user ? <Layout user={user}><Dashboard user={user} /></Layout> : <LandingPage />
            } />
            <Route path="/dashboard" element={
              user ? <Layout user={user}><Dashboard user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/login" element={
              user ? <Layout user={user}><Dashboard user={user} /></Layout> : <Login />
            } />
            <Route path="/register" element={
              user ? <Layout user={user}><Dashboard user={user} /></Layout> : <Register />
            } />
            <Route path="/forgot-password" element={
              user ? <Layout user={user}><Dashboard user={user} /></Layout> : <ForgotPassword />
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/order" element={
              user ? <Layout user={user}><OrderForm user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/edit-order" element={
              user ? <Layout user={user}><EditOrderForm user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/profile" element={
              user ? <Layout user={user}><Profile user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/admin" element={
              user ? <Layout user={user}><AdminPanel /></Layout> : <InternalLoader />
            } />
            <Route path="/superadmin" element={
              user ? <Layout user={user}><SuperAdminPanel user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/daily-orders" element={
              user ? <Layout user={user}><DailyOrders user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/admin-chat" element={
              user ? <Layout user={user}><AdminChat user={user} /></Layout> : <InternalLoader />
            } />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
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
