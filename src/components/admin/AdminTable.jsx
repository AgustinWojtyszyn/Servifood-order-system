import { Users, X } from 'lucide-react'
import AdminRow from './AdminRow'

const AdminTable = ({
  filteredUsers,
  searchTerm,
  roleFilter,
  onClearFilters,
  isPersonExpanded,
  onTogglePersonDetails,
  onRoleChange,
  onDeleteUser
}) => (
  <>
    <div className="block md:hidden space-y-4">
      {filteredUsers.map((user) => {
        const personKey = user.person_id || user.id
        const accounts = Array.isArray(user.accounts) ? user.accounts : []
        const hasMultipleAccounts = (user.members_count || 0) > 1 || user.is_grouped || accounts.length > 1
        const isExpanded = hasMultipleAccounts && isPersonExpanded(personKey)

        return (
          <AdminRow
            key={personKey}
            user={user}
            variant="mobile"
            isExpanded={isExpanded}
            onTogglePerson={onTogglePersonDetails}
            onRoleChange={onRoleChange}
            onDeleteUser={onDeleteUser}
          />
        )
      })}
    </div>

    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-linear-to-r from-primary-600 to-primary-700">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
              Usuario
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
              Rol
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-black bg-white/80 uppercase tracking-wider">
              Fecha de Registro
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-black bg-white/80 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredUsers.map((user) => {
            const personKey = user.person_id || user.id
            const accounts = Array.isArray(user.accounts) ? user.accounts : []
            const hasMultipleAccounts = (user.members_count || 0) > 1 || user.is_grouped || accounts.length > 1
            const isExpanded = hasMultipleAccounts && isPersonExpanded(personKey)

            return (
              <AdminRow
                key={personKey}
                user={user}
                variant="table"
                isExpanded={isExpanded}
                onTogglePerson={onTogglePersonDetails}
                onRoleChange={onRoleChange}
                onDeleteUser={onDeleteUser}
              />
            )
          })}
        </tbody>
      </table>
    </div>

    {filteredUsers.length === 0 && (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron usuarios</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm || roleFilter !== 'all'
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'No hay usuarios registrados en el sistema'}
        </p>
        {(searchTerm || roleFilter !== 'all') && (
          <button
            onClick={onClearFilters}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        )}
      </div>
    )}
  </>
)

export default AdminTable
