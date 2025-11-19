import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth, db } from '../supabaseClient'
import { Menu, X, User, LogOut, ShoppingCart, Settings, HelpCircle, UserCircle, Calendar, MessageCircle, Type } from 'lucide-react'
import servifoodLogo from '../assets/servifood logo.jpg'
import Tutorial from './Tutorial'
import AdminTutorial from './AdminTutorial'
import SupportButton from './SupportButton'

const Layout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [adminTutorialOpen, setAdminTutorialOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [fontLarge, setFontLarge] = useState(() => {
    return localStorage.getItem('fontLargeMode') === 'true'
  })
  const navigate = useNavigate()
  // Accesibilidad: alternar modo de letra grande
  useEffect(() => {
    const html = document.documentElement
    if (fontLarge) {
      html.classList.add('font-large-mode')
    } else {
      html.classList.remove('font-large-mode')
    }
    localStorage.setItem('fontLargeMode', fontLarge)
  }, [fontLarge])

  useEffect(() => {
    checkUserRole()
  }, [user])

  const checkUserRole = async () => {
    try {
      const { data, error } = await db.getUsers()
      if (!error && data) {
        const currentUser = data.find(u => u.id === user?.id)
        setIsAdmin(currentUser?.role === 'admin')
      }
    } catch (err) {
      console.error('Error checking user role:', err)
      // Fallback a user_metadata si falla la consulta
      setIsAdmin(user?.user_metadata?.role === 'admin')
    }
  }

  const handleLogout = async () => {
    await auth.signOut()
    navigate('/login')
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
    menuItems.push({ name: 'Panel Admin', path: '/admin', icon: Settings })
    menuItems.push({ name: 'Chat Admins', path: '/admin-chat', icon: MessageCircle })
  }

  // Add Profile option for all users
  menuItems.push({ name: 'Mi Perfil', path: '/profile', icon: UserCircle })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-2xl border-b-4 border-secondary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center ml-4 md:ml-0">
                <img 
                  src={servifoodLogo} 
                  alt="Servifood Logo" 
                  className="h-12 w-12 rounded object-cover"
                />
                <span className="ml-3 text-2xl font-bold text-white drop-shadow-lg">ServiFood Catering</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 relative w-full">
              <span className="text-base font-bold text-white drop-shadow-lg flex-1 text-right pr-2">
                Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </span>
              <button
                onClick={() => setFontLarge(f => !f)}
                className={`px-2 py-1 rounded-xl font-bold text-white drop-shadow-lg bg-orange-500 hover:bg-orange-600 transition-all text-base flex items-center gap-2 border-2 border-white/30 ${fontLarge ? 'ring-4 ring-yellow-400' : ''}
                  max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis
                  md:text-base md:max-w-none md:whitespace-normal
                  hidden sm:inline-block ml-2`}
                aria-label="Activar modo letra grande"
                style={{ minWidth: '36px', minHeight: '36px', fontSize: fontLarge ? '0.95rem' : '0.9rem', lineHeight: '1.2' }}
              >
                <Type className="h-4 w-4" />
                <span className="truncate">{fontLarge ? 'Letra Normal' : 'Letra Grande'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
              {/* Botón accesibilidad flotante en mobile */}
              <button
                onClick={() => setFontLarge(f => !f)}
                className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-xl font-bold text-white drop-shadow-2xl bg-orange-500 hover:bg-orange-600 transition-all text-xs flex items-center gap-2 border-2 border-white/30 sm:hidden`}
                aria-label="Activar modo letra grande"
                style={{ minWidth: '36px', minHeight: '36px', fontSize: fontLarge ? '0.95rem' : '0.9rem', lineHeight: '1.2' }}
              >
                <Type className="h-4 w-4" />
                <span className="truncate">{fontLarge ? 'Letra Normal' : 'Letra Grande'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 border-r-4 border-secondary-500`}>
          <div className="flex items-center justify-center h-16 px-4 border-b-2 border-primary-200 bg-gradient-to-r from-primary-700 to-primary-800">
            <span className="text-2xl font-extrabold text-white drop-shadow-lg">ServiFood</span>
          </div>

          <nav className="mt-8 px-4 bg-white min-h-full flex flex-col">
            <ul className="space-y-2 flex-1 bg-white">
              {menuItems.map((item) => {
                const Icon = item.icon
                
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => {
                        // Clase base para todos
                        let classes = "flex items-center px-4 py-3 rounded-xl font-bold text-base transition-all duration-200 shadow-sm"
                        
                        // Si está activo - fondo azul sólido con texto blanco
                        if (isActive) {
                          classes += " bg-blue-600 text-white shadow-lg"
                        }
                        // Si es destacado pero no activo
                        else if (item.highlighted) {
                          classes += " bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md animate-pulse-slow"
                        }
                        // Normal
                        else {
                          classes += " text-gray-800 hover:bg-blue-50"
                        }
                        
                        return classes
                      }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
                      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                        {item.name}
                        {item.highlighted && (
                          <span className="badge-nuevo ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-black flex-shrink-0 inline-block align-middle">
                            ¡NUEVO!
                          </span>
                        )}
                      </span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>

            {/* Logout Button */}
            <div className="mt-auto mb-6 space-y-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    setAdminTutorialOpen(true)
                    setSidebarOpen(false)
                  }}
                  className="group flex items-center w-full px-4 py-3 text-purple-700 rounded-xl bg-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg border-2 border-purple-200 hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700"
                >
                  <Settings className="h-6 w-6 mr-3 flex-shrink-0 group-hover:text-white transition-colors" />
                  <span className="group-hover:text-white transition-colors">Tutorial Admin 👨‍💼</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setTutorialOpen(true)
                  setSidebarOpen(false)
                }}
                className="group flex items-center w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-xl border-2 border-blue-500 hover:border-blue-400 hover:from-blue-500 hover:to-blue-600"
              >
                <HelpCircle className="h-6 w-6 mr-3 flex-shrink-0 text-white" />
                <span className="text-white">Ver Tutorial</span>
              </button>
              
              <button
                onClick={() => {
                  handleLogout()
                  setSidebarOpen(false)
                }}
                className="group flex items-center w-full px-4 py-3 text-red-700 rounded-xl bg-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg border-2 border-red-200 hover:border-transparent hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700"
              >
                <LogOut className="h-6 w-6 mr-3 flex-shrink-0 group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">Cerrar Sesión</span>
              </button>
            </div>
          </nav>

          {/* Botón cerrar en móvil */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </aside>

        {/* Overlay para móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Support Button */}
      <SupportButton />
      
      {/* Tutorial Modal */}
      <Tutorial isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      
      {/* Admin Tutorial Modal */}
      {isAdmin && (
        <AdminTutorial isOpen={adminTutorialOpen} onClose={() => setAdminTutorialOpen(false)} />
      )}
    </div>
  )
}

export default Layout
