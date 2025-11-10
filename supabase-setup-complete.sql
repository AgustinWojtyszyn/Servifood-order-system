-- ============================================
-- CONFIGURACIÓN COMPLETA DE SUPABASE
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- 1. CREAR TABLAS
-- ============================================

-- Tabla de usuarios (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL,
  comments TEXT,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'delivered', 'cancelled')),
  total_items INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de items del menú
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. CREAR FUNCIÓN Y TRIGGER PARA AUTO-INSERTAR USUARIOS
-- ============================================
-- Esta función se ejecuta automáticamente cuando un usuario se registra

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

-- Eliminar trigger si existe (para poder recrearlo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que ejecuta la función cuando se registra un nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their profile" ON public.users;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update status of their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

DROP POLICY IF EXISTS "Everyone can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Only admins can modify menu items" ON public.menu_items;

-- 5. CREAR POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Políticas para users
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON public.orders
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update status of their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para menu_items
CREATE POLICY "Everyone can view menu items" ON public.menu_items
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify menu items" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. INSERTAR ITEMS DE MENÚ POR DEFECTO (si no existen)
-- ============================================

INSERT INTO public.menu_items (name, description)
SELECT * FROM (VALUES
  ('Plato Principal 1', 'Delicioso plato principal'),
  ('Plato Principal 2', 'Otro plato delicioso'),
  ('Plato Principal 3', 'Plato especial del día'),
  ('Plato Principal 4', 'Plato vegetariano'),
  ('Plato Principal 5', 'Plato de la casa'),
  ('Ensalada César', 'Fresca ensalada con aderezo César')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items LIMIT 1);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verifica que el trigger se haya creado correctamente
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Verifica las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'orders', 'menu_items');

-- ============================================
-- ¡LISTO!
-- Ahora los nuevos usuarios se insertarán automáticamente
-- en la tabla public.users cuando se registren
-- ============================================
