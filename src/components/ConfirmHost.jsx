import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmHost = () => {
  const [confirmState, setConfirmState] = useState(null)
  const resolverRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {}
      resolverRef.current = detail.resolve
      setConfirmState({
        title: detail.title || 'Confirmación requerida',
        message: detail.message || '',
        highlight: detail.highlight || null,
        confirmText: detail.confirmText || 'Confirmar',
        cancelText: detail.cancelText || 'Cancelar',
        tone: detail.tone || 'warning'
      })
    }
    window.addEventListener('app-confirm', handler)
    return () => window.removeEventListener('app-confirm', handler)
  }, [])

  const close = (result) => {
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
    setConfirmState(null)
  }

  if (!confirmState) return null

  return (
    <div
      className="fixed inset-0 z-130 flex items-end sm:items-center justify-center p-0 sm:p-8 notice-fade"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => close(false)} />
      <div className="notice-pop relative w-full h-[92vh] sm:h-auto sm:max-w-3xl overflow-hidden rounded-none sm:rounded-3xl border border-amber-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] ring-4 ring-amber-200/60">
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/15 via-orange-500/10 to-transparent" />
        <div className="relative h-full p-6 sm:p-10 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {confirmState.tone === 'danger' ? 'Acción delicada' : 'Confirmación'}
              </p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                {confirmState.title}
              </h3>
              {confirmState.message && (
                <p className="mt-3 text-base sm:text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                  {confirmState.message}
                </p>
              )}
              {confirmState.highlight && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base sm:text-lg font-semibold text-amber-900">
                  {confirmState.highlight}
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto pt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() => close(false)}
              type="button"
            >
              {confirmState.cancelText}
            </button>
            <button
              className="rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600"
              onClick={() => close(true)}
              type="button"
            >
              {confirmState.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmHost
