const formatPercent = (value) => `${value.toFixed(1)}%`

const BarRow = ({ label, count, percent, max, accent }) => {
  const width = max ? `${(count / max) * 100}%` : '0%'
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-slate-500">{count} · {formatPercent(percent)}</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-linear-to-r ${accent}`} style={{ width }} />
      </div>
    </div>
  )
}

const ChartCard = ({ title, subtitle, items, accent }) => {
  const max = items.reduce((acc, item) => Math.max(acc, item.count || 0), 0)
  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Ranking</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-slate-500">No hay datos para este filtro.</div>
        )}
        {items.map((item, index) => (
          <BarRow
            key={`${item.label}-${index}`}
            label={item.label}
            count={item.count}
            percent={item.percent}
            max={max}
            accent={accent}
          />
        ))}
      </div>
    </div>
  )
}

const TrendsCharts = ({ menuRanking, sidesRanking, beveragesRanking }) => {
  return (
    <div className="grid gap-6">
      <ChartCard
        title="Platos más pedidos"
        subtitle="Menú principal y opciones 1 a 6"
        items={menuRanking}
        accent="from-blue-500 to-blue-400"
      />
      <ChartCard
        title="Guarniciones más pedidas"
        subtitle="Cantidad y porcentaje sobre el total"
        items={sidesRanking}
        accent="from-emerald-500 to-emerald-400"
      />
      <ChartCard
        title="Bebidas más pedidas"
        subtitle="Respuestas con bebidas detectadas"
        items={beveragesRanking}
        accent="from-amber-500 to-amber-400"
      />
    </div>
  )
}

export default TrendsCharts

