const SummaryCard = ({ label, value, accent, sublabel }) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 rounded-2xl p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</p>
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${accent}`}>
        {sublabel}
      </span>
    </div>
    <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
      {value}
    </p>
  </div>
)

const TrendsSummaryCards = ({
  totalOrders,
  companyLabel,
  topMenu,
  topBife,
  topSide,
  topBeverage
}) => {
  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <SummaryCard label="Pedidos Analizados" value={totalOrders} accent="bg-blue-100 text-blue-700" sublabel="Total" />
      <SummaryCard label="Empresa" value={companyLabel} accent="bg-slate-100 text-slate-700" sublabel="Filtro" />
      <SummaryCard label="Plato Más Pedido" value={topMenu} accent="bg-emerald-100 text-emerald-700" sublabel="Top" />
      <SummaryCard label="Bife Más Pedido" value={topBife} accent="bg-orange-100 text-orange-700" sublabel="Top" />
      <SummaryCard label="Guarnición Top" value={topSide} accent="bg-amber-100 text-amber-700" sublabel="Top" />
      <SummaryCard label="Bebida Top" value={topBeverage} accent="bg-sky-100 text-sky-700" sublabel="Top" />
    </div>
  )
}

export default TrendsSummaryCards
