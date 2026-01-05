import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT } from '../utils/helpConstants'
import { matchIntent, getResponseForIntent, getErrorResponse } from '../utils/helpRules'

const HelpCenterContext = createContext(null)

export const HelpCenterProvider = ({ children }) => {
  const [lastResponse, setLastResponse] = useState(null)

  // Manejo de mensajes del usuario (texto libre) con reglas por palabras clave
  const handleUserMessage = useCallback((text, screenContext) => {
    const intent = matchIntent(text)
    const resp = getResponseForIntent(intent, { screenContext, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT })
    setLastResponse(resp)
    return resp
  }, [])

  // Manejo de errores determinísticos por código
  const handleError = useCallback((errorCode, screenContext) => {
    const resp = getErrorResponse(errorCode, { screenContext, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT })
    setLastResponse(resp)
    return resp
  }, [])

  const value = useMemo(() => ({
    handleUserMessage,
    handleError,
    lastResponse,
    SUPPORT_PHONE,
    TUTORIAL_URL,
    MANUAL_ORDER_TEXT,
  }), [handleUserMessage, handleError, lastResponse])

  return (
    <HelpCenterContext.Provider value={value}>
      {children}
    </HelpCenterContext.Provider>
  )
}

export const useHelpCenterContext = () => {
  const ctx = useContext(HelpCenterContext)
  if (!ctx) throw new Error('useHelpCenterContext debe usarse dentro de HelpCenterProvider')
  return ctx
}
