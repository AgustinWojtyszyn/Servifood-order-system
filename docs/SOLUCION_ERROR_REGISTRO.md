# Solución al Error: "Database error saving new user"

## 🔴 Problema

Al registrar un nuevo usuario aparece el error: **"Database error saving new user"**

## ❓ Causa

Este error ocurre porque **falta el trigger automático** en Supabase que debe insertar el usuario en la tabla `public.users` cuando se registra en `auth.users`.

Cuando un usuario se registra:
1. ✅ Supabase crea el usuario en `auth.users` (tabla interna de autenticación)
2. ❌ **NO** se crea automáticamente en `public.users` (nuestra tabla personalizada)
3. ❌ Cuando la app intenta acceder a `public.users`, no encuentra el usuario
4. ❌ Resultado: Error "Database error saving new user"

## ✅ Solución

Debes ejecutar el script SQL completo en Supabase que crea un **trigger automático** para insertar usuarios.

### Pasos para Solucionar:

#### 1. Ir a Supabase
- Abre tu proyecto en [supabase.com](https://supabase.com)
- Ve a **SQL Editor** (en el menú lateral izquierdo)

#### 2. Ejecutar el Script
- Abre el archivo `supabase-setup-complete.sql` de este proyecto
- Copia TODO el contenido
- Pégalo en el SQL Editor de Supabase
- Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)

#### 3. Verificar que Funcionó
Ejecuta esta consulta para verificar que el trigger se creó:

```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

Deberías ver:
```
tgname                  | tgenabled
------------------------|----------
on_auth_user_created    | O
```

## 🔧 Qué Hace el Trigger

El trigger ejecuta automáticamente esta función cada vez que un nuevo usuario se registra:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Flujo después del trigger:
1. Usuario se registra → `auth.users` (automático de Supabase)
2. **TRIGGER se ejecuta** → Inserta en `public.users` (nuestro trigger)
3. Usuario puede usar la app sin errores ✅

## 🧪 Probar la Solución

Después de ejecutar el script:

1. **Cerrar sesión** si estás logueado
2. **Intentar registrar un nuevo usuario**
3. ✅ El registro debería funcionar correctamente
4. ✅ El usuario debería aparecer en la tabla `public.users`

### Verificar Usuarios Creados

```sql
SELECT id, email, full_name, role, created_at 
FROM public.users
ORDER BY created_at DESC;
```

## ⚠️ Usuarios Registrados ANTES del Trigger

Si ya tienes usuarios que se registraron antes de crear el trigger, **NO** estarán en `public.users`. Tienes dos opciones:

### Opción 1: Insertar Manualmente (Recomendado si hay pocos usuarios)

```sql
-- Ver usuarios en auth.users que NO están en public.users
SELECT au.id, au.email, au.raw_user_meta_data->>'full_name' as full_name
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

### Opción 2: Pedir a los Usuarios que se Registren Nuevamente

Si prefieres empezar de cero:

```sql
-- ⚠️ CUIDADO: Esto eliminará TODOS los usuarios y pedidos
TRUNCATE auth.users CASCADE;
```

## 📝 Notas Importantes

1. **El trigger SOLO funciona para nuevos registros** - Usuarios anteriores necesitan insertarse manualmente
2. **El trigger es permanente** - Seguirá funcionando automáticamente para todos los futuros registros
3. **Seguridad:** El trigger usa `SECURITY DEFINER` para tener permisos de insertar en `public.users`

## 🆘 Si el Error Persiste

Verifica estos puntos:

### 1. Verificar que RLS esté configurado correctamente

```sql
-- Verificar políticas de users
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'users';
```

### 2. Verificar permisos de la tabla

```sql
-- Debería mostrar que public.users tiene RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
```

### 3. Ver errores en tiempo real

En Supabase:
- Ve a **Logs** → **Postgres Logs**
- Intenta registrar un usuario
- Busca errores relacionados con "users" o "trigger"

## 🔗 Archivos Relacionados

- `supabase-setup-complete.sql` - Script completo para ejecutar en Supabase
- `README.md` - Documentación general del proyecto
- `COMO_CREAR_ADMIN.md` - Cómo crear el primer usuario administrador

## ✅ Resultado Esperado

Después de aplicar la solución:
- ✅ Usuarios se registran sin errores
- ✅ Se crean automáticamente en `public.users`
- ✅ Pueden iniciar sesión inmediatamente
- ✅ Aparecen en el panel de administración
- ✅ Pueden crear pedidos sin problemas

---

**¿Necesitas más ayuda?** Revisa los logs de Supabase o contacta a soporte.
