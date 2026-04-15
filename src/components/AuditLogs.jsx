import { useMemo, useState } from 'react'
import { formatDate, getTimeAgo, truncate } from '../utils'
import { withAdmin } from '../contexts/AuthContext'
import {
  buildAuditExportRows,
  buildDailyAuditSummary,
  exportAuditXlsx,
  filterAuditLogs,
  groupDuplicateAuditLogs,
  prepareAuditLogs
} from '../utils/auditLogUtils'
import AuditLogsTabs from './audit/AuditLogsTabs'
import AuditLogsReport from './audit/AuditLogsReport'
import AuditLogsHealthTab from './audit/AuditLogsHealthTab'
import { useAuditLogsData } from '../hooks/auditLogs/useAuditLogsData'
import { useAuditLogFilters } from '../hooks/auditLogs/useAuditLogFilters'
import { useHealthProbeFilters } from '../hooks/auditLogs/useHealthProbeFilters'
import { ENABLE_DUPLICATE_GROUPING, DUPLICATE_WINDOW_SECONDS } from '../utils/auditLogs/auditLogConstants'
import { friendlyAction, formatTimestamp } from '../utils/auditLogs/auditLogFormatters'

const AuditLogs = () => {
  const [activeTab, setActiveTab] = useState('logs')

  const {
    logs,
    loading,
    error,
    loadLogs,
    health,
    healthLoading,
    healthError,
    loadHealth,
    ordersCount,
    ordersError,
    loadOrdersCount,
    healthLogs,
    healthLogsLoading,
    healthLogsError,
    loadHealthProbes
  } = useAuditLogsData()

  const {
    search,
    setSearch,
    activeFilters,
    actorFilter,
    setActorFilter,
    actionFilter,
    setActionFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    toggleFilter,
    clearLogFilters
  } = useAuditLogFilters()

  const {
    healthRange,
    setHealthRange,
    healthOnlyErrors,
    setHealthOnlyErrors,
    filteredHealthLogs
  } = useHealthProbeFilters({ healthLogs })

  const preparedLogs = useMemo(() => prepareAuditLogs(logs), [logs])

  const actorOptions = useMemo(() => {
    const set = new Set(preparedLogs.map((log) => log.actor).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [preparedLogs])

  const actionOptions = useMemo(() => {
    const set = new Set(preparedLogs.map((log) => log.action).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [preparedLogs])

  const filteredLogs = useMemo(() => {
    const selectedActions = activeFilters
      .flatMap((key) => key.split(','))
      .filter(Boolean)

    return filterAuditLogs(preparedLogs, {
      search,
      actions: selectedActions,
      actor: actorFilter,
      action: actionFilter,
      dateFrom,
      dateTo
    })
  }, [preparedLogs, activeFilters, search, actorFilter, actionFilter, dateFrom, dateTo])

  const visibleLogs = useMemo(
    () => groupDuplicateAuditLogs(filteredLogs, { enabled: ENABLE_DUPLICATE_GROUPING, windowSeconds: DUPLICATE_WINDOW_SECONDS }),
    [filteredLogs]
  )

  const dailySummary = useMemo(() => buildDailyAuditSummary(preparedLogs), [preparedLogs])

  const exportRows = useMemo(
    () => buildAuditExportRows(visibleLogs, friendlyAction),
    [visibleLogs]
  )

  const missingTable = error && /audit_logs/i.test(error)
  const handleExportXlsx = async () => {
    if (!exportRows.length) return
    const stamp = new Date().toISOString().slice(0, 10)
    await exportAuditXlsx(exportRows, `auditoria-filtrada-${stamp}.xlsx`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Nav interno */}
      <AuditLogsTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {activeTab === 'logs' && (
        <AuditLogsReport
          loading={loading}
          error={error}
          missingTable={missingTable}
          visibleLogs={visibleLogs}
          dailySummary={dailySummary}
          exportRowsLength={exportRows.length}
          onExportXlsx={handleExportXlsx}
          onReload={loadLogs}
          truncate={truncate}
          formatDate={formatDate}
          getTimeAgo={getTimeAgo}
          search={search}
          setSearch={setSearch}
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          clearLogFilters={clearLogFilters}
          actorFilter={actorFilter}
          setActorFilter={setActorFilter}
          actionFilter={actionFilter}
          setActionFilter={setActionFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          actorOptions={actorOptions}
          actionOptions={actionOptions}
          friendlyAction={friendlyAction}
          formatTimestamp={formatTimestamp}
        />
      )}

      {activeTab === 'health' && (
        <AuditLogsHealthTab
          loadHealth={loadHealth}
          loadOrdersCount={loadOrdersCount}
          loadHealthProbes={loadHealthProbes}
          healthLoading={healthLoading}
          healthError={healthError}
          health={health}
          ordersCount={ordersCount}
          ordersError={ordersError}
          healthRange={healthRange}
          setHealthRange={setHealthRange}
          healthOnlyErrors={healthOnlyErrors}
          setHealthOnlyErrors={setHealthOnlyErrors}
          healthLogs={healthLogs}
          healthLogsLoading={healthLogsLoading}
          healthLogsError={healthLogsError}
          filteredHealthLogs={filteredHealthLogs}
          truncate={truncate}
          formatTimestamp={formatTimestamp}
        />
      )}
    </div>
  )
}

const AuditLogsPage = withAdmin(AuditLogs)
export default AuditLogsPage
