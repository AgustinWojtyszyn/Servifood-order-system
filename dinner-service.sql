-- Cena feature rollout - idempotente

-- 1) Columna service en orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT 'lunch';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_service_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_service_check
      CHECK (service IN ('lunch', 'dinner'));
  END IF;
END$$;

-- 2) Tabla user_features
CREATE TABLE IF NOT EXISTS public.user_features (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

-- RLS user_features
DROP POLICY IF EXISTS user_features_select_own ON public.user_features;
CREATE POLICY user_features_select_own
  ON public.user_features
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_features_block_writes ON public.user_features;
CREATE POLICY user_features_block_writes
  ON public.user_features
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 3) RLS orders: exigir feature dinner para service='dinner'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own
  ON public.orders
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS orders_insert_own_with_dinner_gate ON public.orders;
CREATE POLICY orders_insert_own_with_dinner_gate
  ON public.orders
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      service = 'lunch'
      OR (
        service = 'dinner' AND EXISTS (
          SELECT 1 FROM public.user_features uf
          WHERE uf.user_id = auth.uid()
            AND uf.feature = 'dinner'
            AND uf.enabled = true
        )
      )
    )
  );

DROP POLICY IF EXISTS orders_update_own_with_dinner_gate ON public.orders;
CREATE POLICY orders_update_own_with_dinner_gate
  ON public.orders
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      service = 'lunch'
      OR (
        service = 'dinner' AND EXISTS (
          SELECT 1 FROM public.user_features uf
          WHERE uf.user_id = auth.uid()
            AND uf.feature = 'dinner'
            AND uf.enabled = true
        )
      )
    )
  );

-- 4) Helpers para habilitar/deshabilitar feature (ejecutar con service role)
CREATE OR REPLACE FUNCTION public.enable_feature(p_user uuid, p_feature text, p_enabled boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_features (user_id, feature, enabled)
  VALUES (p_user, p_feature, p_enabled)
  ON CONFLICT (user_id, feature) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        created_at = now();
END;
$$;

-- 5) Seed inicial whitelist dinner (idempotente)
-- Intenta mapear por email (public.users.email -> auth.users.email)
WITH candidates AS (
  SELECT au.id AS auth_id, lower(au.email) AS email
  FROM auth.users au
  WHERE lower(au.email) IN (
    'aldana.marquez@gmail.com',
    'edgardo.elizondo@gmail.com',
    'german.arabel@gmail.com',
    'guillermo.alonso@gmail.com',
    'javier.pallero@gmail.com',
    'joseluis.gonzalez@gmail.com',
    'mario.ronco@gmail.com',
    'martin.amieva@gmail.com',
    'martin.calderon@gmail.com',
    'silvio.mansilla@gmail.com',
    'agustinwojtyszyn99@gmail.com',
    'sarmientoclaudia985@gmail.com'
  )
)
INSERT INTO public.user_features (user_id, feature, enabled)
SELECT auth_id, 'dinner', true FROM candidates
ON CONFLICT (user_id, feature) DO NOTHING;

-- Si algún usuario no mapeó por email, dejar insert manual con placeholders:
-- INSERT INTO public.user_features (user_id, feature, enabled) VALUES ('<missing-user-uuid>', 'dinner', true) ON CONFLICT DO NOTHING;

-- 6) Limpieza de pedidos + refuerzo de whitelist para Claudia Sarmiento (idempotente, service role)
DO $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = 'sarmientoclaudia985@gmail.com';

  IF v_user IS NULL THEN
    RAISE NOTICE 'No se encontró auth.users con email sarmientoclaudia985@gmail.com';
    RETURN;
  END IF;

  -- Eliminar todos los pedidos asociados a la usuaria
  DELETE FROM public.orders WHERE user_id = v_user;

  -- Asegurar whitelist dinner habilitada
  PERFORM public.enable_feature(v_user, 'dinner', true);
END
$$;

-- 7) Sincronizar perfil y rol de Claudia + asegurar visibilidad almuerzo/cena
DO $$
DECLARE
  v_auth uuid;
BEGIN
  SELECT id INTO v_auth FROM auth.users WHERE lower(email) = 'sarmientoclaudia985@gmail.com';

  IF v_auth IS NULL THEN
    RAISE NOTICE 'Claudia no existe en auth.users; créala desde Auth antes de volver a correr este script.';
    RETURN;
  END IF;

  -- Upsert en public.users con rol admin y nombre
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (v_auth, 'sarmientoclaudia985@gmail.com', 'Claudia Sarmiento', 'admin')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = 'admin';

  -- Asegurar feature dinner habilitado
  PERFORM public.enable_feature(v_auth, 'dinner', true);
END
$$;

-- 8) Limpieza solo de pedidos pendientes de Claudia (idempotente, service role)
DO $$
DECLARE
  v_auth uuid;
BEGIN
  SELECT id INTO v_auth FROM auth.users WHERE lower(email) = 'sarmientoclaudia985@gmail.com';

  IF v_auth IS NULL THEN
    RAISE NOTICE 'Claudia no existe en auth.users; créala desde Auth y vuelve a correr.';
    RETURN;
  END IF;

  DELETE FROM public.orders
  WHERE user_id = v_auth
    AND status = 'pending';
END
$$;

-- 9) Whitelist Genneia cena para Diego Gimenez (idempotente, service role)
DO $$
DECLARE
  v_auth uuid := 'e0f14abf-60f7-448f-87e2-565351b847c2';
BEGIN
  -- Asegurar consistencia con email conocido
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth AND lower(email) = 'diego.gimenez@genneia.com.ar') THEN
    PERFORM public.enable_feature(v_auth, 'dinner', true);
  ELSE
    RAISE NOTICE 'No se encontró usuario auth con id % y email diego.gimenez@genneia.com.ar; créalo antes de rerun.', v_auth;
  END IF;
END
$$;
