export const ACTION_LABELS = {
  role_transfer: 'Transferencia de rol',
  role_changed: 'Cambio de rol',
  user_created: 'Alta de usuario',
  user_invited: 'Invitación de usuario',
  user_deleted: 'Eliminación de usuario',
  member_removed: 'Baja de miembro',
  login_as: 'Ingreso como otro usuario',
  permission_updated: 'Actualización de permisos',
  menu_updated: 'Carga/actualización del menú diario'
}

export const ACTION_FILTERS = [
  { id: 'role', label: 'Cambios de rol', actions: ['role_transfer', 'role_changed'] },
  { id: 'create', label: 'Altas de usuarios', actions: ['user_created', 'user_invited'] },
  { id: 'delete', label: 'Bajas / eliminaciones', actions: ['user_deleted', 'member_removed'] },
  { id: 'perm', label: 'Permisos', actions: ['permission_updated'] },
  { id: 'menu', label: 'Cambios de menú', actions: ['menu_updated'] }
]

export const ENABLE_DUPLICATE_GROUPING = true
export const DUPLICATE_WINDOW_SECONDS = 120

