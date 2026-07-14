import { Link } from 'react-router-dom'
import { Building2, Clock, Edit, Plus, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react'
import servifoodLogo from '../../assets/servifood_logo_white_text_HQ.png'

const DashboardHeader = ({
  user,
  countdownLabel,
  countdownValue,
  countdownTone,
  refreshing,
  onRefresh,
  headerOrder,
  headerStatus,
  headerSummary,
  canEditOrder,
  onEditOrder,
  onDeleteOrder,
  deleteActionLabel = 'Eliminar',
  onOpenChangeCompany,
  canOpenChangeCompany,
  changeCompanyHint
}) => {
  const allowEdit = headerOrder && canEditOrder ? canEditOrder(headerOrder) : false

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-sky-200/15 bg-slate-950 px-5 pt-5 pb-7 shadow-2xl shadow-slate-950/25 sm:px-7 sm:pt-6 sm:pb-8 lg:min-h-[240px] lg:max-h-[280px]">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_30%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.13),transparent_24%),linear-gradient(135deg,#061225_0%,#0b2d66_48%,#04111f_100%)]" />
      <div className="absolute -top-24 left-8 -z-10 h-48 w-48 rounded-full bg-sky-300/16 blur-3xl" />
      <div className="absolute -top-20 right-8 -z-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute left-0 top-0 -z-10 h-full w-32 bg-[linear-gradient(115deg,rgba(255,255,255,0.10),transparent_55%)]" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-[10px] text-[clamp(18px,1.8vw,24px)] leading-none text-amber-300 drop-shadow">
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
          <h1 className="text-3xl font-black leading-tight text-white drop-shadow sm:text-4xl lg:text-5xl">Panel Principal</h1>
          <p className="mt-2 text-lg font-semibold text-sky-50 sm:text-xl">
            ¡Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </p>
          <p className="mt-1 text-sm font-medium text-sky-100/85 sm:text-base">Aquí está el resumen de tus pedidos</p>
          <div
            className={`mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold shadow-lg shadow-slate-950/15 sm:px-4 ${
              countdownTone === 'urgent'
                ? 'bg-red-500/20 border-red-200/70 text-red-50'
                : countdownTone === 'warn'
                ? 'bg-amber-500/20 border-amber-200/70 text-amber-50'
                : 'bg-white/10 border-white/25 text-white'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>Horario pedidos: 09:00 a 22:00</span>
            <span className="text-white/75">•</span>
            <span>{countdownLabel} {countdownValue}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-4 lg:items-end">
          <img
            src={servifoodLogo}
            alt="ServiFood"
            className="h-16 w-auto object-contain drop-shadow-2xl sm:h-20 lg:h-24"
          />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:justify-end">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold transition-all duration-200 ${
                refreshing
                  ? 'bg-slate-200 border-slate-200 cursor-not-allowed text-slate-500'
                  : 'bg-white text-slate-950 border-white/40 hover:bg-sky-50'
              }`}
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
            <Link to="/order" className="inline-flex items-center justify-center rounded-xl border border-sky-200/70 bg-sky-500/15 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/25 transition-colors hover:bg-sky-500/25">
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Pedido
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/20 bg-white/[0.08] p-3 backdrop-blur sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-100/70">Estado del pedido</p>
          {headerOrder ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-black text-white sm:text-xl">Pedido en curso</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-950">
                  {headerStatus}
                </span>
                <span className="text-xs font-semibold text-sky-100/90">
                  Pedido #{String(headerOrder.id).slice(-8)}
                </span>
              </div>
              <p className="text-sm font-semibold text-white/90">
                {headerSummary}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-sky-100/90" />
                <p className="text-xl font-black text-white sm:text-2xl">Sin pedido activo</p>
              </div>
              <p className="text-sm font-semibold text-white/80">
                Creá tu pedido para hoy en segundos
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenChangeCompany}
              disabled={!canOpenChangeCompany}
              title={changeCompanyHint || ''}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                canOpenChangeCompany
                  ? 'bg-sky-500 text-white border-sky-400 hover:bg-sky-600'
                  : 'bg-slate-200/25 text-slate-200 border-slate-200/30 cursor-not-allowed'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Cambiar empresa
            </button>
            {headerOrder && (
              <>
                <button
                  type="button"
                  onClick={() => headerOrder && onEditOrder && onEditOrder(headerOrder)}
                  disabled={!allowEdit}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                    allowEdit
                      ? 'bg-white text-slate-950 border-white hover:bg-sky-50'
                      : 'bg-white/40 text-white/70 border-white/30 cursor-not-allowed'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                  Editar pedido
                </button>
                <button
                  type="button"
                  onClick={() => headerOrder && onDeleteOrder && onDeleteOrder(headerOrder)}
                  disabled={!allowEdit}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                    allowEdit
                      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                      : 'bg-red-100/60 text-red-200 border-red-100/60 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteActionLabel}
                </button>
              </>
            )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-3 overflow-hidden rounded-b-3xl" aria-hidden="true">
        <div className="grid h-full grid-rows-3">
          <div className="bg-sky-400" />
          <div className="relative bg-white">
            <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.20),0_0_14px_rgba(251,191,36,0.65)]" />
          </div>
          <div className="bg-sky-400" />
        </div>
      </div>
    </section>
  )
}

export default DashboardHeader
