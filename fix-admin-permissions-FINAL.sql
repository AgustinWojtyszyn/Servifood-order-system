-- ========================================
-- Script COMPLETO para dar permisos a TODOS los administradores
-- Ejecutar TODO en Supabase SQL Editor
-- ========================================

-- 0. ELIMINAR COLUMNA is_superadmin SI EXISTE (ya no se usa)
ALTER TABLE public.users DROP COLUMN IF EXISTS is_superadmin;

-- 1. Crear función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. POLÍTICAS PARA MENU_ITEMS
-- ========================================

-- Eliminar políticas antiguas (incluyendo las de superadmin)
DROP POLICY IF EXISTS "Anyone can view menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "All admins can insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "All admins can update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "All admins can delete menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Superadmins can insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Superadmins can update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Superadmins can delete menu_items" ON public.menu_items;

-- Crear nuevas políticas (todos los admin tienen permisos completos)
CREATE POLICY "Anyone can view menu_items"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All admins can insert menu_items"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "All admins can update menu_items"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All admins can delete menu_items"
  ON public.menu_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- ========================================
-- 3. POLÍTICAS PARA USERS
-- ========================================

-- Eliminar políticas antiguas (incluyendo las de superadmin)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Everyone can view all users" ON public.users;
DROP POLICY IF EXISTS "All admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Superadmins can delete users" ON public.users;
DROP POLICY IF EXISTS "Superadmins can update user roles" ON public.users;

-- Crear nuevas políticas
CREATE POLICY "Everyone can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "All admins can update any user"
  ON public.users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ========================================
-- 4. POLÍTICAS PARA ORDERS
-- ========================================

-- Eliminar políticas antiguas (incluyendo las de superadmin)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.orders;
DROP POLICY IF EXISTS "All admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;
DROP POLICY IF EXISTS "All admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Superadmins can delete any order" ON public.orders;

-- Crear nuevas políticas
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "All admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "All admins can update any order"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ========================================
-- 5. POLÍTICAS PARA CUSTOM_OPTIONS
-- ========================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Everyone can view custom options" ON public.custom_options;
DROP POLICY IF EXISTS "Only admins can modify custom options" ON public.custom_options;

-- Crear nuevas políticas
CREATE POLICY "Everyone can view custom options"
  ON public.custom_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify custom options"
  ON public.custom_options FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ========================================
-- 6. VERIFICAR QUE RLS ESTÁ HABILITADO
-- ========================================

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_options ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. MENSAJE DE CONFIRMACIÓN
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ POLÍTICAS ACTUALIZADAS CORRECTAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Columna is_superadmin ELIMINADA (ya no se usa)';
  RAISE NOTICE '✓ Tabla: menu_items - TODOS los admins tienen permisos completos';
  RAISE NOTICE '✓ Tabla: users - TODOS los admins pueden editar roles';
  RAISE NOTICE '✓ Tabla: orders - TODOS los admins pueden ver y editar todos los pedidos';
  RAISE NOTICE '✓ Tabla: custom_options - TODOS los admins pueden crear/editar/eliminar opciones';
  RAISE NOTICE '✓ TODOS los administradores tienen EXACTAMENTE los mismos permisos';
  RAISE NOTICE '✓ NO HAY diferencia entre administradores - TODOS son iguales';
  RAISE NOTICE '========================================';
END $$;
