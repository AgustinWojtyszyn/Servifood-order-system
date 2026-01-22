import { createContext, useContext, useEffect } from 'react'

const OverlayLockContext = createContext(null)

export const OverlayLockProvider = ({ registerLock, children }) => {
  return (
    <OverlayLockContext.Provider value={registerLock}>
      {children}
    </OverlayLockContext.Provider>
  )
}

// Permite a componentes hijos sumar/quitar bloqueos de scroll sin tocar el body directamente.
export const useOverlayLock = (isLocked) => {
  const registerLock = useContext(OverlayLockContext)

  useEffect(() => {
    if (!isLocked || typeof registerLock !== 'function') return
    const unregister = registerLock()
    return () => unregister?.()
  }, [isLocked, registerLock])
}
