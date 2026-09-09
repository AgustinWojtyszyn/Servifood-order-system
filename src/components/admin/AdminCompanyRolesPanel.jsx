import { Building2, ShieldCheck, UserPlus, X } from 'lucide-react'

const AdminCompanyRolesPanel = ({
  companies = [],
  adminEmailDrafts = {},
  savingCompanySlug = null,
  onAdminEmailChange,
  onAssignCompanyAdmin,
  onRemoveCompanyAdmin
}) => {
  const activeCompanies = (Array.isArray(companies) ? companies : [])
    .filter((company) => company?.slug && company.slug !== 'global' && company.active !== false)

  return (
    <section className="mb-6 rounded-xl border-2 border-violet-200 bg-violet-50/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-700" />
            <h3 className="text-lg font-extrabold text-slate-950">Rol · Admin de empresa</h3>
          </div>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            Asigná usuarios a una o varias empresas. Pueden administrar la operación y ver el consumo únicamente de las empresas asignadas, sin convertirse en administradores globales.
          </p>
        </div>
        <span className="rounded-full bg-violet-700 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white">
          Acceso limitado por empresa
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {activeCompanies.map((company) => {
          const admins = Array.isArray(company.admins) ? company.admins : []
          const saving = savingCompanySlug === company.slug

          return (
            <article key={company.slug} className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-violet-700" />
                    <h4 className="truncate font-extrabold text-slate-950">{company.name || company.slug}</h4>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{admins.length} {admins.length === 1 ? 'admin asignado' : 'admins asignados'}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {admins.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">Sin admins de empresa.</p>
                ) : admins.map((admin) => (
                  <div key={`${company.slug}-${admin.user_id}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{admin.full_name || admin.email || 'Usuario'}</p>
                      <p className="truncate text-xs font-medium text-slate-600">{admin.email || 'Sin email'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCompanyAdmin?.({ companySlug: company.slug, userId: admin.user_id, email: admin.email })}
                      disabled={saving}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      title="Quitar rol Admin de empresa"
                      aria-label={`Quitar admin de ${company.name || company.slug}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={adminEmailDrafts[company.slug] || ''}
                  onChange={(event) => onAdminEmailChange?.(company.slug, event.target.value)}
                  placeholder="email@empresa.com"
                  className="min-h-11 flex-1 rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
                <button
                  type="button"
                  onClick={() => onAssignCompanyAdmin?.(company.slug)}
                  disabled={saving || !(adminEmailDrafts[company.slug] || '').trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Asignar rol
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {activeCompanies.length === 0 && (
        <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-600">No hay empresas activas disponibles para asignar.</p>
      )}
    </section>
  )
}

export default AdminCompanyRolesPanel
