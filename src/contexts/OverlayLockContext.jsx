import { OverlayLockContext } from './overlayLockContext'

export const OverlayLockProvider = ({ registerLock, children }) => {
  return (
    <OverlayLockContext.Provider value={registerLock}>
      {children}
    </OverlayLockContext.Provider>
  )
}
