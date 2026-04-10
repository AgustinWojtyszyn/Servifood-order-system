# ADMIN PANEL DATA FLOW - FULL TRACE

## 1. OVERVIEW GENERAL

El Admin Panel vive en la ruta `/admin` y se renderiza desde `src/App.jsx` cuando hay sesion activa. La validacion de permisos admin ocurre dentro de `src/components/AdminPanel.jsx` usando `useAuthContext` (estado global de auth). El flujo de datos para la lista de usuarios y pedidos es:

1. Autenticacion: `useAuth` en `src/hooks/useAuth.js` arma `user`, `loading`, `isAdmin` a partir de Supabase Auth + tabla `users` (para rol), y expone el contexto en `src/contexts/AuthContext.jsx`.
2. AdminPanel monta, verifica `isAdmin`, y dispara `refreshUsers()` (lista de usuarios) cuando hay `user.id` y `isAdmin`.
3. La lista de usuarios se construye con un merge entre una vista agregada (`admin_people_unified`) y la tabla `users` usando `mapAdminPeople`.
4. La UI aplica filtros, busqueda y ordenamiento en memoria (no hay paginacion ni filtros SQL).
5. Para pedidos en Admin Panel, el unico flujo directo es el de Cafeteria (tab `cafeteria`), que carga `cafeteria_orders` una sola vez en `AdminCafeteriaSection` y luego filtra en memoria por empresa. No hay una tabla/lista de pedidos general listada en el panel de admin actual.
6. El tab de limpieza (`cleanup`) consulta solo el conteo de pedidos archivados y permite acciones masivas sobre `orders`.

Nota de alcance: no se encontro en el repo una vista o componente que liste todos los pedidos generales dentro de Admin Panel. Lo que existe es exportacion/resumen de pedidos de cafeteria y acciones masivas sobre `orders`.

## 2. DATA SOURCE (DATABASE)

Tablas y vistas referenciadas por el Admin Panel (definiciones SQL completas no estan en el repo, salvo indicaciones debajo):

- `public.users`
  - Campos usados: `id`, `email`, `full_name`, `role`, `created_at`.
  - Usado para la lista de usuarios y para resolver el rol admin.
  - Definicion completa no encontrada en migraciones.

- `public.admin_people_unified` (VIEW)
  - Campos usados: `person_id`, `group_id`, `display_name`, `emails`, `user_ids`, `members_count`, `first_created`, `last_created`, `is_grouped`.
  - Se usa para agrupar cuentas por persona y evitar duplicados.
  - Definicion SQL no encontrada en migraciones. Hipotesis: vista que agrupa `users` por email/nombre y genera clusters.

- `public.cafeteria_orders`
  - Campos usados: `id`, `user_id`, `items`, `total_items`, `status`, `created_at`, `updated_at`, `company_slug`, `company_name`, `admin_name`, `admin_email`, `notes`.
  - Se usa para exportacion/resumen en el tab Cafeteria.
  - Definicion SQL no encontrada en migraciones.

- `public.orders`
  - Usada para acciones masivas (archivar pendientes, borrar archivados) y conteo de archivados.
  - Migracion encontrada: `supabase/migrations/20260226_archive_orders_bulk.sql` agrega constraint de `status` y RPC `archive_orders_bulk`.

- `public.audit_logs`
  - Se usa para registrar auditoria en cambios de rol y eliminacion de usuario (via `logAudit` en `src/supabaseClient.js`).
  - Definicion SQL no encontrada en migraciones.

- `public.dinner_menu_by_date`
  - Migracion `supabase/migrations/20260326_dinner_menu_by_date.sql`. No forma parte de la lista de pedidos/usuarios, pero es tab admin.

- Trigger en `auth.users` -> `public.users`
  - Migracion `supabase/migrations/20260406_sync_user_email.sql` sincroniza email.

RLS / Policies:
- No hay definiciones de RLS/policies en repo. En comentarios se indica que `cafeteria_orders` es admin-only via RLS (`src/supabaseClient.js`) y que el acceso a datos depende de RLS (p.ej `src/hooks/useScreenMetrics.js`). Hipotesis: las policies existen en Supabase pero no versionadas en este repo.

## 3. DATA FETCHING

### Usuarios (lista principal)

- Entrada UI: `src/components/AdminPanel.jsx`
  - `useAdminUsersData()` expone `users`, `usersLoading`, `refreshUsers`.
  - `useEffect` llama `refreshUsers()` cuando `user.id` y `isAdmin` son true.

- Fetch real:
  - `src/hooks/admin/useAdminUsersData.js`:
    - `db.getAdminPeopleUnified()` -> `supabase.from('admin_people_unified')...order('display_name')`
    - `db.getUsers()` -> `supabase.from('users').select('id, email, full_name, role, created_at').order('created_at', desc)`
  - Ambos en paralelo con `Promise.all`.

- Caches:
  - `src/supabaseClient.js` tiene cache en memoria con TTL:
    - `getAdminPeopleUnified`: TTL 60s.
    - `getUsers`: TTL 60s.
  - `db.updateUserRole()` y `db.deleteUser()` limpian cache completa.

### Pedidos (Admin Panel - Cafeteria)

- Entrada UI: `src/components/admin/AdminCafeteriaSection.jsx`.
- `useEffect` ejecuta `db.getCafeteriaOrders()` una sola vez al montar el tab.
- `db.getCafeteriaOrders()` -> `supabase.from('cafeteria_orders').select(...).order('created_at', desc)`.
- No hay cache; el componente guarda la respuesta en estado local.

### Pedidos (Admin Panel - Limpieza)

- Entrada UI: `src/hooks/admin/useAdminCleanupData.js`.
- `db.getArchivedOrdersCount()` -> `supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status','archived')`.
- Se llama solo cuando el tab `cleanup` esta activo.

## 4. DATA TRANSFORMATION

### Usuarios

- Transformacion principal en `src/domain/admin/adminMappers.js` -> `mapAdminPeople(people, accounts)`:
  - Normaliza emails y nombres (quita diacriticos, dominios parciales, caracteres).
  - Resuelve cuentas asociadas por `user_ids` y por email.
  - Determina `primary_user_id`, `role` y `created_at` combinando `admin_people_unified` y `users`.
  - Deduplica personas por user_id compartido, email compartido o nombre normalizado igual.
  - Fusiona arrays de `accounts`, `emails`, `user_ids` y recalcula `members_count`.

- Transformaciones para UI:
  - `src/domain/admin/adminUserSearch.js` crea un indice `searchableText` por usuario (nombre + email + alias sin dominio) y luego filtra + ordena.
  - `formatShortDate` en `src/utils/admin/adminFormatters.js` formatea fechas para UI.

### Pedidos (Cafeteria)

- `AdminCafeteriaSection` filtra por empresa usando `company_slug` o `company_name`.
- Resumen y export:
  - `summarizeCafeteriaOrders` en `src/utils/cafeteria/exportCafeteriaOrdersExcel.js` calcula totales por plan.
  - `exportCafeteriaOrdersExcel` normaliza cada pedido y produce Excel.
  - `shareCafeteriaOrdersWhatsApp` genera un texto con resumen + detalle.

### Pedidos (Cleanup)

- No hay transformacion de datos; solo conteo y acciones masivas.

## 5. STATE MANAGEMENT

### Global

- Auth global en `AuthContext` (`src/contexts/AuthContext.jsx`) con `useAuth`.
- `useAuth` define `user`, `loading`, `isAdmin` y expone `refreshSession`.
- `isAdmin` se resuelve por:
  - `role` en metadata de Auth,
  - rol en tabla `users`,
  - allowlist hardcodeada.

### Local en Admin Panel

- `AdminPanel.jsx` mantiene:
  - `activeTab`, `menuWeekBaseDate`, `expandedPeople`.
  - Estados agregados de hooks admin (menu, options, cleanup, etc.).
  - `useAdminFilters` maneja `searchTerm`, `roleFilter`, `sortBy`, y `filteredUsers`.

- `useAdminUsersData` mantiene `users` y `usersLoading`.
- `AdminCafeteriaSection` mantiene `orders`, `loading`, `error`, `companyFilter`.
- `useAdminCleanupData` mantiene `archivedOrdersCount`.
- No hay estado global para datos de usuarios/pedidos fuera del Admin Panel.

## 6. UI RENDERING

### Lista de usuarios

- `AdminPanel.jsx` renderiza el tab `users` -> `AdminUsersSection`.
- `AdminUsersSection` compone:
  - `AdminFilters` (busqueda, filtro por rol, sort).
  - `AdminSummary` (conteo filtrado vs total).
  - `AdminTable` (lista de usuarios).
- `AdminTable` renderiza:
  - Vista mobile: tarjetas con `AdminRow` variant `mobile`.
  - Vista desktop: tabla con `AdminRow` variant `table`.
- `AdminRow` muestra:
  - `full_name`, `email`, `role`, `created_at`.
  - Boton de eliminar y select de rol.
  - En cuentas agrupadas, permite expandir para ver cuentas asociadas.

### Pedidos (Cafeteria)

- `AdminPanel.jsx` muestra `AdminCafeteriaSection` solo si `canExportCafeteria` (allowlist).
- `AdminCafeteriaSection` renderiza:
  - Filtro por empresa.
  - Botones de exportar Excel y compartir WhatsApp.
  - Resumen por planes (no hay tabla de pedidos visible en UI).

### Pedidos (Cleanup)

- `AdminCleanupSection` muestra cantidad de archivados y acciones masivas.

## 7. ACTION FLOW

### Cambiar rol de usuario

1. UI: `AdminRow` cambia el select -> `onRoleChange(user.primary_user_id, newRole)`.
2. `AdminPanel.handleRoleChange` -> `db.updateUserRole(userId, roleValue)`.
3. `db.updateUserRole`:
   - `supabase.from('users').update({ role }).eq('id', userId).select()`.
   - Registra auditoria con `logAudit` en `audit_logs`.
4. UI:
   - Notificaciones OK/ERROR.
   - `refreshAdminData()` -> `refreshUsers()` + `refreshOptions()`.
   - Si el admin cambio su propio rol: `refreshSession()`.

### Eliminar usuario

1. UI: `AdminRow` -> `onDeleteUser(userId, userName)`.
2. Confirm dialog -> `db.deleteUser(userId)`.
3. `db.deleteUser`:
   - Borra `orders` del usuario.
   - Borra fila en `users`.
   - Registra auditoria con `logAudit`.
4. UI: notifica y refresca datos.

### Pedidos Cafeteria (export / compartir)

1. Carga inicial: `db.getCafeteriaOrders`.
2. `exportCafeteriaOrdersExcel` transforma items y descarga Excel.
3. `shareCafeteriaOrdersWhatsApp` genera texto y abre `wa.me`.

### Limpieza de pedidos

- Archivar pendientes:
  - `db.archiveAllPendingOrders` -> RPC `archive_orders_bulk(statuses)`.
  - Requiere funcion `is_admin()` en DB (no encontrada en repo).
- Borrar archivados:
  - `db.deleteArchivedOrders` -> `orders.delete().eq('status','archived')`.

## 8. PERFORMANCE ANALYSIS

- Sin paginacion: `getUsers` y `admin_people_unified` traen todo; el filtrado es en memoria. Escala mal con muchos usuarios.
- Doble consulta por usuarios: requiere vista + tabla; costo adicional por cada refresh.
- Transformaciones de dedupe y normalizacion O(n^2) en `mapAdminPeople` por el `find` sobre `dedupedPeople`. Con muchos usuarios puede ser pesado.
- Busqueda y orden en cliente: `buildUserSearchIndex` + `filterAndSortUsers` se recalculan cuando cambia `users` o filtros; ok para pocos usuarios, pero sin memoizacion incremental.
- `AdminCafeteriaSection` carga pedidos una vez y no refresca; datos pueden quedar obsoletos en sesiones largas.
- Cache duplicada: `src/supabaseClient.js` tiene cache manual y `src/services/supabase.js` tiene cache adicional; en el Admin Panel solo se usa la primera, pero otras partes usan la segunda, lo que puede generar inconsistencias.

## 9. CODE SMELLS

- Definiciones SQL faltantes para `admin_people_unified`, `cafeteria_orders`, `audit_logs`, `orders_with_person_key`, `orders_count_by_person` y RLS: no versionado en repo, dificulta auditoria y reproducibilidad.
- Duplicacion de logica de usuarios:
  - `db.getUsers` en `src/supabaseClient.js` y `usersService.getUsers` en `src/services/users.js` hacen casi lo mismo.
  - `db.updateUserRole` y `usersService.updateUserRole` duplican actualizacion.
- Falta de manejo de error en UI para `useAdminUsersData`:
  - Si falla `getAdminPeopleUnified`, se loguea pero no se muestra error, quedando tabla vacia sin feedback.
- Acoplamiento UI-data:
  - `AdminCafeteriaSection` mezcla fetch, filtros, resumen y acciones de export en un solo componente.
  - `AdminPanel` orquesta demasiadas responsabilidades (menu, options, cleanup, users, cafeteria).
- Posible inconsistencia en roles agrupados:
  - `mapAdminPeople` calcula `role` admin si cualquiera lo es, pero el select en fila principal usa `primary_user_id` que puede no representar el rol real de todas las cuentas.
- Riesgo de merges incorrectos:
  - Dedupe por nombre normalizado puede unir personas distintas con nombres iguales.

## 10. REFACTOR PROPOSAL

Objetivo: separar responsabilidades, versionar la capa de datos y reducir queries + costos de render.

1. Base de datos
- Versionar SQL de:
  - `admin_people_unified`, `cafeteria_orders`, `audit_logs`, `orders_with_person_key`, `orders_count_by_person` y todas las policies RLS.
- Crear una vista materializada o endpoint RPC para `admin_people_unified` con paginacion (offset/limit) y filtros por rol/busqueda.

2. Data fetching
- Consolidar un solo servicio para usuarios (eliminar duplicidad `db` vs `usersService`).
- Exponer `useAdminUsersQuery({ search, role, sort, page })` con React Query o SWR:
  - cache consistente
  - revalidacion
  - control de loading/error a nivel UI
- En cafeteria, agregar `refresh` y `polling` opcional.

3. Transformaciones
- Mover `mapAdminPeople` y `adminUserSearch` a un pipeline server-side o a una capa de selector memoizada con keys estables.
- Evitar dedupe por nombre como criterio principal; priorizar `user_id` y `email`.

4. UI y estado
- Dividir `AdminPanel` en rutas/tab pages con lazy loading y data fetching local.
- Mostrar estados de error y empty states de forma consistente (p.ej `AdminUsersSection` con mensaje si falla fetch).
- Agregar paginacion y virtualizacion para tablas grandes.

5. Seguridad
- Documentar `is_admin()` y policies asociadas.
- Para acciones sensibles (delete user, archive), registrar `request_id` y mostrar audit trail en UI.
