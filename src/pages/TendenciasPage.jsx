import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { COMPANY_LIST } from '../constants/companyConfig'
import { useTrendsData } from '../hooks/analytics/useTrendsData'
import TrendsFilters from '../components/analytics/TrendsFilters'
import TrendsSummaryCards from '../components/analytics/TrendsSummaryCards'
import TrendsCharts from '../components/analytics/TrendsCharts'
import TopRankings from '../components/analytics/TopRankings'

const getDefaultRange = () => {
  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - 1)
  const format = (d) => d.toISOString().slice(0, 10)
  return { start: format(start), end: format(now) }
}

const TendenciasPage = () => {
  const companyOptions = useMemo(() => (
    COMPANY_LIST.map((company) => ({
      label: company.name,
      value: (company.locations && company.locations[0]) ? company.locations[0] : company.name
    }))
  ), [])

  const [filtersDraft, setFiltersDraft] = useState({
    company: 'all',
    range: getDefaultRange()
  })
  const [filtersApplied, setFiltersApplied] = useState(filtersDraft)

  const {
    loading,
    error,
    totalOrders,
    menuRanking,
    sidesRanking,
    beveragesRanking,
    topMenu,
    topBife,
    topSide,
    topBeverage
  } = useTrendsData({ company: filtersApplied.company, dateRange: filtersApplied.range })

  const companyLabel = filtersApplied.company === 'all'
    ? 'Todas'
    : (companyOptions.find((opt) => opt.value === filtersApplied.company)?.label || filtersApplied.company)

  const isDirty = JSON.stringify(filtersDraft) !== JSON.stringify(filtersApplied)
  const isRangeValid = !filtersDraft.range.start
    || !filtersDraft.range.end
    || filtersDraft.range.start <= filtersDraft.range.end

  const handleApply = () => {
    if (!isRangeValid) return
    setFiltersApplied(filtersDraft)
  }

  const handleClear = () => {
    const cleared = {
      company: 'all',
      range: { start: '', end: '' }
    }
    setFiltersDraft(cleared)
    setFiltersApplied(cleared)
  }

  return (
    <div className="monthly-page min-h-screen bg-[#f6f7f9] py-6">
      <div className="monthly-container w-full max-w-[1180px] mx-auto space-y-4 px-3 sm:px-4 md:px-6 pb-20 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-5 text-white shadow-xl mt-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 md:h-10 md:w-10" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Tendencias</h1>
              <p className="text-blue-200 text-base md:text-lg">
                Panel analítico de pedidos con datos históricos reales.
              </p>
            </div>
          </div>
        </div>

        <TrendsFilters
          companies={companyOptions}
          company={filtersDraft.company}
          onCompanyChange={(value) => setFiltersDraft(prev => ({ ...prev, company: value }))}
          dateFrom={filtersDraft.range.start}
          dateTo={filtersDraft.range.end}
          onDateFromChange={(value) => setFiltersDraft(prev => ({ ...prev, range: { ...prev.range, start: value } }))}
          onDateToChange={(value) => setFiltersDraft(prev => ({ ...prev, range: { ...prev.range, end: value } }))}
          onApply={handleApply}
          onClear={handleClear}
          isDirty={isDirty}
          isLoading={loading}
          isRangeValid={isRangeValid}
        />

        <TrendsSummaryCards
          totalOrders={loading ? '—' : totalOrders}
          companyLabel={companyLabel}
          topMenu={loading ? '—' : topMenu}
          topBife={loading ? '—' : topBife}
          topSide={loading ? '—' : topSide}
          topBeverage={loading ? '—' : topBeverage}
        />

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm font-semibold">
            Ocurrió un error al cargar las tendencias. Intenta nuevamente.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <TrendsCharts
            menuRanking={menuRanking.items.slice(0, 8)}
            sidesRanking={sidesRanking.items.slice(0, 8)}
            beveragesRanking={beveragesRanking.items.slice(0, 8)}
          />
          <TopRankings
            menuRanking={menuRanking.items.slice(0, 6)}
            sidesRanking={sidesRanking.items.slice(0, 6)}
            beveragesRanking={beveragesRanking.items.slice(0, 6)}
          />
        </section>

        {!loading && totalOrders === 0 && (
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-5 text-sm text-slate-600 font-semibold">
            No hay pedidos para los filtros seleccionados. Probá con otra empresa o ampliá el rango de fechas.
          </div>
        )}
      </div>
    </div>
  )
}

export default TendenciasPage
