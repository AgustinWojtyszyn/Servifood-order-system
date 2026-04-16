# 🔔 Configuración del Sistema de Notificaciones

## ⚠️ Estado Actual

- **No implementado (DB/UI):** no hay tabla `notifications` versionada en el repo ni UI de campana.
- **Implementado (hardening):** el código evita fallar cuando la tabla `notifications` no existe (acciones relacionadas quedan en “no-op” o comentadas).

## 📋 Síntomas

Si intentas:
- Eliminar un usuario (flujo admin)
- Ejecutar código que intente borrar notificaciones

Podrías haber visto el error:
```
Error: Could not find the table 'public.notifications' in the schema cache
```

## ✅ Solución Implementada

Se desactivó/evitó el acceso directo a `notifications` para que la app funcione aunque la tabla no exista:

- `db.deleteAllNotifications()` (en `src/supabaseClient.js`) retorna `{ data: null, error: null }` sin tocar DB.
- En servicios de usuarios hay bloques comentados/guardados donde antes se intentaba borrar `notifications`.

Esto permite que la aplicación funcione normalmente sin el sistema de notificaciones.

## 🚀 Cómo Habilitar las Notificaciones (Opcional)

### Estado: Ejemplo (no hay script en este repo)

En este repo **no existe** un archivo `add-notifications.sql` ni una migración equivalente.

Si querés implementar notificaciones, necesitás (fuera de este repo):

1. Crear tabla `notifications` + índices.
2. Definir RLS/policies para que cada usuario lea/actualice sus notificaciones.
3. Definir cómo se crean (trigger en `orders` o job/función server-side).
4. Implementar UI (campana) y suscripciones (realtime) si aplica.

### Paso 2: Conectar el código (Ejemplo)

- Reemplazar los “no-op”/bloques comentados por operaciones reales contra `notifications`.
- Agregar/crear un componente de UI (hoy no existe uno en `src/components/`).

### Paso 3: Reiniciar

```bash
npm run dev
```

## 📦 Características del Sistema de Notificaciones

Estado: **No implementado** en el repo actual.

## 🔍 Verificar que Funciona

Estado: **Ejemplo** (depende de implementación externa).

## 💡 Notas Importantes

- **Sin notificaciones**: La app funciona perfectamente sin este sistema
- **Seguridad/RLS**: no está versionado en este repo; depende de Supabase.

## 🆘 Problemas Comunes

### "Error creating notification"
- Implementá la tabla/policies y verificá RLS en Supabase.

### "No recibo notificaciones"
- Asegurate de tener UI + suscripción + un mecanismo de creación de notificaciones.

### "Notificaciones duplicadas"
- Depende de la lógica que implementes (trigger/job).

---

**Creado**: 2025-11-11  
**Versión**: 1.0  
**Estado**: No implementado (DB/UI) + hardening implementado
