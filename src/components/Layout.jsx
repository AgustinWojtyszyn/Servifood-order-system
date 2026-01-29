import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth, db } from '../supabaseClient'
import { Menu, X, User, LogOut, ShoppingCart, Settings, HelpCircle, UserCircle, Calendar, MessageCircle, ClipboardList } from 'lucide-react'
import servifoodLogo from '../assets/servifood logo.jpg'
import Tutorial from './Tutorial'
import AdminTutorial from './AdminTutorial'
import SupportButton from './SupportButton'
import RequireUser from './RequireUser'
import { useScrollLock } from '../hooks/useScrollLock'
import { OverlayLockProvider } from '../contexts/OverlayLockContext'
import DevPanel from './DevPanel'


const Layout = ({ children, user, loading }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [adminTutorialOpen, setAdminTutorialOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [externalLocks, setExternalLocks] = useState(0)
  const navigate = useNavigate()
  // Helpers de diagnóstico siempre disponibles bajo window.__logScrollMetrics y __logScrollContainers.
  const isScrollDebug = (() => {
    if (typeof import.meta === 'undefined') return false
    const envFlag = import.meta?.env?.VITE_SCROLL_DEBUG === '1'
    const isDev = import.meta?.env?.DEV
    const urlFlag = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scrollDebug') === '1'
    return envFlag || isDev || urlFlag
  })()
  const registerExternalLock = useCallback(() => {
    setExternalLocks((count) => count + 1)
    return () => setExternalLocks((count) => Math.max(0, count - 1))
  }, [])
  const isAnyOverlayOpen = sidebarOpen || tutorialOpen || adminTutorialOpen || externalLocks > 0

  // Scroll lock centralizado para cualquier overlay (sidebar, tutoriales o locks de hijos).
  useScrollLock(isAnyOverlayOpen)

  // Herramienta de diagnóstico (dev) para identificar contenedores que generan barras de scroll internas.
  useEffect(() => {
    const logScrollContainers = () => {
      const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
        const style = window.getComputedStyle(el)
        const oy = style.overflowY
        const hasOverflow = oy === 'auto' || oy === 'scroll' || oy === 'overlay'
        return hasOverflow && el.scrollHeight - 1 > el.clientHeight
      })
      return candidates
    }

    window.__logScrollContainers = logScrollContainers

    return () => {
      if (window.__logScrollContainers === logScrollContainers) {
        delete window.__logScrollContainers
      }
    }
  }, [])

  // Métricas de scroll para diagnosticar doble scroll en dev.
  useEffect(() => {
    const logMetrics = () => {
      const metrics = {
        innerHeight: window.innerHeight,
        docScrollHeight: document.documentElement?.scrollHeight,
        bodyScrollHeight: document.body?.scrollHeight
      }
      window.__logScrollMetrics = () => metrics
    }
    logMetrics()
    window.addEventListener('resize', logMetrics)
    return () => {
      window.removeEventListener('resize', logMetrics)
      if (window.__logScrollMetrics === logMetrics) {
        delete window.__logScrollMetrics
      }
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    checkUserRole()
  }, [user])

  const checkUserRole = async () => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }
    try {
      const { data, error } = await db.getUsers()
      if (!error && data) {
        const currentUser = data.find(u => u.id === user?.id)
        const roleValue = currentUser?.role || user?.user_metadata?.role

        if (import.meta.env.DEV) {
          console.log('[Layout][role-debug] users fetched', {
            total: data.length,
            currentUser,
            roleValue,
            userMetaRole: user?.user_metadata?.role,
            flags: {
              isAdmin: roleValue === 'admin' || roleValue === 'superadmin' || currentUser?.is_superadmin
            }
          })
        }

        setIsAdmin(roleValue === 'admin' || roleValue === 'superadmin' || currentUser?.is_superadmin)
      } else if (error && import.meta.env.DEV) {
        console.warn('[Layout][role-debug] error fetching users', error)
      }
    } catch (err) {
      console.error('Error checking user role:', err)
      // Fallback a user_metadata si falla la consulta
      const roleValue = user?.user_metadata?.role
      setIsAdmin(roleValue === 'admin' || roleValue === 'superadmin')
    }
  }

  const handleLogout = async () => {
    const result = await auth.signOut()

    if (result?.error) {
      // Limpieza defensiva si el endpoint devolvió 403/session_not_found
      try {
        const { clearSupabaseStorage } = await import('../supabaseClient')
        clearSupabaseStorage()
      } catch (err) {
        console.error('Error cleaning Supabase storage after signOut:', err)
      }
    }

    navigate('/')
  }

  const menuItems = [
    { name: 'Panel Principal', path: '/dashboard', icon: User },
    { name: 'Nuevo Pedido', path: '/order', icon: ShoppingCart },
  ]

  if (isAdmin) {
    menuItems.push({ 
      name: 'Pedidos Diarios', 
      path: '/daily-orders', 
      icon: Calendar,
      highlighted: true  // Marcar como destacado
    })
    menuItems.push({ name: 'Panel Mensual', path: '/monthly-panel', icon: Calendar })
    menuItems.push({ name: 'Panel Admin', path: '/admin', icon: Settings })
    menuItems.push({ name: 'Auditoría', path: '/auditoria', icon: ClipboardList })
  }

  // Add Profile option for all users
  menuItems.push({ name: 'Mi Perfil', path: '/profile', icon: UserCircle })

  return (
    <RequireUser user={user} loading={loading}>
      <OverlayLockProvider registerLock={registerExternalLock}>
      <div className="flex flex-col bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 min-h-dvh w-full">
      {/* Header */}
      <header className="bg-linear-to-r from-blue-800 to-blue-900 shadow-2xl border-b-4 border-secondary-500">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-row items-center h-32 py-4 overflow-hidden w-full justify-center relative">
            <img 
              src={servifoodLogo} 
              alt="Servifood Logo" 
              className="max-h-40 sm:max-h-48 w-auto rounded object-cover"
              style={{height: '120px', maxHeight: '160px', display: 'block'}}
            />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 md:hidden mr-1 absolute left-2 top-1/2 transform -translate-y-1/2"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:static md:inset-0 border-r-4 border-secondary-500
          `}
          style={{ pointerEvents: sidebarOpen || window.innerWidth >= 768 ? 'auto' : 'none' }}
        >
          {/* Botón cerrar solo en mobile */}
          <div className="flex items-center justify-between h-16 px-4 border-b-2 border-primary-200 bg-linear-to-r from-primary-700 to-primary-800">
            <span className="text-4xl font-extrabold drop-shadow-lg font-montserrat">
              <span style={{ color: '#2563eb', fontSize: '2.8rem', lineHeight: 1 }}>Servi</span><span style={{ color: '#fb923c', fontSize: '2.8rem', lineHeight: 1 }}>Food</span>
            </span>
            <button
              className="md:hidden p-2 rounded hover:bg-primary-700/10 text-primary-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-7 w-7" />
            </button>
          </div>
          <nav className="mt-8 px-4 bg-white flex flex-col flex-1 min-h-0">
            <ul className="space-y-2 flex-1 bg-white">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => {
                        let classes = "flex items-center px-4 py-3 rounded-xl font-bold text-base transition-all duration-200 shadow-sm"
                        if (isActive) {
                          classes += " bg-blue-600 text-white shadow-lg"
                        } else if (item.highlighted) {
                          classes += " bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md animate-pulse-slow"
                        } else {
                          classes += " text-gray-800 hover:bg-blue-50"
                        }
                        return classes
                      }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-6 w-6 mr-3 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  </li>
                )
              })}
              {/* Botones de tutorial y cerrar sesión en la barra lateral */}
              {isAdmin && (
                <li>
                  <button
                    onClick={() => {
                      setAdminTutorialOpen(true)
                      setSidebarOpen(false)
                    }}
                    className="group flex items-center w-full px-4 py-3 text-purple-700 rounded-xl bg-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg border-2 border-purple-200 hover:border-transparent hover:bg-linear-to-r hover:from-purple-600 hover:to-purple-700 mt-4"
                  >
                    <Settings className="h-6 w-6 mr-3 shrink-0 group-hover:text-white transition-colors" />
                    <span className="group-hover:text-white transition-colors">Tutorial Admin 👨‍💼</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    setTutorialOpen(true)
                    setSidebarOpen(false)
                  }}
                  className="group flex items-center w-full px-4 py-3 rounded-xl bg-linear-to-r from-blue-600 to-blue-700 text-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-xl border-2 border-blue-500 hover:border-blue-400 hover:from-blue-500 hover:to-blue-600"
                >
                  <HelpCircle className="h-6 w-6 mr-3 shrink-0 text-white" />
                  <span className="text-white">Ver Tutorial</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleLogout()
                    setSidebarOpen(false)
                  }}
                  className="group flex items-center w-full px-4 py-3 text-red-700 rounded-xl bg-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg border-2 border-red-200 hover:border-transparent hover:bg-linear-to-r hover:from-red-600 hover:to-red-700"
                >
                  <LogOut className="h-6 w-6 mr-3 shrink-0 group-hover:text-white transition-colors" />
                  <span className="group-hover:text-white transition-colors">Cerrar Sesión</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-visible">
          {/* El único scroll vertical de la app vive en el body; aquí evitamos overflow para no generar una segunda barra. */}
          <div className="flex-1 p-4 md:p-8 min-h-0 overflow-visible">
            {children}
          </div>
          {/* Panel flotante solo admins */}
          <DevPanel />
        </main>
      </div>

      {/* Tutorial Modals */}
      <Tutorial isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      <AdminTutorial isOpen={adminTutorialOpen} onClose={() => setAdminTutorialOpen(false)} />

      {/* Support Button */}
      <SupportButton />
      </div>
      </OverlayLockProvider>
    </RequireUser>
  )
}

export default Layout
