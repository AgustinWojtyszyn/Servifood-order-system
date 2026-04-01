const formatPercent = (value) => `${value.toFixed(1)}%`

const RankingList = ({ title, items }) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 rounded-2xl p-4 sm:p-6">
    <h4 className="text-base sm:text-lg font-bold text-slate-900">{title}</h4>
    <div className="mt-4 space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-slate-500">Sin resultados todavía.</p>
      )}
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">#{index + 1}</span>
            <span className="text-slate-800 font-semibold">{item.label}</span>
          </div>
          <div className="text-slate-500 font-semibold">
            {item.count} · {formatPercent(item.percent)}
          </div>
        </div>
      ))}
    </div>
  </div>
)

const TopRankings = ({
  menuRanking,
  sidesRanking,
  beveragesRanking,
  showMenus = true,
  showSides = true,
  showBeverages = true,
  menuTitle = 'Top platos',
  sidesTitle = 'Top guarniciones',
  beveragesTitle = 'Top bebidas'
}) => {
  return (
    <div className="grid gap-6">
      {showMenus && <RankingList title={menuTitle} items={menuRanking} />}
      {showSides && <RankingList title={sidesTitle} items={sidesRanking} />}
      {showBeverages && <RankingList title={beveragesTitle} items={beveragesRanking} />}
    </div>
  )
}

export default TopRankings
