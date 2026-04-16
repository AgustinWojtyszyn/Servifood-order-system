# 🔧 Pasos para Solucionar "Database error saving new user"

## Estado del documento

- No implementado (repo): este repo no incluye `supabase-setup-complete.sql`.
- Ejemplo: la solución se aplica en Supabase creando la función + trigger manualmente desde SQL Editor.

## ⚡ SOLUCIÓN RÁPIDA (5 minutos)

### Paso 1: Ir a Supabase SQL Editor
1. Abre https://supabase.com
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **SQL Editor**

### Paso 2: Crear la función + trigger (Ejemplo)

Este repo no trae un “setup completo” en un archivo SQL único. La forma segura es:

1. Crear/actualizar la función `public.handle_new_user()`
2. Crear el trigger `on_auth_user_created` que la ejecuta

Podés usar como referencia el SQL incluido en `docs/SOLUCION_ERROR_REGISTRO.md` (sección “Qué hace el trigger”).

### Paso 3: Verificar que Funcionó
Ejecuta esta consulta en el SQL Editor:

```sql
-- Verifica que el trigger existe
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

**Resultado esperado:**
```
tgname                  | tgenabled
------------------------|----------
on_auth_user_created    | O
```

Si ves esto, ¡el trigger está instalado! ✅

---

## 📋 DIAGNÓSTICO COMPLETO

### Verificación 1: ¿Existen las Tablas?

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'orders', 'menu_items');
```

**Deberías ver:**
- `users`
- `orders`
- `menu_items`

---

### Verificación 2: ¿Está Habilitado RLS?

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('users', 'orders', 'menu_items');
```

**Resultado esperado:** `rowsecurity = true` para todas las tablas

---

### Verificación 3: ¿Existen las Políticas?

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Deberías ver políticas para:**
- `users` (al menos 6 políticas)
- `orders` (al menos 5 políticas)
- `menu_items` (al menos 2 políticas)

---

### Verificación 4: ¿Existe la Función?

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

**Deberías ver:** La función `handle_new_user` con su código

---

## 🧪 PROBAR LA SOLUCIÓN

### Opción A: Registrar Usuario Nuevo (Recomendado)

1. **Cierra sesión** si estás logueado
2. Ve a la página de registro
3. Crea un nuevo usuario con:
   - Email: `test@test.com`
   - Nombre: `Usuario Prueba`
   - Contraseña: `test123`
4. ✅ **Debería funcionar sin errores**

### Opción B: Verificar Usuarios Existentes

```sql
-- Ver cuántos usuarios hay en auth.users
SELECT COUNT(*) as total_auth FROM auth.users;

-- Ver cuántos usuarios hay en public.users
SELECT COUNT(*) as total_public FROM public.users;

-- Deberían ser iguales (o public.users puede tener menos si el trigger no estaba)
```

---

## ⚠️ PROBLEMAS COMUNES

### Problema 1: "Trigger ya existe"

**Error:** `ERROR: trigger "on_auth_user_created" already exists`

**Solución:** Ejecuta primero:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Luego vuelve a ejecutar el script completo.

---

### Problema 2: "Permission denied"

**Error:** `ERROR: permission denied for schema auth`

**Solución:** Asegúrate de estar usando el **SQL Editor de Supabase**, NO otra herramienta. El SQL Editor tiene permisos especiales.

---

### Problema 3: "Function already exists"

**Error:** `ERROR: function "handle_new_user" already exists`

**Solución:** La función ya existe, el script usa `CREATE OR REPLACE`, así que esto NO debería pasar. Si pasa, ejecuta:

```sql
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

---

### Problema 4: Usuarios Anteriores NO Aparecen

Si registraste usuarios ANTES de crear el trigger, necesitas insertarlos manualmente:

```sql
-- Ver usuarios que están en auth.users pero NO en public.users
SELECT 
  au.id, 
  au.email, 
  au.raw_user_meta_data->>'full_name' as full_name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Insertar esos usuarios en public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

---

## 🔍 DEBUGGING AVANZADO

### Ver Logs de Supabase en Tiempo Real

1. En Supabase, ve a **Logs** → **Postgres Logs**
2. Intenta registrar un usuario
3. Busca errores con palabras clave:
   - `trigger`
   - `handle_new_user`
   - `insert`
   - `users`

### Probar el Trigger Manualmente

```sql
-- Simula la inserción de un usuario (NO LO USES EN PRODUCCIÓN)
-- Solo para testing
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Inserta en auth.users (simulado)
  -- El trigger debería insertar en public.users automáticamente
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (test_user_id, 'test@manual.com', 'Test Manual', 'user');
  
  RAISE NOTICE 'Usuario de prueba creado: %', test_user_id;
END $$;
```

---

## ✅ CHECKLIST FINAL

Marca con ✅ lo que ya verificaste:

- [ ] Creé/actualicé manualmente la función + trigger (no hay script versionado en este repo)
- [ ] El trigger `on_auth_user_created` existe
- [ ] La función `handle_new_user` existe
- [ ] Las tablas `users`, `orders`, `menu_items` existen
- [ ] RLS está habilitado en todas las tablas
- [ ] Las políticas están creadas
- [ ] Probé registrar un nuevo usuario
- [ ] El registro funcionó sin errores ✅
- [ ] El usuario aparece en `public.users`
- [ ] Puedo iniciar sesión con el nuevo usuario

---

## 🆘 SI NADA FUNCIONA

### Última Opción: Recrear TODO

⚠️ **ADVERTENCIA:** Esto eliminará TODOS los datos (usuarios y pedidos)

```sql
-- 1. Eliminar tablas
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Eliminar función y trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Volver a crear la función + trigger manualmente (ver docs/SOLUCION_ERROR_REGISTRO.md)
```

---

## 📞 CONTACTO

Si después de seguir TODOS estos pasos el error persiste:

1. **Copia el error exacto** que aparece en la consola del navegador (F12 → Console)
2. **Copia los logs** de Supabase (Logs → Postgres Logs)
3. **Verifica** que las variables de entorno estén correctas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 🎯 RESULTADO ESPERADO

Después de aplicar la solución correctamente:

✅ Registrar usuario → **Funciona sin errores**
✅ Usuario en `auth.users` → **Creado automáticamente**
✅ Usuario en `public.users` → **Creado por el trigger**
✅ Iniciar sesión → **Funciona perfectamente**
✅ Ver perfil → **Muestra nombre completo**
✅ Crear pedidos → **Sin problemas**

---

**¡Buena suerte! 🚀**
