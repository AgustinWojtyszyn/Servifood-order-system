import { createContext, useContext, useEffect } from 'react'

const OverlayLockContext = createContext(null)

// Permite a componentes hijos sumar/quitar bloqueos de scroll sin tocar el body directamente.
const useOverlayLock = (isLocked) => {
  const registerLock = useContext(OverlayLockContext)

  useEffect(() => {
    if (!isLocked || typeof registerLock !== 'function') return
    const unregister = registerLock()
    return () => unregister?.()
  }, [isLocked, registerLock])
}

export { OverlayLockContext, useOverlayLock }
