import { createContext, useContext } from 'react'

const HelpCenterContext = createContext(null)

const useHelpCenterContext = () => {
  const ctx = useContext(HelpCenterContext)
  if (!ctx) throw new Error('useHelpCenterContext debe usarse dentro de HelpCenterProvider')
  return ctx
}

export { HelpCenterContext, useHelpCenterContext }
