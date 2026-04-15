export default function AuditLogsTabs({ activeTab, onChangeTab }) {
  return (
    <div className="flex items-center gap-2">
      {[
        { id: 'logs', label: 'Auditoría' },
        { id: 'health', label: 'Salud del sistema' }
      ].map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              active
                ? 'bg-white text-blue-700 border-blue-600 shadow-md'
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

