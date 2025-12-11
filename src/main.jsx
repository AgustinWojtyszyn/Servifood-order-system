import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile-optimizations.css'

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// Limpiar cache local y sessionStorage al cargar la app
try {
  localStorage.clear()
  sessionStorage.clear()
} catch (e) {
  // Ignorar errores de limpieza
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
