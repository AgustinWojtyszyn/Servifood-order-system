# 📋 Dashboard — estado real (alineado con el código)

## Estado del documento

- Implementado: estadísticas diarias calculadas con `created_at`.
- Implementado: secciones separadas para historial y archivados.
- No implementado (en el código actual): columna “Pedidos Completados” con estados `completed`/`delivered`, ni selector `processing/completed/delivered` en el Dashboard.

---

## Implementado — Qué muestra el Dashboard hoy

### 1) Estadísticas del día

Se calculan filtrando pedidos cuya fecha (`created_at`) coincide con el día actual (00:00–23:59).  
Implementación: `src/hooks/dashboard/useDashboardOrders.js` (`calculateStats`).

### 2) Historial (días anteriores)

Se muestra una sección de historial con pedidos de días anteriores.  
Implementación: `src/components/dashboard/OrderHistorySection.jsx`.

### 3) Pedidos archivados (solo admins)

Los admins ven una sección “Pedidos Archivados” y un botón “Ver pedido”.  
Implementación: `src/components/dashboard/ArchivedOrdersSection.jsx`.

## Implementado — Estados usados en el Dashboard

En UI se trabajan operativamente estos estados:

- `pending` → Pendiente
- `archived` → Archivado

Estados legacy/no operativos que pueden aparecer en datos históricos o pruebas:

- `cancelled`
- `preparing`
- `ready`
- `completed`
- `delivered`
- `processing`

Si aparece un estado desconocido, la UI muestra `Estado desconocido` (sin mapearlo a otro estado operativo).

## 🧪 Checklist rápido

- [ ] Crear pedidos hoy y confirmar que Stats refleja solo “hoy”.
- [ ] Confirmar que el historial solo incluye fechas anteriores.
- [ ] Con rol admin, validar que aparece la sección “Pedidos Archivados”.

---

**Última actualización de este doc:** 2026-04-16
