# 🔔 Configuración del Sistema de Notificaciones

## ⚠️ Estado Actual

El sistema de notificaciones está **deshabilitado temporalmente** porque la tabla `notifications` no existe en la base de datos.

## 📋 Síntomas

Si intentas:
- Eliminar un usuario
- Limpiar todas las notificaciones desde el panel SuperAdmin

Podrías haber visto el error:
```
Error: Could not find the table 'public.notifications' in the schema cache
```

## ✅ Solución Implementada

Se ha comentado temporalmente el código que accede a la tabla `notifications`:
- `deleteUser()` - Ya no intenta eliminar notificaciones del usuario
- `deleteAllNotifications()` - Retorna éxito sin hacer nada

Esto permite que la aplicación funcione normalmente sin el sistema de notificaciones.

## 🚀 Cómo Habilitar las Notificaciones (Opcional)

Si deseas activar el sistema completo de notificaciones:

### Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **SQL Editor**
3. Abre el archivo `add-notifications.sql` de este proyecto
4. Copia y pega todo el contenido en el editor SQL
5. Haz clic en **Run** (Ejecutar)

### Paso 2: Descomentar el Código

Abre `src/supabaseClient.js` y:

1. **En la función `deleteUser`** (línea ~110):
   ```javascript
   // Descomentar esto:
   /*
   const { error: notificationsError } = await supabase
     .from('notifications')
     .delete()
     .eq('user_id', userId)

   if (notificationsError) return { error: notificationsError }
   */
   ```

2. **En la función `deleteAllNotifications`** (línea ~138):
   ```javascript
   // Reemplazar esto:
   return { data: null, error: null }
   
   // Por esto:
   const { data, error } = await supabase
     .from('notifications')
     .delete()
     .neq('id', '00000000-0000-0000-0000-000000000000')
   return { data, error }
   ```

### Paso 3: Reiniciar el Servidor

```bash
npm run dev
```

## 📦 Características del Sistema de Notificaciones

Una vez habilitado, tendrás:

✨ **Notificaciones automáticas** cuando un pedido es entregado
🔔 **Campana de notificaciones** en el header
📱 **Notificaciones en tiempo real** mediante WebSocket
👀 **Contador de no leídas** visible para el usuario
✅ **Marcar como leídas** individual o todas a la vez

## 🔍 Verificar que Funciona

Después de habilitar:

1. Marca un pedido como "Completado" desde el Dashboard Admin
2. El usuario debería recibir una notificación automáticamente
3. La campana de notificaciones mostrará el contador actualizado

## 💡 Notas Importantes

- **Sin notificaciones**: La app funciona perfectamente sin este sistema
- **Seguridad**: Las políticas RLS aseguran que cada usuario solo ve sus notificaciones
- **Rendimiento**: Los índices optimizan las consultas
- **Triggers**: Se crean notificaciones automáticas al cambiar estado de pedidos

## 🆘 Problemas Comunes

### "Error creating notification"
- Verifica que ejecutaste el script SQL completo
- Revisa que las políticas RLS estén habilitadas

### "No recibo notificaciones"
- Asegúrate de haber descomentado el código
- Verifica que el trigger esté creado: `trigger_notify_order_delivered`

### "Notificaciones duplicadas"
- Esto es normal si cambias el estado varias veces
- El trigger solo notifica la primera vez que se marca como completado

---

**Creado**: 2025-11-11  
**Versión**: 1.0  
**Estado**: Sistema opcional - Funciona sin él
