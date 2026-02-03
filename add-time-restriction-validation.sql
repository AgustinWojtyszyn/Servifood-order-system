-- ============================================
-- VALIDACIÓN DE HORARIO LÍMITE PARA PEDIDOS (DESHABILITADA)
-- ============================================
-- Antes: se bloqueaban pedidos a partir de las 22:00.
-- Ahora: se permiten pedidos 24/7 (sin bloqueo horario).
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- OPCIÓN 1: TRIGGER (Recomendado)
-- ============================================
-- El trigger permite todos los pedidos (24hs)

-- Función que valida el horario
CREATE OR REPLACE FUNCTION check_order_time_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_hour INTEGER;
BEGIN
  -- Obtener la hora actual (con zona configurable)
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires');

  -- Sin límite horario: siempre permitir (se deja la variable para futuros cambios)
  
  -- Si pasa la validación, permitir el INSERT
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS enforce_order_time_limit ON public.orders;

-- Crear trigger que se ejecuta ANTES de insertar
CREATE TRIGGER enforce_order_time_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION check_order_time_limit();

-- ============================================
-- OPCIÓN 2: POLÍTICA RLS (Alternativa)
-- ============================================
-- Política abierta: permite inserts las 24 horas

-- Eliminar política anterior (si existía) que bloqueaba desde las 22:00
DROP POLICY IF EXISTS "Block orders after 22:00" ON public.orders;

-- Crear política explícita de permiso 24/7 (si tienes RLS activo en orders)
CREATE POLICY "Allow orders 24/7" ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver el trigger creado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'enforce_order_time_limit';

-- Ver las políticas de orders
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- ============================================
-- PRUEBAS
-- ============================================

/*
PARA PROBAR LA VALIDACIÓN:

1. Ejecuta un INSERT simple (debería funcionar a cualquier hora):
   INSERT INTO public.orders (user_id, location, customer_name, customer_email, items, total_items, status)
   VALUES (auth.uid(), 'Los Berros', 'Test User', 'test@example.com', '[]'::jsonb, 0, 'pending');

2. Confirma que NO hay errores por horario. Si ves un error horario, revisa si existen políticas/triggers viejos sin dropear.

3. Para reintroducir un límite horario en el futuro, cambia la lógica del trigger o ajusta la política RLS.
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
⚙️ ZONA HORARIA:
- El script usa 'America/Argentina/Buenos_Aires'
- Ajusta según tu ubicación:
  * América/México: 'America/Mexico_City'
  * América/Santiago: 'America/Santiago'
  * Europa/Madrid: 'Europe/Madrid'
  * Para ver zonas disponibles: SELECT * FROM pg_timezone_names;

🔐 SEGURIDAD:
- El TRIGGER se ejecuta en el servidor (backend)
- NO puede ser bypaseado desde el frontend
- Se ejecuta ANTES del INSERT (BEFORE INSERT)
- Incluso si alguien usa la API directamente, fallará

🎯 COMPORTAMIENTO:
- Pedidos permitidos 24/7 ✅
- El frontend puede seguir validando, pero no hay bloqueo horario en la base

📝 ORDEN DE VALIDACIÓN:
1. Frontend valida (OrderForm.jsx) - Primera barrera
2. Política RLS valida - Segunda barrera
3. Trigger valida - Tercera barrera (más robusta)

⚡ RENDIMIENTO:
- El trigger es muy rápido (solo compara hora)
- No afecta pedidos antes de las 22:00
- Solo se ejecuta en INSERT, no en SELECT/UPDATE

🔄 MANTENIMIENTO:
- Para volver a poner límite horario, edita la función `check_order_time_limit` o la política `Allow orders 24/7`.
- Para deshabilitar temporalmente: `DROP TRIGGER enforce_order_time_limit` y/o `DROP POLICY "Allow orders 24/7"`.
- Para ver si están activos: consulta `information_schema.triggers` y `pg_policies`.
*/

-- ============================================
-- ¡COMPLETADO!
-- Ahora los pedidos están habilitados 24/7 (frontend, API, SQL directo)
-- ============================================
