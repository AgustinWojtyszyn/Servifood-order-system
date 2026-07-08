# Resumen de Auditoría y Plan de Acción (Servifood Orders)

Este documento es una versión estructurada y legible de la auditoría técnica integral (`AUDITORIA_QUIRURGICA_SERVIFOOD_ORDERS.txt`), diseñada para facilitar la ejecución progresiva de los fixes.

## 📌 1. Resumen Ejecutivo
- **Estado general:** La app funciona, pero existen inconsistencias críticas en reglas de negocio (estados de pedidos), seguridad/arquitectura (endpoint expuesto), y uso de fechas (`created_at` vs `delivery_date`).
- **Puntuación de Preparación:** 6/10.
- **Riesgos Principales:** 
  1. La regla de 2 estados (`pending`, `archived`) se viola en múltiples capas (aún se permite `cancelled`, `preparing`, `ready`).
  2. Dependencia de validaciones críticas en frontend y no como constraints en base de datos.
  3. El archivo `server.js` expone la ruta `/api/send-daily-orders-email` sin autenticación.
  4. Los reportes y dashboards mezclan filtros por `created_at` y `delivery_date`, ocultando pedidos del día.
  5. Existen dos capas para manejar pedidos con lógicas diferentes (`services/orders.js` vs `services/orders/ordersService.js`).

---

## 🚨 2. Hallazgos Críticos (Bloqueantes)

### [CRÍTICO-01] Violación de la regla de 2 estados
- **Dónde:** `types/index.js`, `services/orders/ordersService.js`, DB (SQL), Analytics, entre otros.
- **Problema:** Negocio exige solo `pending` y `archived`. El código aún maneja `cancelled`, `preparing`, `ready`.
- **Solución:** Definir la fuente de la verdad (SoT) de estados. Limitar todo el frontend y la base de datos a `pending` y `archived`. Crear migración SQL para limpiar datos antiguos.

### [CRÍTICO-02] Endpoint de Email expuesto sin Auth
- **Dónde:** `server.js` (`/api/send-daily-orders-email`).
- **Problema:** No exige token JWT ni ser administrador. Cualquier cliente puede enviar correos masivos (spam/costos).
- **Solución:** Exigir `verifySupabaseJWT` y validación de rol de admin. Agregar rate limit.

### [CRÍTICO-03] Inconsistencia en fechas de filtros ("Hoy")
- **Dónde:** `useDailyOrdersData.js`, `useDashboardOrders.js`, `useOrderBootstrap.js`.
- **Problema:** Filtros usan `created_at` para definir "hoy", pero el negocio opera según la fecha de entrega (`delivery_date`). Esto oculta pedidos.
- **Solución:** Unificar la lógica operativa para filtrar usando exclusivamente `delivery_date`. Usar `created_at` solo como metadata visual.

---

## ⚠️ 3. Hallazgos de Severidad Alta

### [ALTO-01] Servicios de órdenes duplicados
- **Dónde:** `services/orders.js` vs `services/orders/ordersService.js`.
- **Problema:** Hay dos capas para leer/escribir órdenes, con comportamientos distintos (CRUD directo vs RPC con idempotencia).
- **Solución:** Consolidar todo el acceso a órdenes en una única capa.

### [ALTO-02] Borrado de órdenes en lugar de archivado
- **Dónde:** `useDailyOrdersData.js`, `services/orders.js`.
- **Problema:** Existen funciones `deleteOrder` y cancelaciones activas. El único camino funcional debe ser "archivar".
- **Solución:** Restringir cierres a "archivado". Dejar "delete" solo para mantenimiento interno.

### [ALTO-03] Validación de Rol de Admin fragmentada
- **Dónde:** `useAuth.js`, `AuthContext.jsx`.
- **Problema:** El rol admin se resuelve mezclando metadatos, base de datos y UI de forma no unificada.
- **Solución:** Centralizar y unificar la fuente de verdad para el rol.

### [ALTO-04] Política de DB (RLS) muy permisiva para `users`
- **Dónde:** Migración `20250101000000_local_base_schema.sql`.
- **Problema:** Cualquier usuario logueado puede ver (`SELECT`) todos los usuarios de la tabla.
- **Solución:** Limitar lectura a "sí mismo" o "admin".

### [ALTO-05] Instancia de Supabase con fallback peligroso
- **Dónde:** `server.js`.
- **Problema:** Acepta usar `SUPABASE_ANON_KEY` si falta la Service Role Key, provocando comportamientos impredecibles en producción.
- **Solución:** Exigir `SERVICE_ROLE_KEY` y crashear el server si falta.

---

## 🟡 4. Hallazgos Medios y Bajos

- **[MEDIO-01] Idempotencia débil:** Depende de `sessionStorage`. Mitigación insuficiente en multi-tabs. (Solución: dependender de RPC en BD).
- **[MEDIO-02] Textos UX confusos:** Se pide "esperar a completar pedido" en vez de "archivar". (Solución: Ajustar textos).
- **[MEDIO-03] Logs en DEV exponen URL Supabase completa.** (Solución: Ocultar).
- **[MEDIO-04] Código duplicado en `server.js`:** Bloque middleware static duplicado. (Solución: Limpiar).
- **[MEDIO-05] Métricas alteradas:** Filtro de analytics suma estados legacy. (Solución: Alinear estados contables a `pending` y `archived`).
- **[BAJO-01] Exceso de logs de debugging y warnings de lint.**

---

## 🚀 5. Plan de Ejecución Seguro (Orden Propuesto para Fixes)

Este es el orden recomendado para implementar correcciones paso a paso, asegurando estabilidad:

### Fase 1: Fixes Inmediatos (Bajo Riesgo, Alto Impacto)
1. **Seguridad Backend:** Proteger `/api/send-daily-orders-email` con JWT y chequeo de rol admin en `server.js`.
2. **Textos y Analíticas:** Corregir mensajes UI (cambiar "completado/cancelado" por "archivado") y ajustar el array `COUNTABLE_STATUSES` a solo `pending` y `archived`.
3. **Limpieza Server:** Eliminar el bloque middleware estático duplicado en `server.js`.
4. **Fallback Supabase:** Exigir `SERVICE_ROLE_KEY` en `server.js`.

### Fase 2: Fixes Core (Riesgo Medio)
1. **Unificación de Fechas:** Reemplazar `created_at` por `delivery_date` en los dashboards y filtros diarios para que el sistema opere por fecha de entrega.
2. **Modelo de Estados:** Purgar en frontend los estados antiguos y obligar todo el flujo a `pending` y `archived`.
3. **Consolidación de Servicios:** Migrar rutas para que usen un solo servicio de órdenes (`ordersService.js`) en lugar de dos archivos separados.

### Fase 3: Base de Datos y Refactors (Con Migraciones)
1. **Limpieza de Datos:** Crear migración SQL para pasar estados legacy a `archived` y añadir constraint duro que solo permita `pending` o `archived`.
2. **Seguridad RLS:** Modificar policy en `public.users` para que los usuarios normales solo puedan verse a sí mismos.
3. **Roles Centralizados:** Refactorizar validación de admin y unificar esquema Zod de formularios.

---
*Para ver el reporte completo sin resumir, consultar el archivo `AUDITORIA_QUIRURGICA_SERVIFOOD_ORDERS.txt` original.*
