# 🕐 Horario de pedidos (frontend)

## Estado actual

- **Implementado (frontend):** la app valida horario **09:00 a 22:00** (hora Buenos Aires) antes de crear pedidos.
- **Parcial:** el horario también se muestra en UI (banners/header).
- **No implementado (repo):** no hay script/migración versionada para enforcement en DB (no existe `add-time-restriction-validation.sql` en este repo).

## ¿Por qué cambió?

La versión anterior de este documento describía un esquema 24/7 con trigger/policy, pero esos archivos no están en el repo actual. Se actualiza para reflejar el comportamiento real: validación de horario en frontend.

### Cómo funciona hoy

```
1️⃣ Frontend (OrderForm)           → valida ventana 09:00–22:00
2️⃣ Base de datos (Supabase/RLS)   → no documentada/versionada en este repo
```

## Implementado — Dónde está en el código

- Constantes: `src/constants/orderRules.js`
  - `ORDER_START_HOUR = 9`
  - `ORDER_CUTOFF_HOUR = 22`
  - `ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'`
- Validación de submit (mensaje de error): `src/utils/order/orderValidation.js`
- Mensaje visual de horario:
  - `src/components/order-form/OrderHoursBanner.jsx`
  - `src/components/dashboard/DashboardHeader.jsx`

## 🎯 Funcionamiento

### Operación actual (frontend)
```
Usuario crea pedido dentro de horario → ✅ PERMITIDO
Usuario crea pedido fuera de horario → ❌ Bloqueado con mensaje “Pedidos disponibles de 09:00 a 22:00…”
```

## 🌍 Zona horaria

Por defecto usa: `America/Argentina/Buenos_Aires` (ver `ORDER_TIMEZONE` en `src/constants/orderRules.js`).

## 🔧 Cambiar el horario (cómo hacerlo de forma segura)

1) Ajustar `ORDER_START_HOUR`, `ORDER_CUTOFF_HOUR` y/o `ORDER_TIMEZONE` en `src/constants/orderRules.js`.  
2) Verificar que el mensaje/UI de horario quede consistente (banner/header).  
3) (Opcional) Implementar enforcement en DB en Supabase (trigger/RLS) si necesitás que no se pueda bypassear. **Estado: Ejemplo** (no está versionado en este repo).

## 🛠️ Mantenimiento

Estado: **No aplica** (no hay scripts de DB en el repo).

## ⚡ Rendimiento

La validación de frontend es O(1) por submit y no afecta lecturas.

## 🐛 Solución de Problemas

### Pedidos se bloquean a hora incorrecta
- Verifica la zona horaria configurada
- Compara con: `SELECT NOW() AT TIME ZONE 'TU_ZONA_HORARIA';`

## 📊 Comparación Antes/Después

Estado: **Ejemplo**. Este repo solo garantiza validación en frontend.

## 💡 Notas Importantes

1) Esta validación es de frontend; un usuario técnico podría intentar bypassearla si no hay enforcement en DB.  
2) El horario objetivo se define por `ORDER_TIMEZONE`; si usuarios están en otra zona horaria, el horario mostrado/esperado debe quedar claro.  
3) Si necesitás excepciones por rol o reglas más estrictas, implementá enforcement en Supabase (RLS/trigger) y versionalo en `supabase/migrations/`.  

---

**Creado**: 2025-11-11  
**Versión**: 1.0  
**Estado**: Actualizado a “enforcement frontend” (sin scripts DB en repo)
