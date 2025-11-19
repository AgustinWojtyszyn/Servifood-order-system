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
    setIsAdmin(user?.user_metadata?.role === 'admin')
  }, [fontLarge, user])

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
      icon: Calendar
    })
    menuItems.push({ name: 'Panel Admin', path: '/admin', icon: Settings })
    menuItems.push({ name: 'Chat Admins', path: '/admin-chat', icon: MessageCircle })
  }

  // Add Profile option for all users
  menuItems.push({ name: 'Mi Perfil', path: '/profile', icon: UserCircle })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      {/* Header restaurado y centrado */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-2xl border-b-4 border-secondary-500 flex flex-col items-center justify-center py-4">
        <div className="flex flex-col items-center w-full">
          <img src={servifoodLogo} alt="Servifood Logo" className="h-12 w-12 rounded object-cover mb-2" />
          <span className="text-2xl font-bold text-white drop-shadow-lg mb-2">ServiFood Catering</span>
          <span className="text-base font-bold text-white drop-shadow-lg px-2 py-1 rounded bg-blue-700/60 max-w-[90vw] truncate text-center">
            Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </span>
        </div>
        <button
          onClick={() => setFontLarge(f => !f)}
          className={`mt-4 px-4 py-2 rounded-xl font-bold text-white drop-shadow-lg bg-orange-500 hover:bg-orange-600 transition-all flex items-center gap-2 border-2 border-white/30`}
          aria-label="Activar modo letra grande"
          style={{ minWidth: '36px', minHeight: '36px', fontSize: fontLarge ? '1.08rem' : '0.95rem', lineHeight: '1.2' }}
        >
          <Type className="h-5 w-5" />
          <span className="truncate">{fontLarge ? 'Letra Normal' : 'Letra Grande'}</span>
        </button>
      </header>

      {/* Main content centrado y sin sidebar */}
      <main className="flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 min-h-screen">
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
