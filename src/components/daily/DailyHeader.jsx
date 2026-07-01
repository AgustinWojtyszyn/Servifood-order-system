import dinnerImg from '../../assets/dinner.png'
import DailyExportActions from './DailyExportActions'

const DailyHeader = ({
  stats,
  activeLocationsCount,
  tomorrowLabel,
  exportCompany,
  onExportCompanyChange,
  locations,
  exportableOrdersCount,
  onExportExcel,
  onShareWhatsApp,
  refreshing,
  onRefresh,
  onExportPdf,
  onArchiveAll,
  sortedOrdersLength,
  pendingOrdersCount,
  isAdmin
}) => (
  <div className="mb-4 rounded-2xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 shadow-lg shadow-slate-200/60 print-hide">
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={dinnerImg} alt="" className="h-10 w-10" aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-black text-slate-900">Pedidos diarios</h1>
              <p className="text-sm font-semibold text-slate-600">
                Entrega: {tomorrowLabel}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total del día', value: stats.total },
              { label: 'Pendientes', value: stats.pending },
              { label: 'Archivados', value: stats.archived },
              { label: 'Ubicaciones activas', value: activeLocationsCount }
            ].map(metric => (
              <div
                key={metric.label}
                className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <p className="text-2xl font-black text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <DailyExportActions
          exportCompany={exportCompany}
          onExportCompanyChange={onExportCompanyChange}
          locations={locations}
          exportableOrdersCount={exportableOrdersCount}
          onExportExcel={onExportExcel}
          onShareWhatsApp={onShareWhatsApp}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onExportPdf={onExportPdf}
          onArchiveAll={onArchiveAll}
          sortedOrdersLength={sortedOrdersLength}
          pendingOrdersCount={pendingOrdersCount}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  </div>
)

export default DailyHeader
