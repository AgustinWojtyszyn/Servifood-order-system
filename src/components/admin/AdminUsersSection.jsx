import AdminFilters from './AdminFilters'
import AdminSummary from './AdminSummary'
import AdminTable from './AdminTable'

const AdminUsersSection = ({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortChange,
  filteredUsers,
  usersCount,
  usersLoading,
  usersError,
  filteredTotalCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onClearFilters,
  isPersonExpanded,
  onTogglePersonDetails,
  onRoleChange,
  onDeleteUser,
  roleUpdatingById,
  deletingById
}) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 drop-shadow">👥 Gestión de Usuarios</h2>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        Bajar al final
      </button>
    </div>

    {usersError && (
      <div className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        {usersError}
      </div>
    )}

    <AdminFilters
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      roleFilter={roleFilter}
      onRoleFilterChange={onRoleFilterChange}
      sortBy={sortBy}
      onSortChange={onSortChange}
    />

    <AdminSummary
      filteredCount={filteredTotalCount ?? filteredUsers.length}
      totalCount={usersCount}
    />

    <AdminTable
      filteredUsers={filteredUsers}
      searchTerm={searchTerm}
      roleFilter={roleFilter}
      onClearFilters={onClearFilters}
      isPersonExpanded={isPersonExpanded}
      onTogglePersonDetails={onTogglePersonDetails}
      onRoleChange={onRoleChange}
      onDeleteUser={onDeleteUser}
      usersLoading={usersLoading}
      usersError={usersError}
      roleUpdatingById={roleUpdatingById}
      deletingById={deletingById}
    />

    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Página {page} de {totalPages} · {pageSize} por página
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onPageChange(Math.max(1, page - 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          disabled={page <= 1}
          className="btn-secondary disabled:opacity-60"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => {
            onPageChange(Math.min(totalPages, page + 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          disabled={page >= totalPages}
          className="btn-secondary disabled:opacity-60"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-secondary"
        >
          Volver arriba
        </button>
      </div>
    </div>
  </div>
)

export default AdminUsersSection
