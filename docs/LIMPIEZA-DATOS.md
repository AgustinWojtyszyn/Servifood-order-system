# 🗑️ Admin Cleanup — Archivar pendientes y borrar archivados

## Estado del documento

- Implementado: pestaña “Cleanup/Limpieza” en el Admin Panel.
- Implementado: archivar pedidos `pending` (no borra, cambia estado).
- Implementado: eliminar pedidos `archived` (borrado real, irreversible).
- No implementado: “borrar pedidos `completed/delivered`” (no aplica al código actual).

---

## Implementado — Qué hace la pestaña de limpieza

### 1) Archivar todos los pedidos pendientes

- Acción: mueve pedidos con `status = 'pending'` a `status = 'archived'`.
- Propósito: limpiar la lista de pendientes y ordenar el historial.
- UI: botón “Archivar todos los pedidos pendientes”.

Implementación:

- UI: `src/components/admin/AdminCleanupSection.jsx`
- Acción + confirmación: `src/hooks/admin/useAdminCleanupActions.js` (`handleArchiveAllPendingOrders`)
- Operación DB: `src/services/orders/ordersService.js` (`archiveAllPendingOrders` → RPC `archive_orders_bulk`)
- Migración RPC: `supabase/migrations/20260226_archive_orders_bulk.sql`

### 2) Eliminar pedidos archivados

- Acción: borra filas con `status = 'archived'`.
- Propósito: liberar espacio en la base de datos.
- UI: botón “Eliminar X Pedidos Archivados”.

Implementación:

- UI: `src/components/admin/AdminCleanupSection.jsx`
- Acción + confirmación: `src/hooks/admin/useAdminCleanupActions.js` (`handleDeleteArchivedOrders`)
- Operación DB: `src/services/orders/ordersService.js` (`deleteArchivedOrders`)

---

## Implementado — Contador y “espacio estimado”

- El contador (`archivedOrdersCount`) se obtiene con `db.getArchivedOrdersCount()`.
- El “espacio estimado” mostrado en UI es una estimación simple (~2KB por pedido), calculada en el componente de UI.

Implementación:

- Contador: `src/hooks/admin/useAdminCleanupData.js`
- Query: `src/services/orders/ordersService.js` (`getArchivedOrdersCount`)

---

## 🧪 Checklist de verificación

- [ ] Con pedidos `pending`, ejecutar “Archivar todos…” y confirmar que cambian a `archived`.
- [ ] Verificar que el contador de archivados aumenta.
- [ ] Ejecutar “Eliminar archivados” y confirmar que el contador baja a 0.
- [ ] Confirmar que la UI muestra advertencia de irreversibilidad y pide confirmación.

---

## 🆘 Troubleshooting

### “No archiva / no elimina”

- Verifica que el usuario tenga rol admin en la app.
- Verifica RLS/policies en Supabase (no están versionadas en este repo).
- Para archivar en bulk, verifica que exista la RPC `archive_orders_bulk` (migración `20260226_archive_orders_bulk.sql`).

---

**Última actualización de este doc:** 2026-04-16

