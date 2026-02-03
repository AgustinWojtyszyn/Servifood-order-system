# 🕐 Horario de pedidos 24/7

## Estado actual

- ✅ No hay límite horario: los pedidos se aceptan las 24 horas.
- ✅ Frontend y backend ya no bloquean por hora.
- ✅ Script vigente: `add-time-restriction-validation.sql` crea un trigger sin restricción y una política RLS permisiva.

## ¿Por qué cambió?

Antes se bloqueaba a las 22:00, pero ahora se requiere operación continua. Se dejó el trigger/política para poder revertir rápidamente si se necesita otro horario.

### Cómo funciona hoy

```
1️⃣ Frontend (OrderForm.jsx)     → sin validación de horario
2️⃣ Política RLS (Supabase)      → `Allow orders 24/7` (USING/WITH CHECK true)
3️⃣ Trigger (PostgreSQL)         → retorna NEW sin chequear hora
```

## 🚀 Cómo Aplicar

### Paso 1: Abrir Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Entra a tu proyecto
3. Ve a **SQL Editor**

### Paso 2: Ejecutar el Script

1. Abre `add-time-restriction-validation.sql`
2. Copia **TODO** el contenido
3. Pega en SQL Editor
4. Click en **Run**

### Paso 3: Verificar

Deberías ver en la consola:
- ✅ Trigger creado: `enforce_order_time_limit`
- ✅ Política creada: `Allow orders 24/7`

## 🎯 Funcionamiento

### Operación actual
```
Usuario crea pedido → ✅ PERMITIDO → Pedido creado exitosamente (cualquier hora)
```

## 🌍 Configurar Zona Horaria

Por defecto usa: `America/Argentina/Buenos_Aires`

Para cambiar, edita la línea en el script:
```sql
-- Cambiar esto:
AT TIME ZONE 'America/Argentina/Buenos_Aires'

-- Por tu zona horaria, ejemplo:
AT TIME ZONE 'America/Mexico_City'
AT TIME ZONE 'America/Santiago'
AT TIME ZONE 'Europe/Madrid'
```

### Ver todas las zonas disponibles:
```sql
SELECT name FROM pg_timezone_names WHERE name LIKE 'America%';
```

## 🧪 Probar que Funciona

### Prueba 1: App (cualquier hora)
Intenta crear un pedido desde la app:
- ✅ Debería funcionar normalmente

### Prueba 2: Usando API directamente
Intenta insertar directamente en SQL Editor:
```sql
INSERT INTO public.orders (user_id, location, customer_name, customer_email, items, total_items, status)
VALUES (auth.uid(), 'Los Berros', 'Test', 'test@example.com', '[]'::jsonb, 0, 'pending');
```
- ✅ Debería funcionar (sin restricciones de horario)

## 🔧 Volver a poner límite (si se necesita)

1. Edita la función `check_order_time_limit` en `add-time-restriction-validation.sql` para comparar la hora y lanzar excepción.
2. Cambia la política `Allow orders 24/7` por otra con `WITH CHECK (EXTRACT(HOUR ...) < HORA_LIMITE)`.
3. Reejecuta el script completo en SQL Editor.

## 🛠️ Mantenimiento

### Deshabilitar temporalmente:
```sql
DROP TRIGGER enforce_order_time_limit ON public.orders;
DROP POLICY "Allow orders 24/7" ON public.orders;
```

### Reactivar:
Vuelve a ejecutar el script completo.

### Ver si está activo:
```sql
-- Ver trigger
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'enforce_order_time_limit';

-- Ver política
SELECT policyname FROM pg_policies 
WHERE policyname = 'Allow orders 24/7';
```

## ⚡ Rendimiento

- **Impacto**: Mínimo (< 1ms por pedido)
- **Solo afecta**: Operaciones INSERT en `orders`
- **No afecta**: Lectura de pedidos, updates, deletes

## 🐛 Solución de Problemas

### Error: "trigger already exists"
```sql
DROP TRIGGER IF EXISTS enforce_order_time_limit ON public.orders;
-- Luego vuelve a ejecutar el script
```

### Error: "policy already exists"
```sql
DROP POLICY IF EXISTS "Allow orders 24/7" ON public.orders;
-- Luego vuelve a ejecutar el script
```

### Pedidos se bloquean a hora incorrecta
- Verifica la zona horaria configurada
- Compara con: `SELECT NOW() AT TIME ZONE 'TU_ZONA_HORARIA';`

## 📊 Comparación Antes/Después

### ANTES ❌
- Validación solo en frontend
- Fácil de bypasear
- Usuarios técnicos podían engañar al sistema
- Sin protección real

### DESPUÉS ✅
- Validación en backend (PostgreSQL)
- Imposible de bypasear
- Protección a nivel de base de datos
- Triple barrera de seguridad

## 💡 Notas Importantes

1. **Zona Horaria del Servidor:**
   - Supabase usa UTC por defecto
   - El script convierte a tu zona horaria local
   - Verifica que sea la correcta

2. **Mensaje de Error:**
   - El usuario verá el error del trigger
   - Es claro y descriptivo
   - Puedes personalizar el mensaje en el script

3. **Excepciones:**
   - No hay excepciones por rol
   - Ni siquiera los admins pueden crear pedidos después de las 22:00
   - Si necesitas excepciones, modifica el trigger

4. **Logs:**
   - Supabase registra todos los errores
   - Puedes ver intentos de crear pedidos fuera de horario
   - Ve a Logs > Database en Supabase Dashboard

---

**Creado**: 2025-11-11  
**Versión**: 1.0  
**Estado**: Listo para aplicar  
**Prioridad**: Alta - Seguridad crítica
