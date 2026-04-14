# ADMIN SYSTEM - PRINCIPAL ENGINEERING AUDIT

## 1. VALIDATION OF EXISTING ANALYSIS

Referencia: documento previo de auditoria de Admin Panel.

- ✔ Correcto: Identifica ausencia de paginacion y costo O(n^2) en dedupe de personas.
- ✔ Correcto: Riesgo de SoT mixta para roles (Auth metadata + `public.users` + allowlist).
- ✔ Correcto: Duplicacion de servicios/caches (`db` vs `usersService`).
- ✔ Correcto: Acciones sensibles ejecutadas desde frontend y dependencia en RLS.
- ✔ Correcto: RLS/views no versionadas en repo.

- ⚠ Incompleto: No cuantifica limites concretos (p.ej tiempos de render/CPU) ni define umbrales de ruptura por componente.
- ⚠ Incompleto: No modela concurrencia ni race conditions en cambios de rol, delete de usuario ni archivado masivo.
- ⚠ Incompleto: No detalla el impacto de multicompañia (aislamiento, permisos, ownership) ni propone esquema de tenancy.
- ⚠ Incompleto: No cubre estrategia de auditoria estricta (immutable logs, idempotencia, correlacion).
- ⚠ Incompleto: No analiza fallas parciales de Supabase ni comportamiento en latencia alta.
- ⚠ Incompleto: No propone plan de migracion paso a paso.

- ❌ Incorrecto: Asume implícitamente que `admin_people_unified` es la SoT de personas. En realidad es una vista derivada y el frontend vuelve a deduplicar, lo que indica que la vista no es suficiente o consistente.
- ❌ Incorrecto: Sugiere que “RLS no versionada” es solo un problema de repo. En producción es un riesgo operativo mayor: sin versionado no hay rollback ni auditoria de cambios de policy.

## 2. SYSTEM BOUNDARIES & COUPLING

Boundaries reales:
- Frontend React = UI + data access + business rules (acoplamiento fuerte).
- Supabase = Auth + DB + RLS + RPC + storage implícito.
- No hay BFF/Backend dedicado; el frontend es el boundary dominante.

Coupling peligroso:
- UI acoplada a estructura exacta de tablas/vistas (`admin_people_unified`, `cafeteria_orders`). Cualquier cambio de DB rompe UI.
- Lógica de identidad (dedupe) en frontend acoplada a datos inconsistentes de DB.
- Acciones admin acopladas a RLS y funciones DB no versionadas.
- Dependencia de allowlist hardcodeada para permisos especiales (cafeteria export). Esto acopla permisos a deployments del frontend.

Supuestos frágiles:
- “RLS controla todo” sin verificación server-side.
- “admin_people_unified” refleja verdad de identidad y agrupación.
- “users” y Auth están sincronizados siempre.

Partes que deberían ser servicios separados:
- Admin API (BFF) para operaciones sensibles y log de auditoria.
- Servicio de identidad/roles (inclusive si es un Edge Function que centraliza decisiones de rol).
- Servicio de exportes/reportes (cafeteria, pedidos) para offload del cliente.

## 3. DOMAIN MODEL (REDEFINED)

Modelo propuesto para claridad y consistencia:

- Tenant (Company)
  - `companies` (id, name, status, created_at).
- User
  - SoT: `auth.users`.
  - `app_users` con FK a auth, datos extendidos.
- Membership
  - `company_users` con roles scoped por company (owner/admin/ops/user).
- Person (opcional pero real)
  - `people` y `person_accounts` para agrupar cuentas explícitamente, no por heurísticas.
- Order
  - `orders` con `company_id`, `user_id`, `status`, `created_at`, `delivery_date`, `order_type`.
- CafeteriaOrder
  - Se unifica con `orders` via `order_type = cafeteria` o tabla especializada con FK a orders.
- AuditLog
  - `audit_events` append-only con `actor_id`, `tenant_id`, `action`, `target`, `request_id`, `metadata`, `created_at`.

Source of Truth por entidad:
- Identidad: Auth.
- Roles: `company_users`.
- Agrupacion de personas: `people` (si se requiere), no heuristica.
- Pedidos: `orders`.
- Auditoria: `audit_events` (append-only, server-side).

## 4. DATA CONSISTENCY MODEL

Consistencia requerida por entidad:

- Roles y permisos: fuerte (strong consistency). Cambio de rol debe reflejarse inmediatamente.
- Orders: fuerte para estados transaccionales (pending -> confirmed), eventual para reporting/analytics.
- Audit logs: fuerte e inmutable; no se puede perder eventos.
- Users/profile: eventual aceptable para campos no críticos (display name), fuerte para email/role.

Riesgos actuales:
- Cambios concurrentes de rol: no hay locking ni control de versiones; el ultimo write gana.
- Delete de usuario con orders en paralelo: puede quedar estado intermedio sin constraint claro.
- Archivado masivo concurrente con actualizaciones de pedidos: conflicto de estado.

Modelo recomendado:
- Optimistic concurrency control (column `version` o `updated_at` con checks).
- Transactions en backend para cambios sensibles (role change, delete user + cascade).
- Soft delete para entidades críticas.
- Idempotencia en operaciones admin con `request_id` obligatorio.

## 5. MULTI-TENANCY ANALYSIS

Estado actual:
- No hay `company_id` consistente en `users` ni `orders` (solo cafetería tiene `company_slug/name`).
- No hay isolation real por tenant. El front controla visibilidad con allowlist.

Riesgo:
- Fuga de datos entre empresas si RLS no filtra por tenant.
- Filtro por `company_slug` en frontend es cosmético; no es seguridad real.

Modelo correcto:
- Todas las tablas multi-tenant deben incluir `company_id`.
- RLS debe filtrar por `company_id` y membership.
- Roles son por tenant, no globales.

Permisos y ownership:
- `company_users`: define rol por company.
- Policies: `SELECT/UPDATE/DELETE` permitidos solo si `auth.uid()` es miembro y rol permite.
- Operaciones admin con alcance tenant.

## 6. SECURITY MODEL

RLS no es suficiente:
- Frontend puede ser manipulado; cualquier llamada a Supabase debe validarse server-side en operaciones críticas.
- Si RLS falla o se relaja, el sistema queda expuesto (no hay backend que revalide).

Operaciones críticas que deben migrar a backend:
- Cambios de rol.
- Eliminación de usuarios.
- Archivado/borrado masivo.
- Exportes de datos sensibles.

Modelo recomendado:
- BFF/Edge Functions con validacion de rol + tenancy + audit.
- RLS como defense-in-depth, no como única defensa.
- Audit logging server-side obligatorio y atómico con la operación.

## 7. FAILURE SCENARIOS

1) Caída parcial de Supabase (Auth OK, DB con latencia)
- Actual: UI cuelga en loading o falla silenciosa; no hay retry centralizado.
- Falla: acciones admin pueden quedar a mitad (por falta de transacciones).

2) Latencia alta / timeouts
- Actual: frontend realiza múltiples queries sin backoff coherente.
- Falla: UI render lenta, duplicación de requests, usuarios perciben datos inconsistentes.

3) Datos inconsistentes (users vs auth)
- Actual: rol calculado desde metadata y DB; inconsistencias producen permisos erróneos.

4) Double submit de acciones admin
- Actual: no hay idempotencia. Un doble click puede duplicar deletes o cambios de rol.

5) Eliminación accidental masiva
- Actual: acciones destructivas desde frontend con confirm modal. No hay safeguard server-side ni soft delete.

## 8. PERFORMANCE & SCALING LIMITS

Ruptura probable actual:
- 1k usuarios: UI empieza a degradar (O(n^2) dedupe + render completo).
- 5k usuarios: bloqueos en main thread, UX lenta, timeouts de Supabase.
- 10k+ usuarios: Admin panel inutilizable sin paginación/virtualización.

Componente que rompe primero:
- Frontend: CPU y render en listas y dedupe.
- DB: consultas sin paginación, `count=exact` en tablas grandes.
- Red: payloads grandes en cada refresh.

Estrategia de escalado:

Corto plazo:
- Paginación server-side.
- Virtualización UI.
- Cache coherente.

Mediano plazo:
- BFF para operaciones admin.
- Materialized views para agregados.
- Jobs async para exports.

Largo plazo:
- Servicios separados (identity/roles, orders, reporting).
- Data warehouse para analytics.

## 9. CRITICAL SYSTEM RISKS

- Fuga de datos entre tenants por falta de aislamiento real.
- Privilegios incorrectos por SoT mixta de roles.
- Pérdida de datos por deletes desde frontend sin safeguards.
- Auditoria incompleta por logs en cliente.
- Inconsistencia de identidad por dedupe heurístico en UI.
- UX colapsa en 10k+ usuarios.

## 10. ARCHITECTURAL DECISIONS

1) Crear BFF/Edge Functions para acciones admin
- Problema: operaciones críticas dependen del frontend.
- Solución: mover validación + audit + transacciones al backend.
- Trade-off: mayor complejidad infra, pero seguridad y consistencia fuertes.

2) Reemplazar dedupe frontend por modelo `people` explícito
- Problema: merges incorrectos y O(n^2).
- Solución: tabla `people` con reglas claras y link a cuentas.
- Trade-off: esfuerzo de migración y limpieza de datos.

3) Multi-tenant real con `company_id` + `company_users`
- Problema: no hay aislamiento.
- Solución: todas las tablas tenant-aware y policies basadas en membership.
- Trade-off: migración de datos y cambios en queries.

4) Audit logging server-side e inmutable
- Problema: auditoría incompleta y manipulable.
- Solución: logs append-only, generados por backend.
- Trade-off: más storage y costos.

## 11. TARGET ARCHITECTURE

Conceptual (texto):

[Frontend React]
  - UI + state
  - consume BFF APIs

[BFF / Edge Functions]
  - AuthZ centralizado
  - operaciones admin (roles, delete, archive)
  - audit logging
  - export/reporting

[Supabase Postgres]
  - tablas tenant-aware
  - RLS defense-in-depth
  - materialized views para reporting

[Auth]
  - Supabase Auth SoT
  - sync a `app_users`

Responsabilidades:
- Frontend: UX, render, validaciones básicas.
- BFF: decisiones de negocio, transacciones, auditoría.
- DB: SoT + enforcement de constraints + RLS.

## 12. MIGRATION PLAN

Fase 0: Observabilidad
- Instrumentar logs y métricas para queries y acciones admin.

Fase 1: Data model incremental
- Agregar `companies`, `company_users` y `company_id` en tablas clave.
- Backfill y mantener compatibilidad.

Fase 2: BFF para operaciones críticas
- Implementar endpoints para role change, delete user, archive.
- UI migra a usar BFF.

Fase 3: Reemplazar dedupe frontend
- Crear tabla `people` y migrar agrupaciones reales.
- Eliminar dedupe heurístico en UI.

Fase 4: Auditoría estricta
- Mover audit logging a backend y hacer append-only.

Fase 5: Escalabilidad
- Paginación, virtualización, materialized views.
- Export server-side asíncrono.

Riesgos de migración:
- Cambios en RLS y tenancy pueden romper accesos si no se testea.
- Backfill incorrecto de company_id puede exponer datos.
- Migración de roles puede bloquear usuarios.

