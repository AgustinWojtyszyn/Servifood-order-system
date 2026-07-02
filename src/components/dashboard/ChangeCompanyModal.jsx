import { AlertTriangle, Building2 } from 'lucide-react'
import { getVisibleCompanyList } from '../../constants/companyConfig'

const ChangeCompanyModal = ({
  open,
  step,
  currentCompanySlug,
  selectedCompanySlug,
  remainingChanges,
  loading,
  onClose,
  onSelect,
  onContinue,
  onBack,
  onConfirm,
  isAdmin = false
}) => {
  if (!open) return null

  const companies = getVisibleCompanyList({ includeAdminOnly: isAdmin })
  const currentCompany = companies.find(c => c.slug === currentCompanySlug)
  const selectedCompany = companies.find(c => c.slug === selectedCompanySlug)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-blue-200/30 bg-slate-900 text-white shadow-2xl">
        {step === 1 ? (
          <>
            <div className="border-b border-white/10 p-5">
              <h3 className="text-xl font-bold">Cambiar empresa</h3>
              <p className="mt-1 text-sm text-blue-100">Seleccioná la empresa/sede donde vas a pedir hoy.</p>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-blue-100">Empresa/sede</label>
              <select
                value={selectedCompanySlug || ''}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full rounded-xl border border-blue-300/40 bg-slate-800 px-3 py-2 text-white outline-none"
              >
                <option value="" disabled>Elegí una empresa</option>
                {companies.map((company) => (
                  <option key={company.slug} value={company.slug}>{company.name}</option>
                ))}
              </select>

              <p className="text-sm text-blue-100">Te quedan {remainingChanges} cambios disponibles hoy.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <button onClick={onClose} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button onClick={onContinue} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Continuar</button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-white/10 p-5">
              <h3 className="text-xl font-bold">Confirmar cambio</h3>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-blue-100">
                Vas a cambiar de <span className="font-bold">{currentCompany?.name || 'Sin empresa'}</span> a <span className="font-bold">{selectedCompany?.name || 'Sin empresa'}</span>. Este cambio se aplicará a tus pedidos del día, pedidos diarios y exportaciones Excel.
              </p>
              <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                  <p className="text-sm text-amber-100">Este cambio aplicará a tus pedidos del día, pedidos diarios y exportaciones Excel. Solo podés cambiar de empresa 2 veces por día.</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/80 p-3 text-sm text-blue-100">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Empresa actual: <span className="font-semibold text-white">{currentCompany?.name || 'Sin empresa'}</span></div>
                <div className="mt-1">Nueva empresa: <span className="font-semibold text-white">{selectedCompany?.name || 'Sin empresa'}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <button onClick={onBack} disabled={loading} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold">Volver</button>
              <button onClick={onConfirm} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {loading ? 'Confirmando...' : 'Confirmar cambio'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ChangeCompanyModal
