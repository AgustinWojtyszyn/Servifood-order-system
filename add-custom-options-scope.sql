-- ============================================
-- Alcance avanzado por contexto (almuerzo/cena + días + feriados)
-- Idempotente
-- ============================================

-- 1) Columnas nuevas en custom_options
ALTER TABLE public.custom_options
  ADD COLUMN IF NOT EXISTS meal_scope TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS only_holidays BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN NOT NULL DEFAULT false;

-- 1.a) Validaciones
DO $$
BEGIN
  ALTER TABLE public.custom_options
    ADD CONSTRAINT custom_options_meal_scope_chk
    CHECK (meal_scope IN ('lunch','dinner','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$
BEGIN
  ALTER TABLE public.custom_options
    ADD CONSTRAINT custom_options_days_of_week_chk
    CHECK (
      days_of_week IS NULL
      OR (
        SELECT bool_and(v BETWEEN 1 AND 7)
        FROM unnest(days_of_week) v
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$
BEGIN
  ALTER TABLE public.custom_options
    ADD CONSTRAINT custom_options_holiday_flags_chk
    CHECK (NOT (only_holidays AND exclude_holidays));
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- 1.b) Índices útiles
CREATE INDEX IF NOT EXISTS idx_custom_options_meal_scope ON public.custom_options(meal_scope);
CREATE INDEX IF NOT EXISTS idx_custom_options_days_of_week ON public.custom_options USING GIN (days_of_week);

-- 2) Tabla de feriados (idempotente)
CREATE TABLE IF NOT EXISTS public.holidays (
  date DATE PRIMARY KEY,
  name TEXT NULL,
  country_code TEXT NOT NULL DEFAULT 'AR'
);

-- Comentario: ejemplos de carga (no se insertan para evitar datos fijos)
-- -- Ejemplo:
-- -- INSERT INTO public.holidays(date, name, country_code) VALUES ('2026-01-01','Año Nuevo','AR') ON CONFLICT DO NOTHING;

-- 3) RPC: obtener opciones visibles por contexto
CREATE OR REPLACE FUNCTION public.get_visible_custom_options(
  p_company TEXT,
  p_meal TEXT,
  p_date DATE,
  p_country_code TEXT DEFAULT 'AR'
)
RETURNS SETOF public.custom_options
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_holiday BOOLEAN;
  v_isodow INT;
BEGIN
  IF p_meal NOT IN ('lunch','dinner') THEN
    RAISE EXCEPTION 'p_meal debe ser lunch o dinner';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'p_date es requerido';
  END IF;

  -- Detectar si es feriado
  SELECT EXISTS (
    SELECT 1
    FROM public.holidays h
    WHERE h.date = p_date
      AND (h.country_code = p_country_code OR p_country_code IS NULL)
  ) INTO v_is_holiday;

  -- Día de la semana (1=lunes .. 7=domingo)
  v_isodow := EXTRACT(ISODOW FROM p_date);

  RETURN QUERY
  SELECT *
  FROM public.custom_options co
  WHERE co.active = true
    -- Company scope: null => global, o coincide con la empresa dada
    AND (co.company IS NULL OR co.company = p_company)
    -- Meal scope
    AND (co.meal_scope = 'both' OR co.meal_scope = p_meal)
    -- Días
    AND (
      co.days_of_week IS NULL
      OR v_isodow = ANY (co.days_of_week)
    )
    -- Feriados
    AND (
      (co.only_holidays = false OR v_is_holiday = true)
      AND (co.exclude_holidays = false OR v_is_holiday = false)
    )
  ORDER BY co.order_position NULLS LAST, co.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_visible_custom_options IS
  'Devuelve opciones personalizables visibles para una empresa/fecha/meal (incluye reglas de feriados y días).';

-- 4) RLS (lectura sigue igual; escritura ya es solo admin en políticas existentes)
-- Si se necesitan ajustes, hacerlo aquí. Este script no cambia las políticas de lectura.

