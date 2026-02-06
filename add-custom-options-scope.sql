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

-- Usar operador de contención para evitar subquery en CHECK
DO $$
BEGIN
  -- eliminar versión previa si existe y no es compatible
  ALTER TABLE public.custom_options DROP CONSTRAINT IF EXISTS custom_options_days_of_week_chk;
  ALTER TABLE public.custom_options
    ADD CONSTRAINT custom_options_days_of_week_chk
    CHECK (
      days_of_week IS NULL
      OR days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
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

-- 5) Overrides por fecha para mostrar/ocultar opciones específicas (ej: habilitar postre en fin de semana)
CREATE TABLE IF NOT EXISTS public.custom_option_overrides (
  option_id UUID REFERENCES public.custom_options(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, date)
);

ALTER TABLE public.custom_option_overrides ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admins pueden gestionar overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'custom_option_overrides' AND policyname = 'custom_option_overrides_select_admin'
  ) THEN
    CREATE POLICY custom_option_overrides_select_admin
      ON public.custom_option_overrides
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'custom_option_overrides' AND policyname = 'custom_option_overrides_write_admin'
  ) THEN
    CREATE POLICY custom_option_overrides_write_admin
      ON public.custom_option_overrides
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  END IF;
END$$;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_custom_option_overrides_date ON public.custom_option_overrides(date);
CREATE INDEX IF NOT EXISTS idx_custom_option_overrides_option_date ON public.custom_option_overrides(option_id, date);

-- 6) Ajustar RPC para considerar overrides (si hay override en la fecha, manda)
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

  SELECT EXISTS (
    SELECT 1
    FROM public.holidays h
    WHERE h.date = p_date
      AND (h.country_code = p_country_code OR p_country_code IS NULL)
  ) INTO v_is_holiday;

  v_isodow := EXTRACT(ISODOW FROM p_date);

  RETURN QUERY
  SELECT co.*
  FROM public.custom_options co
  LEFT JOIN public.custom_option_overrides coo
    ON coo.option_id = co.id
   AND coo.date = p_date
  WHERE co.active = true
    AND (co.company IS NULL OR co.company = p_company)
    AND (
      coo.enabled = true
      OR (
        coo.enabled IS NULL
        AND (co.meal_scope = 'both' OR co.meal_scope = p_meal)
        AND (
          co.days_of_week IS NULL
          OR v_isodow = ANY (co.days_of_week)
        )
        AND (
          (co.only_holidays = false OR v_is_holiday = true)
          AND (co.exclude_holidays = false OR v_is_holiday = false)
        )
      )
    )
  ORDER BY co.order_position NULLS LAST, co.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_visible_custom_options IS
  'Devuelve opciones personalizables visibles para una empresa/fecha/meal (incluye reglas de feriados/días y overrides por fecha).';

-- 7) Deshabilitar postre los fines de semana por defecto (lunes=1 .. domingo=7)
UPDATE public.custom_options
SET days_of_week = ARRAY[1,2,3,4,5]::smallint[],
    updated_at = now()
WHERE lower(title) LIKE '%postre%'
  AND (days_of_week IS NULL OR days_of_week && ARRAY[6,7]::smallint[]);

-- 4) RLS (lectura sigue igual; escritura ya es solo admin en políticas existentes)
-- Si se necesitan ajustes, hacerlo aquí. Este script no cambia las políticas de lectura.
