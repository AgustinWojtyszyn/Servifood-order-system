-- ============================================
-- AGREGAR ROL DE SUPERADMIN
-- ============================================
-- Este script agrega la funcionalidad de superadmin al sistema

-- 1. Agregar columna is_superadmin a la tabla users si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='is_superadmin'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Establecer el primer usuario admin como superadmin
-- IMPORTANTE: Cambia este email por el tuyo
UPDATE public.users 
SET is_superadmin = TRUE 
WHERE email = 'tu-email@ejemplo.com' -- CAMBIAR ESTE EMAIL
AND role = 'admin';

-- 3. Crear política RLS para que superadmins puedan eliminar usuarios
DROP POLICY IF EXISTS "Superadmins can delete users" ON public.users;
CREATE POLICY "Superadmins can delete users"
ON public.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS admin_user
    WHERE admin_user.id = auth.uid()
    AND admin_user.is_superadmin = TRUE
  )
);

-- 4. Crear política RLS para que superadmins puedan actualizar roles
DROP POLICY IF EXISTS "Superadmins can update user roles" ON public.users;
CREATE POLICY "Superadmins can update user roles"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS admin_user
    WHERE admin_user.id = auth.uid()
    AND admin_user.is_superadmin = TRUE
  )
);

-- 5. Crear política RLS para que superadmins puedan eliminar cualquier pedido
DROP POLICY IF EXISTS "Superadmins can delete any order" ON public.orders;
CREATE POLICY "Superadmins can delete any order"
ON public.orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_superadmin = TRUE
  )
);

-- 6. Verificar la configuración
SELECT 
    email,
    role,
    is_superadmin,
    created_at
FROM public.users
WHERE is_superadmin = TRUE OR role = 'admin'
ORDER BY created_at;

-- Notas:
-- 1. Solo un superadmin puede quitar el rol de admin a otros usuarios
-- 2. Solo un superadmin puede eliminar usuarios
-- 3. Solo un superadmin puede eliminar pedidos (limpiar dashboard)
-- 4. Los superadmins tienen todos los permisos de admin + permisos especiales
