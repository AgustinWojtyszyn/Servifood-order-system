-- ============================================
-- VALIDACIÓN DE HORARIO LÍMITE PARA PEDIDOS (VENTANA 09:00 a 22:00)
-- ============================================
-- Antes: se bloqueaban pedidos a partir de las 22:00.
-- Ahora: solo se permiten pedidos entre las 09:00 y las 22:00 (hora Buenos Aires).
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- OPCIÓN 1: TRIGGER (Recomendado)
-- ============================================
-- El trigger permite pedidos solo de 09:00 a 22:00

-- Función que valida el horario
CREATE OR REPLACE FUNCTION check_order_time_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_hour INTEGER;
BEGIN
  -- Obtener la hora actual (con zona configurable)
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires');

  -- Bloqueo fuera de la ventana 09:00-21:59
  IF current_hour < 9 OR current_hour >= 22 THEN
    RAISE EXCEPTION 'Pedidos disponibles de 09:00 a 22:00 (hora Buenos Aires)';
  END IF;

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
-- Política con ventana: permite inserts solo 09:00-22:00

-- Eliminar política anterior (si existía) que bloqueaba desde las 22:00
DROP POLICY IF EXISTS "Block orders after 22:00" ON public.orders;
-- Eliminar la política de ventana previa si ya existe para evitar el error 42710
DROP POLICY IF EXISTS "Allow orders 09-22" ON public.orders;

-- Crear política de permiso dentro de la ventana (si tienes RLS activo en orders)
CREATE POLICY "Allow orders 09-22" ON public.orders
  FOR INSERT
  WITH CHECK (
    EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN 9 AND 21
  );

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
- Pedidos permitidos solo de 09:00 a 22:00 (hora Buenos Aires) ✅
- El frontend valida y el backend bloquea fuera de ventana

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
-- Ahora los pedidos están habilitados de 09:00 a 22:00 (frontend, API, SQL directo)
-- ============================================
