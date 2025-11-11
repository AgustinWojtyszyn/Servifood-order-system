-- ============================================
-- SINCRONIZAR NOMBRES DE USUARIOS
-- ============================================
-- Este script sincroniza los nombres completos desde auth.users a public.users

-- Actualizar nombres desde auth.users
UPDATE public.users u
SET full_name = COALESCE(
  au.raw_user_meta_data->>'full_name',
  u.email
)
FROM auth.users au
WHERE u.id = au.id
AND (u.full_name IS NULL OR u.full_name = '');

-- Verificar resultado
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  au.raw_user_meta_data->>'full_name' as "Nombre en Auth"
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;

-- Si hay usuarios sin nombre, usar el email como respaldo
UPDATE public.users
SET full_name = email
WHERE full_name IS NULL OR full_name = '';

-- Verificación final
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as con_nombre,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sin_nombre
FROM public.users;
