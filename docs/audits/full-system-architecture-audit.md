# ADMIN SYSTEM - FULL ARCHITECTURE AUDIT

## 1. SYSTEM OVERVIEW

Este sistema Admin se ejecuta en una SPA React. La capa de datos depende directamente del cliente Supabase (frontend) y asume enforcement de RLS en la DB. No hay backend propio intermedio. El Admin Panel es un agregado de tabs con fetches directos desde el navegador hacia Postgres (via Supabase API) y RPCs puntuales. La fuente de verdad es mixta: Supabase Auth para identidad base, tabla `public.users` para rol y metadata, y vistas derivadas (ej: `admin_people_unified`) para agregaciones.

Contexto de escala: el diseño actual funciona para decenas/centenas de usuarios, pero presenta costos de O(n) a O(n^2) en UI y dependencia fuerte de la calidad de datos/Policies en DB no versionadas. Esto es crítico para 10k+ usuarios y multicompañía.

## 2. DOMAIN MODEL RECONSTRUCTION

Entidades reales observadas (derivadas de código; algunas definiciones son hipotesis por ausencia de SQL):

- User (Auth): identidad primaria en Supabase Auth.
- User (App DB): `public.users` con rol, nombre, email, timestamps.
- Person (agregado): entidad derivada en `admin_people_unified` que agrupa cuentas por persona (posible agrupación por email/nombre).
- Order (general): `public.orders` (estado, user_id, created_at, etc.).
- CafeteriaOrder: `public.cafeteria_orders` (items, totales, empresa, admin).
- AuditLog: `public.audit_logs` (acciones, actor, target, metadata).
- DinnerMenuByDate: `public.dinner_menu_by_date` (menus por fecha).

Source of Truth (SoT):
- Identidad: Auth Users (Supabase) es SoT, pero roles se resuelven desde `public.users` y metadata en Auth.
- Roles: SoT mezclada (Auth metadata + `public.users` + allowlist hardcodeada). Esto viola SoT unico.
- Agrupación de personas: SoT implícita en `admin_people_unified` (no versionada), pero UI también deduplica/mergea (otra SoT derivada en frontend).

Entidades duplicadas o mal definidas:
- `users` en DB vs usuarios en Auth: dos fuentes con posible divergencia.
- `Person` se calcula en view y se vuelve a deduplicar en frontend (duplicación de lógica de identidad).
- Roles se calculan en frontend (mezcla metadata y DB) y también en DB (presumible RLS). No hay un único dueño.

Lógica de negocio mal ubicada:
- Dedupe de identidad y merges (personas) en frontend.
- Validación de roles y acceso en frontend, con RLS no visible.
- Operaciones sensibles (delete user, archive) ejecutadas desde frontend con dependencias en RLS y RPC.

## 3. DATA FLOW TRACE (END-TO-END)

Lista de usuarios (Admin Panel):
1. Auth: `useAuth` determina `user`, `isAdmin` usando Supabase Auth + `usersService.getUserById` (tabla `users`) + allowlist.
2. UI: `AdminPanel` monta y ejecuta `refreshUsers()` si `isAdmin`.
3. Fetch: `db.getAdminPeopleUnified()` + `db.getUsers()` en paralelo.
4. Transformación: `mapAdminPeople` fusiona y deduplica personas + cuentas; luego `buildUserSearchIndex` genera indice de busqueda; `filterAndSortUsers` filtra/ordena.
5. Estado: `useAdminUsersData` setea `users`; `useAdminFilters` setea filtros locales.
6. UI: `AdminUsersSection` renderiza filtros + tabla; `AdminRow` renderiza acciones.
7. Acción: cambio de rol / delete llaman `db.updateUserRole` / `db.deleteUser` -> Supabase.

Pedidos Cafeteria (Admin Panel):
1. UI: `AdminCafeteriaSection` monta y llama `db.getCafeteriaOrders()`.
2. Estado: `orders` local en el componente.
3. Transformación: `summarizeCafeteriaOrders` y `exportCafeteriaOrdersExcel` (client-side) para resumen/export.
4. UI: muestra resumen, exporta Excel, comparte WhatsApp.

Cleanup pedidos:
1. UI: `useAdminCleanupData` trae conteo de archivados.
2. Acciones: `archive_orders_bulk` RPC o delete directo de `orders` archivados.

## 4. DATA SOURCES (DB)

Observado en código:
- `public.users`: usado en listados y roles.
- `public.admin_people_unified` (VIEW): base para “personas” agregadas.
- `public.orders`: limpieza y archivado masivo.
- `public.cafeteria_orders`: export/resumen cafeteria.
- `public.audit_logs`: auditoria de acciones admin.
- `public.dinner_menu_by_date`: menu dinner.
- RPC `archive_orders_bulk(statuses)` (SECURITY DEFINER) con `is_admin()`.

Constraints visibles:
- `orders.status` restringido a `pending|archived|cancelled` (migracion 20260226).

RLS / Policies:
- No versionadas. Hipotesis: existen en Supabase para restringir `cafeteria_orders`, `orders`, `users` y RPCs.

## 5. DATA FETCHING LAYER

- Cliente Supabase directo desde frontend (`src/services/supabase.js` y `src/supabaseClient.js`).
- Duplicación de clientes/servicios:
  - `db` en `src/supabaseClient.js` con cache local simple.
  - `usersService` en `src/services/users.js` con cache propio (SupabaseService).
- Queries clave:
  - `admin_people_unified` + `users` para listados.
  - `cafeteria_orders` para export.
  - `orders` para cleanup.

Riesgo estructural: múltiples capas de cache y fetch con políticas distintas, sin invalidación unificada.

## 6. DATA TRANSFORMATION LAYER

- `mapAdminPeople`:
  - Normaliza nombres/emails.
  - Resuelve cuentas por user_ids + emails.
  - Deduplica por user_id, email o nombre normalizado.
  - Fusiona cuentas y recalcula `members_count`.
  - Complejidad: O(n^2) por dedupe linear sobre `dedupedPeople`.
- `adminUserSearch`:
  - Construye index `searchableText` y filtra por substring + orden.
  - Complejidad: O(n) para index + O(n log n) para sort, por cada cambio de filtros.
- Cafeteria:
  - Normalización y agregados en client, sin pre-aggregates.

## 7. STATE MANAGEMENT

- Global: AuthContext con `useAuth` (user, loading, isAdmin).
- Local: hooks admin por feature (users, filters, cleanup, menu, options).
- No hay store global de datos ni cache compartida. Cada tab es “source of truth” local.

## 8. UI RENDERING

- Render directo de listas completas (no virtualización).
- Dos layouts (mobile/table) duplican render de listas.
- `AdminRow` renderiza acciones y expande cuentas asociadas.
- Dependencia de `filteredUsers` completo en memoria.

## 9. ACTION FLOWS

Cambiar rol:
1. UI select -> `handleRoleChange`.
2. `db.updateUserRole` actualiza `public.users`.
3. Auditoría en `audit_logs`.
4. Refresh de datos + refresh de session si cambió su propio rol.

Eliminar usuario:
1. Confirm UI.
2. `db.deleteUser` borra orders -> users.
3. Auditoría en `audit_logs`.

Archivar pendientes:
- RPC `archive_orders_bulk` (SECURITY DEFINER) requiere `is_admin()`.

Eliminar archivados:
- Delete directo en `orders` (status=archived).

## 10. PERFORMANCE ANALYSIS

Usuarios:
- Fetch: O(n) rows desde DB sin paginación.
- Transformación: O(n^2) por dedupe en `mapAdminPeople`.
- Filtro + sort: O(n log n) cada interacción (search/filter/sort).
- Render: O(n) en DOM, duplicado para mobile + table.
- Impacto 10k usuarios: lento en CPU, memoria y tiempo de render; UI se degrada.

Cafeteria:
- Fetch: O(m) pedidos de cafeteria, sin paginación.
- Transformación: O(m) para resumen, O(m) para export.
- Impacto 10k pedidos: export/resumen puede bloquear UI (Excel en main thread).

Cleanup:
- Conteo exact con `count=exact` puede ser costoso en tablas grandes.
- Deletes masivos en frontend pueden bloquear y saturar si no hay throttling.

## 11. SYSTEM RISKS (CRITICAL)

- RLS no versionada: cambios de políticas pueden romper el sistema o exponer datos sin control.
- Identidad inconsistentes: roles provienen de metadata + tabla + allowlist; riesgo de privilegios incorrectos.
- Dedupe por nombre: usuarios distintos con nombres iguales pueden fusionarse en una sola “persona” en UI (bugs silenciosos).
- Acciones destructivas desde frontend: delete user / delete orders depende de RLS; si se relaja, riesgo de pérdida masiva de datos.
- Cache inconsistente: dos caches y queries duplicados pueden mostrar datos desactualizados o contradictorios.
- Falta de paginación: listados y transformaciones no escalan y pueden romper UX en 10k+ usuarios.
- Exportación en cliente: generar Excel en UI puede congelar la app o fallar en dispositivos lentos.
- Falta de trazabilidad completa: audit logs se insertan en cliente, pero sin enforcement server-side; riesgo de logs incompletos.

## 12. CODE SMELLS

- Duplicación de servicios y caches (`db` vs `usersService`).
- Dedupe + merges de identidad en frontend.
- `AdminPanel` orquesta demasiadas responsabilidades.
- UI sin manejo de error explícito en listados de usuarios.
- Allowlist hardcodeada en frontend.
- RLS y views críticas no versionadas en repo.

## 13. ARCHITECTURAL VIOLATIONS

- SRP violado: `AdminPanel` y `AdminCafeteriaSection` mezclan fetching, estado, lógica y UI.
- Single Source of Truth violado: roles, identidad y personas se derivan en múltiples lugares.
- Backend For Frontend ausente: frontend ejecuta tareas de backend (dedupe, agregaciones, export).
- Security by client: decisiones de acceso en UI, en lugar de enforcement centralizado.

## 14. REFACTOR STRATEGY

1. Versionar DB completa
- Migraciones para views (`admin_people_unified`, etc.), RLS, policies y funciones (`is_admin`).
- Definir constraints y FK explícitas.

2. Unificar servicios
- Eliminar `src/supabaseClient.js` o `src/services/users.js` duplicado; un único data layer con cache consistente.

3. Paginación + virtualización
- Paginación server-side para usuarios/pedidos.
- Virtualizar tablas (React Window/Virtualized).

4. Mover identidad y dedupe al backend
- Implementar RPC o vista materializada para resolver “Personas” en DB.
- Remover dedupe por nombre en frontend.

5. Crear backend intermedio (BFF)
- Un API layer (Edge Functions/Supabase Functions) para:
  - Listar usuarios con filtros.
  - Acciones admin con logs obligatorios.
  - Export de cafeteria en server.

## 15. PROPOSED ARCHITECTURE (IDEAL)

Nuevo modelo de datos (alto nivel):
- `users` (app): referencia a `auth.users` via FK.
- `roles` / `user_roles`: roles explícitos, versionados.
- `companies` y `user_companies`: multicompañía real.
- `people` (opcional): entidad real con reglas definidas, no solo view.
- `orders` con `company_id`, `status`, `created_at`, `delivery_date`.
- `cafeteria_orders` o `orders` con `order_type` para unificar dominios.
- `audit_logs` generado en backend, no desde frontend.

Arquitectura recomendada:
- DB como SoT con RLS versionada.
- Backend (Edge Functions) para toda operación admin:
  - Validate role.
  - Centralizar log de auditoría.
  - Apply business rules.
- Frontend solo consume endpoints BFF y maneja estado/UX.

## 16. REDESIGNED DATA FLOW

Flujo ideal (usuarios):
1. UI pide `GET /admin/users?search=&role=&page=`.
2. BFF valida rol admin, consulta vista/materialized `admin_people`, retorna paginado.
3. UI renderiza resultados y usa virtualización.

Flujo ideal (roles):
1. UI llama `POST /admin/users/:id/role`.
2. BFF valida, escribe en `user_roles`, crea audit_log, devuelve estado.

Flujo ideal (cafeteria):
1. UI solicita export o summary.
2. BFF genera Excel o summary en server y retorna archivo o URL.

Cambios clave respecto al actual:
- Se elimina dedupe en frontend.
- Se elimina fetch directo a tablas sensibles.
- Se centraliza auditoría y permisos.
- Se habilita escalabilidad (paginación, indices, materialized views).

