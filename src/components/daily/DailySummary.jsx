import { MapPin } from 'lucide-react'
import orderImg from '../../assets/order.png'

const DailySummary = ({
  mode,
  stats,
  printStats,
  tomorrowLabel,
  operationalSummary,
  sortedOrdersLength,
  selectedLocation,
  locationCards
}) => {
  if (mode === 'print') {
    return (
      <div className="print-only mb-4">
        <h2 className="text-lg font-black mb-1">📋 Resumen estadístico para PDF</h2>
        <p className="text-[12px] text-gray-700 mb-2">Entrega: {tomorrowLabel}</p>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Pedidos por empresa</h3>
        <table className="print-table text-[11px] mb-2 print-block">
          <tbody>
            {Object.entries(stats.byLocation).map(([loc, count]) => (
              <tr key={loc}>
                <td>{loc || 'Sin ubicación'}</td>
                <td className="text-right">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Resumen por turno</h3>
        <table className="print-table text-[11px] mb-2 print-block">
          <thead>
            <tr>
              <th>Turno</th>
              <th>Pedidos</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Almuerzo</td>
              <td className="text-right">{printStats.turnCounts.lunch.orders}</td>
              <td className="text-right">{printStats.turnCounts.lunch.items}</td>
            </tr>
            <tr>
              <td>Cena</td>
              <td className="text-right">{printStats.turnCounts.dinner.orders}</td>
              <td className="text-right">{printStats.turnCounts.dinner.items}</td>
            </tr>
            <tr>
              <td><strong>Total</strong></td>
              <td className="text-right"><strong>{printStats.turnCounts.lunch.orders + printStats.turnCounts.dinner.orders}</strong></td>
              <td className="text-right"><strong>{printStats.turnCounts.lunch.items + printStats.turnCounts.dinner.items}</strong></td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Empresas por turno</h3>
        <table className="print-table text-[11px] mb-2 print-block">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Almuerzo</th>
              <th>Cena</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(printStats.byLocationTurn).length === 0 ? (
              <tr><td colSpan={4}>Sin pedidos</td></tr>
            ) : (
              Object.entries(printStats.byLocationTurn).map(([loc, turns]) => (
                <tr key={loc}>
                  <td>{loc}</td>
                  <td className="text-right">{turns.lunch}</td>
                  <td className="text-right">{turns.dinner}</td>
                  <td className="text-right">{turns.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Menús (platillos)</h3>
        <table className="print-table text-[11px] mb-2 print-block">
          <tbody>
            {Object.entries(stats.byDish).map(([dish, count]) => (
              <tr key={dish}>
                <td>{dish || 'Sin nombre'}</td>
                <td className="text-right">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Opciones adicionales</h3>
        <table className="print-table text-[11px] mb-2 print-block">
          <tbody>
            {Object.keys(printStats.optionCounts).length === 0 ? (
              <tr><td colSpan={2}>Sin opciones</td></tr>
            ) : (
              Object.entries(printStats.optionCounts).map(([opt, count]) => (
                <tr key={opt}>
                  <td>{opt}</td>
                  <td className="text-right">{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h3 className="text-sm font-bold text-gray-900 mb-1">Guarniciones</h3>
        <table className="print-table text-[11px] print-block">
          <tbody>
            {Object.keys(printStats.sideCounts).length === 0 ? (
              <tr><td colSpan={2}>Sin guarniciones</td></tr>
            ) : (
              Object.entries(printStats.sideCounts).map(([side, count]) => (
                <tr key={side}>
                  <td>{side}</td>
                  <td className="text-right">{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3 print-hide">
        {[
          { title: 'Resumen de platillos', items: operationalSummary.dishes, empty: 'Sin platillos' },
          { title: 'Resumen de guarniciones', items: operationalSummary.sides, empty: 'Sin guarniciones' },
          { title: 'Resumen de bebidas', items: operationalSummary.beverages, empty: 'Sin bebidas' }
        ].map(section => {
          const maxItems = 6
          const visibleItems = section.items.slice(0, maxItems)
          const remaining = Math.max(section.items.length - visibleItems.length, 0)
          const totalCount = section.items.reduce((sum, [, count]) => sum + Number(count || 0), 0)

          return (
            <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                  <p className="text-xs text-slate-500">Total: {totalCount}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {sortedOrdersLength} pedidos
                </span>
              </div>

              {visibleItems.length === 0 ? (
                <p className="text-sm text-slate-500">{section.empty}</p>
              ) : (
                <div className="space-y-2">
                  {visibleItems.map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-slate-100/70 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-800">{label}</span>
                      <span className="text-sm font-bold text-slate-700">{count}</span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <p className="text-xs font-semibold text-slate-500">+{remaining} más</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedLocation === 'all' && stats.pending > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 print-hide">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <img src={orderImg} alt="" className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100">Resumen por ubicación</h3>
                <p className="text-xs font-semibold text-slate-300">Solo ubicaciones con pedidos del día</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {locationCards.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No hay pedidos para mostrar.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {locationCards.map((card) => {
                  const topDishesText = card.topDishes.length
                    ? card.topDishes.map(([name, count]) => `${name} (${count})`).join(' · ')
                    : 'Sin detalle de platillos'
                  const topSidesText = card.topSides.length
                    ? card.topSides.map(([name, count]) => `${name} (${count})`).join(' · ')
                    : 'Sin guarniciones'

                  return (
                    <div
                      key={card.location}
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación</p>
                          <h4 className="text-lg font-bold text-slate-900">{card.location}</h4>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-800">
                          {card.total}
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-semibold text-slate-600">Top platillos</div>
                      <p className="text-xs text-slate-700">{topDishesText}</p>
                      <div className="mt-2 text-xs font-semibold text-slate-600">Guarniciones</div>
                      <p className="text-xs text-slate-700">{topSidesText}</p>
                      <div className="absolute -right-6 -bottom-6 opacity-5">
                        <MapPin className="h-20 w-20 text-primary-600" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default DailySummary
