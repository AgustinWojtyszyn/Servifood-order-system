# 🍽️ Límite de pedido activo por usuario

## Estado del documento

- Implementado (frontend): bloqueo de “pedido activo” por usuario y por servicio (almuerzo/cena) para el día actual.
- Parcial (backend): enforcement en DB vía RLS/policies **no está versionado** en este repo (no existe `fix-policies.sql` acá).
- Ejemplo: cómo podría implementarse en Supabase (solo guía conceptual).

---

## Implementado — Regla actual (frontend)

### Estados considerados “activos”

En el chequeo de pedidos del día y en la validación del submit se consideran activos:

- `pending`
- `preparing` (legacy, compatibilidad)
- `ready` (legacy, compatibilidad)

### Qué se bloquea

- Si el usuario tiene un pedido activo de **almuerzo** hoy, no puede crear otro pedido activo de almuerzo.
- Si el usuario tiene un pedido activo de **cena** hoy, no puede crear otro pedido activo de cena.

### Dónde está implementado

- Chequeo inicial del día:
  - `src/hooks/useOrderBootstrap.js` (calcula `pendingLunch`, `pendingDinner`, `hasOrderToday`)
- Validación al enviar:
  - `src/utils/order/orderValidation.js` (mensaje y bloqueo)

---

## Parcial — Base de datos (RLS/policies)

El repo no versiona policies RLS para esta regla. Si querés enforcement real en DB, tenés que implementarlo en Supabase.

### Ejemplo (conceptual, no provisto por el repo)

Una policy de INSERT podría:

- Verificar `auth.uid() = user_id`
- Rechazar el INSERT si ya existe un pedido del usuario con estado activo para la fecha/servicio objetivo.

> Nota: el detalle exacto depende de tu esquema (cómo modelás “fecha objetivo”, `service`, etc.).

---

## 🧪 Cómo probar

1) Crea un pedido de almuerzo hoy que quede en estado activo.  
2) Intenta crear otro de almuerzo → debería bloquearse.  
3) Repite con cena si el usuario tiene la feature habilitada.  

---

## 🆘 Troubleshooting

### “Me deja crear más de un pedido”

- Verifica que el pedido anterior esté en `pending|preparing|ready` (`preparing/ready` se contemplan por compatibilidad legacy).
- Verifica que sea del mismo día y mismo servicio (almuerzo/cena).
- Si querés enforcement “a prueba de bypass”, implementalo en DB (Supabase RLS).

---

**Última actualización de este doc:** 2026-04-16
