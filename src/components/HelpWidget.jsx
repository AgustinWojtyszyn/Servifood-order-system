import { useState } from 'react'
import useHelpCenter from '../hooks/useHelpCenter'

const HelpWidget = () => {
  const { handleUserMessage, lastResponse, SUPPORT_PHONE, TUTORIAL_URL } = useHelpCenter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [response, setResponse] = useState(null)

  const onSend = () => {
    const resp = handleUserMessage(text, { screen: window?.location?.pathname })
    setResponse(resp)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 flex items-center gap-2">
          <span className="font-bold text-sm">¿Necesitas ayuda?</span>
        </button>
      ) : (
        <div className="w-[92vw] max-w-sm rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stroke dark:border-strokedark">
            <h4 className="text-sm font-semibold text-black dark:text-white">Centro de Ayuda</h4>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-4 space-y-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describí tu problema o consulta..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button onClick={onSend} className="w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">Enviar</button>

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
                  <a href={(response || lastResponse).tutorialUrl || TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Ver tutorial</a>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Ayuda: {SUPPORT_PHONE}</div>
                </div>
                {Boolean((response || lastResponse).requiredPhrase) && (
                  <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20">
                    {(response || lastResponse).requiredPhrase}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HelpWidget
