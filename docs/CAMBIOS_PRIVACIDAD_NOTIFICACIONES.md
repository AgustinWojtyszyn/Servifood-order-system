# 🔒 Privacidad y notificaciones — estado real (alineado con el código)

## Estado del documento

- Implementado: privacidad en el Dashboard (cada usuario ve sus pedidos).
- Implementado: secciones/acciones extra para admins en el Dashboard (p.ej. “Pedidos Archivados”).
- No implementado: sistema de notificaciones (tabla + UI + realtime).

---

## Implementado — Privacidad en el Dashboard

### Qué ve un usuario (incluye admins) en `/dashboard`

- Solo **sus propios pedidos**.  
  Implementación: `src/hooks/dashboard/useDashboardOrders.js` usa `db.getOrdersWithPersonKey({ userId: user.id })`.
- Puede ver historial de días anteriores si existen.  
  Implementación: `src/components/dashboard/OrderHistorySection.jsx`.

### Qué ve adicionalmente un admin en `/dashboard`

- Sección “Pedidos Archivados” (solo si hay pedidos archivados).  
  Implementación: `src/components/dashboard/ArchivedOrdersSection.jsx`.
- Botón “Ver pedido” (icono ojo) para navegar a detalle.  
  Flujo: `onViewOrder(order.id)` navega a la ruta de detalle (`/orders/:orderId`).

### Estados relevantes en UI del Dashboard

En las secciones del Dashboard se usan principalmente:

- `pending` → Pendiente
- `archived` → Archivado / Confirmado (según sección)
- `cancelled` → Cancelado

---

## No implementado — Sistema de notificaciones

En el repo actual **no existe**:

- Tabla/migración `notifications` versionada.
- Script `add-notifications.sql`.
- UI de campana `src/components/NotificationBell.jsx`.
- Suscripción realtime de notificaciones activa.

Sí existe hardening para evitar errores si alguien intenta usar `notifications` sin tabla (ver `docs/NOTIFICATIONS-SETUP.md`).

---

## Checklist de verificación (privacidad)

- [ ] Usuario normal: en `/dashboard` solo ve sus pedidos.
- [ ] Admin: en `/dashboard` sigue viendo solo sus pedidos, pero además puede ver “Pedidos Archivados” si aplica.
- [ ] No aparece ninguna UI de notificaciones (campana) porque no está implementada.

---

**Última actualización de este doc:** 2026-04-16
