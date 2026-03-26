import { useEffect, useRef, useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle,
    ring: 'ring-emerald-300/60',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
    glow: 'from-emerald-500/20 via-emerald-500/10 to-transparent'
  },
  error: {
    icon: XCircle,
    ring: 'ring-rose-300/60',
    border: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-800',
    glow: 'from-rose-500/20 via-rose-500/10 to-transparent'
  },
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-300/60',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-900',
    glow: 'from-amber-500/20 via-amber-500/10 to-transparent'
  },
  info: {
    icon: Info,
    ring: 'ring-sky-300/60',
    border: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-800',
    glow: 'from-sky-500/20 via-sky-500/10 to-transparent'
  }
}

const defaultTimeoutFor = (variant) => {
  if (variant === 'error') return 6500
  if (variant === 'warning') return 5500
  return 4200
}

const NoticeHost = () => {
  const [notice, setNotice] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {}
      const next = {
        id: crypto.randomUUID(),
        title: detail.title || null,
        message: detail.message || '',
        variant: detail.variant || 'info',
        timeoutMs: detail.timeoutMs
      }
      setNotice(next)
    }

    window.addEventListener('app-notice', handler)
    return () => window.removeEventListener('app-notice', handler)
  }, [])

  useEffect(() => {
    if (!notice) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const timeout = notice.timeoutMs ?? defaultTimeoutFor(notice.variant)
    timerRef.current = setTimeout(() => setNotice(null), timeout)
    return () => clearTimeout(timerRef.current)
  }, [notice])

  if (!notice) return null

  const variant = VARIANT_STYLES[notice.variant] || VARIANT_STYLES.info
  const Icon = variant.icon

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-8 notice-fade"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setNotice(null)} />
      <div
        className={`notice-pop relative w-full h-[92vh] sm:h-auto sm:max-w-3xl overflow-hidden rounded-none sm:rounded-3xl border ${variant.border} bg-white shadow-[0_30px_80px_rgba(0,0,0,0.32)] ring-4 ${variant.ring}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${variant.glow}`} />
        <div className="relative h-full p-6 sm:p-10 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className={`mt-0.5 rounded-2xl p-3 ${variant.badge}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                {notice.title || 'Aviso'}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                {notice.message}
              </p>
            </div>
          </div>
          <div className="mt-auto pt-8 flex justify-end">
            <button
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() => setNotice(null)}
              type="button"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoticeHost
