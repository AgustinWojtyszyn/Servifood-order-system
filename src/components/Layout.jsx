import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth, db } from '../supabaseClient'
import { Menu, X, User, LogOut, ShoppingCart, Settings, HelpCircle, UserCircle, Calendar, MessageCircle } from 'lucide-react'
import servifoodLogo from '../assets/servifood logo.jpg'
import Tutorial from './Tutorial'
import AdminTutorial from './AdminTutorial'
import SupportButton from './SupportButton'

const Layout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [adminTutorialOpen, setAdminTutorialOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

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
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-row items-center h-16 py-0 overflow-hidden w-full">
            <img 
              src={servifoodLogo} 
              alt="Servifood Logo" 
              className="max-h-14 sm:max-h-16 w-auto rounded object-cover ml-2"
              style={{height: '48px', maxHeight: '100%', display: 'block'}}
            />
            <span className="ml-4 text-3xl sm:text-4xl font-extrabold select-none flex items-center drop-shadow-lg" style={{letterSpacing: '0.01em'}}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-700">Servi</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary-400 to-secondary-700 ml-1">Food</span>
            </span>
            <div className="flex-grow"></div>
            <span
              className="text-xs sm:text-base font-bold text-white drop-shadow-lg truncate ml-4"
              style={{
                maxWidth: '60px',
                display: 'inline-block',
                textAlign: 'left',
                fontSize: '11px',
                lineHeight: '1.1',
                verticalAlign: 'middle',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 md:hidden mr-1"
              style={{marginLeft: 'auto'}}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>
          {/* Sidebar */}
          <nav
            className={`fixed z-50 inset-y-0 left-0 w-72 bg-white shadow-xl transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 md:block`}
            style={{ minHeight: '100vh' }}
          >
            <div className="flex flex-col h-full py-6">
              <div className="flex items-center px-4 mb-8">
                <img
                  src={servifoodLogo}
                  alt="Servifood Logo"
                  className="max-h-14 sm:max-h-16 w-auto rounded object-cover"
                  style={{ height: '48px', maxHeight: '100%', display: 'block' }}
                />
                <span className="ml-4 text-3xl sm:text-4xl font-extrabold select-none flex items-center drop-shadow-lg" style={{ letterSpacing: '0.01em' }}>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-700">Servi</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary-400 to-secondary-700 ml-1">Food</span>
                </span>
              </div>
              <div className="flex-grow">
                {menuItems.map((item, idx) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `group flex items-center w-full px-4 py-3 rounded-xl font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg mb-2 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          : item.highlighted
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
                          : 'bg-white text-blue-900'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-6 w-6 mr-3 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
              <div className="mt-4 space-y-2 px-4">
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
              {/* Botón cerrar en móvil */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </nav>

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
