-- ============================================
-- GENERACIÓN DE USUARIOS DE PRUEBA PARA SERVIFOOD
-- ============================================
-- Este script crea usuarios de prueba en auth.users y public.users
-- IMPORTANTE: Ejecutar en el SQL Editor de Supabase
-- ============================================

-- NOTA: Supabase no permite insertar directamente en auth.users via SQL
-- por razones de seguridad. Estas son las alternativas:

-- OPCIÓN 1: Crear usuarios mediante la API de Supabase Admin
-- (Usar el script Node.js create-test-users.js incluido)

-- OPCIÓN 2: Si tienes acceso al dashboard de Supabase:
-- Dashboard > Authentication > Users > Invite user

-- OPCIÓN 3: Insertar solo en public.users (para testing de UI sin auth real)
-- ============================================

-- Primero, vamos a crear una función helper para generar datos realistas
CREATE OR REPLACE FUNCTION generate_test_users(num_users INTEGER DEFAULT 50)
RETURNS TABLE (
  email TEXT,
  full_name TEXT,
  role TEXT,
  temp_password TEXT
) AS $$
DECLARE
  nombres TEXT[] := ARRAY[
    'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Laura',
    'Miguel', 'Sofia', 'Diego', 'Elena', 'Javier', 'Isabel', 'Fernando',
    'Patricia', 'Roberto', 'Monica', 'Antonio', 'Beatriz', 'Jorge', 'Lucia',
    'Francisco', 'Raquel', 'Manuel', 'Cristina', 'Ricardo', 'Sandra',
    'Alejandro', 'Daniela', 'Pablo', 'Gabriela', 'Sergio', 'Valeria',
    'Andres', 'Carolina', 'Marcos', 'Andrea', 'Alberto', 'Natalia'
  ];
  
  apellidos TEXT[] := ARRAY[
    'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez',
    'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
    'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz',
    'Jiménez', 'Hernández', 'Ruiz', 'Mendoza', 'Castro', 'Vargas'
  ];
  
  i INTEGER;
  nombre_completo TEXT;
  usuario_email TEXT;
  temp_pass TEXT;
  usuario_rol TEXT;
BEGIN
  FOR i IN 1..num_users LOOP
    -- Generar nombre completo
    nombre_completo := nombres[1 + floor(random() * array_length(nombres, 1))] || ' ' ||
                       apellidos[1 + floor(random() * array_length(apellidos, 1))];
    
    -- Generar email
    usuario_email := 'test.user' || i || '@servifood.test';
    
    -- Password temporal (todos tendrán la misma para testing)
    temp_pass := 'Test123!@#';
    
    -- 10% serán admins, 90% usuarios normales
    IF random() < 0.1 THEN
      usuario_rol := 'admin';
    ELSE
      usuario_rol := 'user';
    END IF;
    
    -- Retornar los datos
    RETURN QUERY SELECT usuario_email, nombre_completo, usuario_rol, temp_pass;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VER LOS DATOS QUE SE GENERARÍAN
-- ============================================
-- Ejecuta esto para ver los 50 usuarios que se crearían:

SELECT * FROM generate_test_users(50);

-- ============================================
-- EXPORTAR PARA USAR CON EL SCRIPT NODE.JS
-- ============================================
-- Copia el resultado de esta consulta y úsalo con create-test-users.js

SELECT 
  'test.user' || generate_series || '@servifood.test' as email,
  (ARRAY['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Laura',
         'Miguel', 'Sofia', 'Diego', 'Elena'])[1 + floor(random() * 12)] || ' ' ||
  (ARRAY['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez'])[1 + floor(random() * 6)] as full_name,
  CASE WHEN random() < 0.1 THEN 'admin' ELSE 'user' END as role,
  'Test123!@#' as password
FROM generate_series(1, 100);

-- ============================================
-- LIMPIAR USUARIOS DE PRUEBA (CUIDADO!)
-- ============================================
-- Solo ejecutar si quieres eliminar todos los usuarios de prueba
-- DESCOMENTAR SOLO SI ESTÁS SEGURO:

-- DELETE FROM auth.users WHERE email LIKE '%@servifood.test';
-- DELETE FROM public.users WHERE email LIKE '%@servifood.test';

-- ============================================
-- CREAR ALGUNOS USUARIOS ADMIN MANUALMENTE
-- ============================================
-- Usa esto si necesitas crear admins específicos:

-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES 
--   (gen_random_uuid(), 'admin1@servifood.test', 'Admin Principal', 'admin'),
--   (gen_random_uuid(), 'admin2@servifood.test', 'Admin Secundario', 'admin');

-- ============================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================

SELECT 
  role,
  COUNT(*) as cantidad,
  STRING_AGG(email, ', ' ORDER BY email LIMIT 5) as ejemplos
FROM public.users
WHERE email LIKE '%@servifood.test'
GROUP BY role;
