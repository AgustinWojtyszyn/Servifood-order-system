const AdminSummary = ({ filteredCount, totalCount }) => (
  <div className="mb-4 text-sm text-gray-600">
    Mostrando <span className="font-bold text-gray-900">{filteredCount}</span> de <span className="font-bold text-gray-900">{totalCount}</span> personas
  </div>
)

export default AdminSummary
