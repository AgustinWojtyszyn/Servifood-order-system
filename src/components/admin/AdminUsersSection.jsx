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
    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 drop-shadow">👥 Gestión de Usuarios</h2>

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
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-secondary disabled:opacity-60"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-secondary disabled:opacity-60"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
)

export default AdminUsersSection
