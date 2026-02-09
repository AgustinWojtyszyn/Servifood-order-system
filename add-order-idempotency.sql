-- ============================================
-- Idempotencia para creación de pedidos
-- Ejecuta en Supabase SQL Editor
-- ============================================

-- 1) Columna para idempotencia
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2) Índice único por usuario + clave (solo cuando la clave no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_orders_user_id_idempotency
  ON public.orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3) Función RPC idempotente
CREATE OR REPLACE FUNCTION public.create_order_idempotent(
  p_user_id uuid,
  p_idempotency_key text,
  p_payload jsonb
) RETURNS public.orders
LANGUAGE plpgsql
AS $$
DECLARE
  result public.orders;
  v_lock_key BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'invalid user' USING ERRCODE = '28000';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'p_payload is required';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'p_idempotency_key is required';
  END IF;

  -- Serializa intentos concurrentes para (usuario, clave) dentro de la transacción
  -- para evitar carreras en escenarios de doble click/reintentos simultáneos.
  v_lock_key := hashtextextended(p_user_id::text || ':' || btrim(p_idempotency_key), 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Fast-path: si ya existe, devolverlo sin tocar updated_at.
  SELECT o.*
  INTO result
  FROM public.orders o
  WHERE o.user_id = p_user_id
    AND o.idempotency_key = btrim(p_idempotency_key)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN result;
  END IF;

  INSERT INTO public.orders (
    user_id,
    idempotency_key,
    location,
    customer_name,
    customer_email,
    customer_phone,
    items,
    comments,
    delivery_date,
    status,
    total_items,
    custom_responses,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    btrim(p_idempotency_key),
    COALESCE(p_payload->>'location', '')::text,
    COALESCE(p_payload->>'customer_name', '')::text,
    COALESCE(p_payload->>'customer_email', '')::text,
    p_payload->>'customer_phone',
    COALESCE(p_payload->'items', '[]'::jsonb),
    p_payload->>'comments',
    (p_payload->>'delivery_date')::date,
    COALESCE(p_payload->>'status', 'pending'),
    COALESCE((p_payload->>'total_items')::int, 0),
    COALESCE(p_payload->'custom_responses', '[]'::jsonb),
    COALESCE((p_payload->>'created_at')::timestamptz, TIMEZONE('utc', NOW())),
    COALESCE((p_payload->>'updated_at')::timestamptz, TIMEZONE('utc', NOW()))
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO result;

  -- Si hubo conflicto (insert no-op), devolver el registro ya existente.
  IF result.id IS NULL THEN
    SELECT o.*
    INTO result
    FROM public.orders o
    WHERE o.user_id = p_user_id
      AND o.idempotency_key = btrim(p_idempotency_key)
    LIMIT 1;
  END IF;

  RETURN result;
END;
$$;

-- Reversión rápida (manual):
--  DROP FUNCTION IF EXISTS public.create_order_idempotent(uuid, text, jsonb);
--  DROP INDEX IF EXISTS uidx_orders_user_id_idempotency;
--  ALTER TABLE public.orders DROP COLUMN IF EXISTS idempotency_key;
