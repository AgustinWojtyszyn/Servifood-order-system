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
    <div className="flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-white shadow-2xl border-r-4 border-secondary-500">
        <div className="flex items-center justify-between h-16 px-4 border-b-2 border-primary-200 bg-gradient-to-r from-primary-700 to-primary-800">
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
        <nav className="mt-8 px-4 bg-white min-h-full flex flex-col">
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
                        classes += " bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md animate-pulse-slow"
                      } else {
                        classes += " text-gray-800 hover:bg-blue-50"
                      }
                      return classes
                    }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                  </NavLink>
                </li>
              )
            })}
            {isAdmin && (
              <li>
                <button
                  onClick={() => {
                    setAdminTutorialOpen(true)
                    setSidebarOpen(false)
                  }}
                  className="group flex items-center w-full px-4 py-3 text-purple-700 rounded-xl bg-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg border-2 border-purple-200 hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700 mt-4"
                >
                  <Settings className="h-6 w-6 mr-3 flex-shrink-0 group-hover:text-white transition-colors" />
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
                className="group flex items-center w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-xl border-2 border-blue-500 hover:border-blue-400 hover:from-blue-500 hover:to-blue-600"
              >
                <HelpCircle className="h-6 w-6 mr-3 flex-shrink-0 text-white" />
                <span className="text-white">Ver Tutorial</span>
              </button>
            </li>
            <li>
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
            </li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 ml-[256px] min-h-screen overflow-visible px-6 pt-6 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-2xl border-b-4 border-secondary-500 mb-6">
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
        <div>
          {children}
        </div>
        {/* Tutorial Modals */}
        <Tutorial isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
        <AdminTutorial isOpen={adminTutorialOpen} onClose={() => setAdminTutorialOpen(false)} />
        {/* Support Button */}
        <SupportButton />
      </main>
    </div>
  )
}

export default Layout
