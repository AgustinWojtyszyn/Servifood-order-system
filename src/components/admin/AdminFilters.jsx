import { ArrowUpDown, Filter, Search } from 'lucide-react'
import { ROLE_FILTER_OPTIONS, USER_SORT_OPTIONS } from '../../utils/admin/adminConstants'

const AdminFilters = ({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortChange
}) => (
  <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
    <div className="flex-1">
      <label htmlFor="search" className="block text-sm font-bold text-gray-900 mb-2">
        Buscar Usuario
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          id="search"
          name="search"
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="search"
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
        />
      </div>
    </div>

    <div className="w-full sm:w-48">
      <label htmlFor="roleFilter" className="block text-sm font-bold text-gray-900 mb-2">
        Filtrar por Rol
      </label>
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <select
          id="roleFilter"
          name="roleFilter"
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium appearance-none"
        >
          {ROLE_FILTER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="w-full sm:w-56">
      <label htmlFor="sortBy" className="block text-sm font-bold text-gray-900 mb-2">
        Ordenar por
      </label>
      <div className="relative">
        <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <select
          id="sortBy"
          name="sortBy"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium appearance-none"
        >
          {USER_SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
)

export default AdminFilters
