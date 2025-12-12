import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile-optimizations.css'

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// No limpiar localStorage ni sessionStorage para mantener la sesión activa

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
