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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'user_features_select_own'
      AND tablename = 'user_features'
  ) THEN
    CREATE POLICY user_features_select_own
      ON public.user_features
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'user_features_block_writes'
      AND tablename = 'user_features'
  ) THEN
    CREATE POLICY user_features_block_writes
      ON public.user_features
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;
END$$;

-- 3) RLS orders: exigir feature dinner para service='dinner'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'orders_select_own'
      AND tablename = 'orders'
  ) THEN
    CREATE POLICY orders_select_own
      ON public.orders
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'orders_insert_own_with_dinner_gate'
      AND tablename = 'orders'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'orders_update_own_with_dinner_gate'
      AND tablename = 'orders'
  ) THEN
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
  END IF;
END$$;

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
