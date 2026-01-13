import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile-optimizations.css'

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// No limpiar localStorage ni sessionStorage para mantener la sesión activa

// Diagnóstico de arranque en desarrollo
if (import.meta.env.DEV) {
  console.log('[App] Boot start', {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  })

  window.addEventListener('error', (event) => {
    console.error('[App] window error', event.error || event.message || event)
  })
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[App] unhandled rejection', event.reason)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

if (import.meta.env.DEV) {
  console.log('[App] Boot rendered')
}

// Ocultar loader amigable al montar React
if (window.__servifood_loader_hide) window.__servifood_loader_hide();
