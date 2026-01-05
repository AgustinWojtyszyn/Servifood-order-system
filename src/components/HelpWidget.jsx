import { useState } from 'react'
import useHelpCenter from '../hooks/useHelpCenter'

const HelpWidget = () => {
  const { handleUserMessage, lastResponse, SUPPORT_PHONE } = useHelpCenter()
  const [open, setOpen] = useState(false)
  const [response, setResponse] = useState(null)
  const [category, setCategory] = useState(null) // 'orders' | 'app'

  const onClose = () => {
    setOpen(false)
    // reset para otra solicitud
    setResponse(null)
    setCategory(null)
  }

  const onReset = () => {
    setResponse(null)
    setCategory(null)
  }

  const screenCtx = { screen: typeof window !== 'undefined' ? window.location.pathname : 'unknown' }

  // Opciones predefinidas
  const orderOptions = [
    {
      key: 'TIME_RESTRICTION',
      label: 'Horario de pedidos cerrado',
      run: () => setResponse(handleErrorWrap('TIME_RESTRICTION'))
    },
    {
      key: 'HOW_TO_ORDER',
      label: 'No sé cómo hacerlo',
      run: () => setResponse(handleUserMessage('cómo hacer pedido', screenCtx))
    },
    {
      key: 'VALIDATION_ERROR',
      label: 'Error de validación',
      run: () => setResponse(handleErrorWrap('VALIDATION_ERROR'))
    },
    {
      key: 'ORDER_NOT_ALLOWED',
      label: 'No me deja hacer el pedido',
      run: () => setResponse(handleErrorWrap('ORDER_NOT_ALLOWED'))
    },
    {
      key: 'CANCEL_ORDER',
      label: 'Cancelar el pedido',
      run: () => setResponse(handleUserMessage('cancelar pedido', screenCtx))
    },
  ]

  const appOptions = [
    {
      key: 'NETWORK_ERROR',
      label: 'Falla de red / Internet',
      run: () => setResponse(handleErrorWrap('NETWORK_ERROR'))
    },
    {
      key: 'SERVER_ERROR',
      label: 'Error del servidor',
      run: () => setResponse(handleErrorWrap('SERVER_ERROR'))
    },
    {
      key: 'NO_LOAD',
      label: 'La aplicación no carga',
      run: () => setResponse(handleUserMessage('no carga', screenCtx))
    },
    {
      key: 'NO_WORK',
      label: 'La aplicación no funciona',
      run: () => setResponse(handleUserMessage('no funciona', screenCtx))
    },
  ]

  // Wrapper para errores con contexto
  const { handleError } = useHelpCenter()
  const handleErrorWrap = (code) => handleError(code, screenCtx)

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full shadow-lg bg-white text-black border border-gray-300 px-4 py-3 flex items-center gap-2 hover:bg-gray-50"
        >
          <span className="font-bold text-sm">Asistencia inteligente</span>
        </button>
      ) : (
        <div className="w-[92vw] max-w-sm rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stroke dark:border-strokedark">
            <h4 className="text-sm font-semibold text-black dark:text-white">Centro de Ayuda</h4>
            <div className="flex items-center gap-2">
              <button onClick={onReset} className="text-black hover:text-gray-700 text-xs border border-gray-300 rounded-md px-2 py-1 bg-white">Reiniciar</button>
              <button onClick={onClose} className="text-black hover:text-gray-700">✕</button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {!category ? (
              <div className="space-y-2">
                <p className="text-sm text-black">¿Con qué tenés problema?</p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setCategory('orders')} className="rounded-md bg-white text-black border border-gray-300 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50">Con los pedidos</button>
                  <button onClick={() => setCategory('app')} className="rounded-md bg-white text-black border border-gray-300 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50">Con la aplicación</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-black">Seleccioná el problema:</p>
                <div className="grid grid-cols-1 gap-2">
                  {(category === 'orders' ? orderOptions : appOptions).map(opt => (
                    <button key={opt.key} onClick={opt.run} className="rounded-md bg-white text-black border border-gray-300 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 text-left">{opt.label}</button>
                  ))}
                </div>
                <div className="pt-2">
                  <button onClick={() => setCategory(null)} className="rounded-md bg-white text-black border border-gray-300 px-3 py-2 text-xs font-medium shadow-sm hover:bg-gray-50">Volver</button>
                </div>
              </div>
            )}

            {(response || lastResponse) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-strokedark dark:bg-gray-800">
                <h5 className="font-semibold text-black dark:text-white mb-1">{(response || lastResponse).title}</h5>
                <p className="text-gray-700 dark:text-gray-300 mb-2">{(response || lastResponse).message}</p>
                {Array.isArray((response || lastResponse).steps) && (
                  <ul className="list-disc pl-4 text-gray-700 dark:text-gray-300 mb-2">
                    {(response || lastResponse).steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-2">
                  {/* Si el pedido no puede realizarse (requiredPhrase presente), no dirigir al tutorial; indicar barra de navegación */}
                  {Boolean((response || lastResponse).requiredPhrase) && (
                    <div className="text-xs text-gray-700">El tutorial está disponible en la barra de navegación.</div>
                  )}
                  <div className="text-xs text-gray-700">Ayuda: {SUPPORT_PHONE}</div>
                </div>
                {Boolean((response || lastResponse).requiredPhrase) && (
                  <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20">
                    {(response || lastResponse).requiredPhrase}
                  </div>
                )}
                {/* Nota de derivación general cuando no se resuelve */}
                <div className="mt-2 text-[11px] text-gray-600">
                  Si no se puede resolver con estas indicaciones, comunicate por el grupo de tu empresa; serán atendidos a la brevedad.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HelpWidget
