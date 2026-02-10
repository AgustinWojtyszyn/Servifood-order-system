-- ============================================
-- PERSONAS UNIFICADAS (GRUPOS + USUARIOS SUELTOS)
-- ============================================
-- Ejecutar en Supabase SQL Editor.
-- No elimina datos ni modifica auth.users/orders.

-- Importante: si la view ya existía con tipos distintos (ej. person_id uuid),
-- CREATE OR REPLACE VIEW no puede cambiar el tipo de columna.
-- Por eso se eliminan y recrean solo las views.
DROP VIEW IF EXISTS public.orders_count_by_person;
DROP VIEW IF EXISTS public.orders_with_person_key;
DROP VIEW IF EXISTS public.admin_people_unified;

CREATE OR REPLACE VIEW public.admin_people_unified AS
WITH grouped AS (
  SELECT
    aug.group_id::text AS person_id,
    aug.group_id,
    aug.display_name,
    COALESCE(
      (
        SELECT ARRAY_AGG(u.email ORDER BY u.created_at)
        FROM public.user_group_members ugm
        JOIN public.users u ON u.id = ugm.user_id
        WHERE ugm.group_id = aug.group_id
      ),
      ARRAY[]::text[]
    ) AS emails,
    COALESCE(
      (
        SELECT ARRAY_AGG(u.id ORDER BY u.created_at)
        FROM public.user_group_members ugm
        JOIN public.users u ON u.id = ugm.user_id
        WHERE ugm.group_id = aug.group_id
      ),
      ARRAY[]::uuid[]
    ) AS user_ids,
    COALESCE(
      (
        SELECT COUNT(*)::integer
        FROM public.user_group_members ugm
        WHERE ugm.group_id = aug.group_id
      ),
      0
    ) AS members_count,
    (
      SELECT MIN(u.created_at)
      FROM public.user_group_members ugm
      JOIN public.users u ON u.id = ugm.user_id
      WHERE ugm.group_id = aug.group_id
    ) AS first_created,
    (
      SELECT MAX(u.created_at)
      FROM public.user_group_members ugm
      JOIN public.users u ON u.id = ugm.user_id
      WHERE ugm.group_id = aug.group_id
    ) AS last_created,
    TRUE AS is_grouped
  FROM public.admin_users_grouped aug
),
ungrouped AS (
  SELECT
    u.id::text AS person_id,
    NULL::uuid AS group_id,
    COALESCE(NULLIF(TRIM(u.full_name), ''), SPLIT_PART(u.email, '@', 1), u.email, 'Usuario') AS display_name,
    ARRAY_REMOVE(ARRAY[u.email], NULL)::text[] AS emails,
    ARRAY[u.id]::uuid[] AS user_ids,
    1::integer AS members_count,
    u.created_at AS first_created,
    u.created_at AS last_created,
    FALSE AS is_grouped
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_group_members ugm
    WHERE ugm.user_id = u.id
  )
)
SELECT
  person_id,
  group_id,
  display_name,
  emails,
  user_ids,
  members_count,
  first_created,
  last_created,
  is_grouped
FROM grouped
UNION ALL
SELECT
  person_id,
  group_id,
  display_name,
  emails,
  user_ids,
  members_count,
  first_created,
  last_created,
  is_grouped
FROM ungrouped;

GRANT SELECT ON public.admin_people_unified TO authenticated;
GRANT SELECT ON public.admin_people_unified TO anon;

-- ============================================
-- PEDIDOS CON CLAVE DE PERSONA (GROUP/USER)
-- ============================================
-- person_key:
-- - si user_id pertenece a un grupo -> group_id::text
-- - si no pertenece -> user_id::text

CREATE OR REPLACE VIEW public.orders_with_person_key AS
SELECT
  o.*,
  COALESCE(ugm.group_id::text, o.user_id::text) AS person_key
FROM public.orders o
LEFT JOIN public.user_group_members ugm
  ON ugm.user_id = o.user_id;

GRANT SELECT ON public.orders_with_person_key TO authenticated;
GRANT SELECT ON public.orders_with_person_key TO anon;

-- ============================================
-- CONTADOR DE PEDIDOS POR PERSONA
-- ============================================
-- Útil para reportes: reemplaza grouping por orders.user_id
-- por grouping por person_key.

CREATE OR REPLACE VIEW public.orders_count_by_person AS
SELECT
  owpk.person_key,
  apu.group_id,
  apu.display_name,
  apu.emails,
  apu.user_ids,
  COUNT(owpk.id) AS total_orders,
  COUNT(*) FILTER (WHERE owpk.status = 'pending') AS pending_orders,
  COUNT(*) FILTER (WHERE owpk.status IN ('completed', 'delivered')) AS completed_orders,
  COUNT(*) FILTER (WHERE owpk.status = 'cancelled') AS cancelled_orders,
  MIN(owpk.created_at) AS first_order_at,
  MAX(owpk.created_at) AS last_order_at
FROM public.orders_with_person_key owpk
LEFT JOIN public.admin_people_unified apu
  ON apu.person_id = owpk.person_key
GROUP BY
  owpk.person_key,
  apu.group_id,
  apu.display_name,
  apu.emails,
  apu.user_ids
ORDER BY total_orders DESC;

GRANT SELECT ON public.orders_count_by_person TO authenticated;
GRANT SELECT ON public.orders_count_by_person TO anon;
