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
  onClearFilters,
  isPersonExpanded,
  onTogglePersonDetails,
  onRoleChange,
  onDeleteUser
}) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 drop-shadow">👥 Gestión de Usuarios</h2>

    <AdminFilters
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      roleFilter={roleFilter}
      onRoleFilterChange={onRoleFilterChange}
      sortBy={sortBy}
      onSortChange={onSortChange}
    />

    <AdminSummary
      filteredCount={filteredUsers.length}
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
    />
  </div>
)

export default AdminUsersSection
