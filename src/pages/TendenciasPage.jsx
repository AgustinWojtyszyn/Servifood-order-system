import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import ExcelJS from 'exceljs'
import { COMPANY_LIST } from '../constants/companyConfig'
import excelLogo from '../assets/logoexcel.png'
import { useTrendsData } from '../hooks/analytics/useTrendsData'
import TrendsFilters from '../components/analytics/TrendsFilters'
import TrendsSummaryCards from '../components/analytics/TrendsSummaryCards'
import TrendsCharts from '../components/analytics/TrendsCharts'

const getDefaultRange = () => {
  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - 1)
  const format = (d) => d.toISOString().slice(0, 10)
  return { start: format(start), end: format(now) }
}

const TendenciasPage = () => {
  const [chartType, setChartType] = useState(() => {
    if (typeof window === 'undefined') return 'bar'
    return window.localStorage.getItem('trends_chart_type') || 'bar'
  })
  const companyOptions = useMemo(() => (
    COMPANY_LIST.map((company) => ({
      label: company.name,
      value: (company.locations && company.locations[0]) ? company.locations[0] : company.name
    }))
  ), [])

  const [filtersDraft, setFiltersDraft] = useState({
    company: 'all',
    range: getDefaultRange(),
    analysisType: 'all'
  })
  const [filtersApplied, setFiltersApplied] = useState(filtersDraft)

  const {
    loading,
    error,
    totalOrders,
    menuRanking,
    optionRanking,
    mainMenuRanking,
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
      range: { start: '', end: '' },
      analysisType: 'all'
    }
    setFiltersDraft(cleared)
    setFiltersApplied(cleared)
  }

  const handleChartTypeChange = (value) => {
    setChartType(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('trends_chart_type', value)
    }
  }

  const handleExport = async () => {
    const wb = new ExcelJS.Workbook()
    const summary = wb.addWorksheet('Resumen')
    summary.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 50 }
    ]
    summary.addRows([
      { metric: 'Empresa', value: companyLabel },
      { metric: 'Rango', value: filtersApplied.range.start || filtersApplied.range.end ? `${filtersApplied.range.start || 'inicio'} a ${filtersApplied.range.end || 'fin'}` : 'Sin rango' },
      { metric: 'Pedidos analizados', value: totalOrders },
      { metric: 'Plato más pedido', value: topMenu },
      { metric: 'Bife más pedido', value: topBife },
      { metric: 'Guarnición top', value: topSide },
      { metric: 'Bebida top', value: topBeverage }
    ])

    const addRankingSheet = (title, items) => {
      const ws = wb.addWorksheet(title)
      ws.columns = [
        { header: 'Posición', key: 'pos', width: 10 },
        { header: 'Nombre', key: 'label', width: 50 },
        { header: 'Cantidad', key: 'count', width: 14 },
        { header: 'Porcentaje', key: 'percent', width: 14 }
      ]
      items.forEach((item, index) => {
        ws.addRow({
          pos: index + 1,
          label: item.label,
          count: item.count,
          percent: `${item.percent.toFixed(1)}%`
        })
      })
    }

    const type = filtersApplied.analysisType
    if (type === 'all' || type === 'menus') addRankingSheet('Menus', mainMenuRanking.items)
    if (type === 'all' || type === 'options') addRankingSheet('Opciones', optionRanking.items)
    if (type === 'all' || type === 'sides') addRankingSheet('Guarniciones', sidesRanking.items)
    if (type === 'all' || type === 'beverages') addRankingSheet('Bebidas', beveragesRanking.items)

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = `tendencias-${filtersApplied.range.start || 'inicio'}-a-${filtersApplied.range.end || 'fin'}.xlsx`
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1200)
  }

  const analysisType = filtersApplied.analysisType
  const showMenus = analysisType === 'all' || analysisType === 'menus'
  const showOptions = analysisType === 'all' || analysisType === 'options'
  const showSides = analysisType === 'all' || analysisType === 'sides'
  const showBeverages = analysisType === 'all' || analysisType === 'beverages'

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
          analysisType={filtersDraft.analysisType}
          onAnalysisTypeChange={(value) => setFiltersDraft(prev => ({ ...prev, analysisType: value }))}
          chartType={chartType}
          onChartTypeChange={handleChartTypeChange}
          onApply={handleApply}
          onClear={handleClear}
          onExport={handleExport}
          isDirty={isDirty}
          isLoading={loading}
          isRangeValid={isRangeValid}
          excelLogo={excelLogo}
          exportCount={loading ? 0 : totalOrders}
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

        <section className="grid gap-6">
          <TrendsCharts
            menuRanking={showMenus ? menuRanking.items.slice(0, 8) : []}
            sidesRanking={showSides ? sidesRanking.items.slice(0, 8) : []}
            beveragesRanking={showBeverages ? beveragesRanking.items.slice(0, 8) : []}
            showMenus={showMenus}
            showSides={showSides}
            showBeverages={showBeverages}
            menuTitle="Menús + Opciones más pedidos"
            menuSubtitle="Comparativo entre menú principal y opciones"
            chartType={chartType}
          />
        </section>

        {analysisType === 'options' && (
          <div className="grid gap-6">
            <TrendsCharts
              menuRanking={optionRanking.items.slice(0, 8)}
              sidesRanking={[]}
              beveragesRanking={[]}
              showMenus
              showSides={false}
              showBeverages={false}
              menuTitle="Opciones más pedidas"
              menuSubtitle="Ranking de opciones 1 a 6"
              chartType={chartType}
            />
          </div>
        )}

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
