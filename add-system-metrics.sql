-- System metrics storage for Experiencia en vivo

-- 1) Tabla
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('health_ping','error')),
  latency_ms integer,
  ok boolean NOT NULL DEFAULT true,
  path text,
  status_code integer,
  message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS system_metrics_created_at_idx ON public.system_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS system_metrics_kind_created_idx ON public.system_metrics (kind, created_at DESC);

-- 3) RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Bloquear todo por defecto
DROP POLICY IF EXISTS system_metrics_block_all ON public.system_metrics;
CREATE POLICY system_metrics_block_all ON public.system_metrics
  FOR ALL USING (false) WITH CHECK (false);

-- Lectura solo para admins (reutiliza la columna role en public.users)
DROP POLICY IF EXISTS system_metrics_select_admins ON public.system_metrics;
CREATE POLICY system_metrics_select_admins ON public.system_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Inserts solo vía RPC SECURITY DEFINER (no directo desde cliente)
-- No se define política INSERT para usuarios normales.

-- 4) RPC: log_system_metric
CREATE OR REPLACE FUNCTION public.log_system_metric(
  p_kind text,
  p_ok boolean DEFAULT true,
  p_latency_ms integer DEFAULT NULL,
  p_path text DEFAULT NULL,
  p_status_code integer DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_kind NOT IN ('health_ping','error') THEN
    RAISE EXCEPTION 'Invalid kind %', p_kind USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.system_metrics (kind, ok, latency_ms, path, status_code, message, meta)
  VALUES (p_kind, COALESCE(p_ok, true), p_latency_ms, p_path, p_status_code, p_message, COALESCE(p_meta, '{}'::jsonb));
END;
$$;

-- 5) RPC: get_system_status_summary
CREATE OR REPLACE FUNCTION public.get_system_status_summary(p_window_minutes int DEFAULT 60)
RETURNS TABLE (
  avg_latency_ms integer,
  last_ping_at timestamptz,
  last_ping_latency_ms integer,
  last_error_at timestamptz,
  last_error_message text,
  errors_last_hour integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window interval := make_interval(mins => COALESCE(p_window_minutes, 60));
BEGIN
  -- Promedio de latencia en ventana
  SELECT AVG(latency_ms)::int
    INTO avg_latency_ms
  FROM public.system_metrics
  WHERE kind = 'health_ping'
    AND latency_ms IS NOT NULL
    AND created_at >= now() - v_window;

  -- Último ping (en ventana); si no hay, usar el último global
  SELECT created_at, latency_ms
    INTO last_ping_at, last_ping_latency_ms
  FROM public.system_metrics
  WHERE kind = 'health_ping'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Último error dentro de la ventana; si no hay, usar el último ping como marcador "sin fallos"
  SELECT created_at, message
    INTO last_error_at, last_error_message
  FROM public.system_metrics
  WHERE kind = 'error'
    AND created_at >= now() - v_window
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_error_at IS NULL THEN
    last_error_at := last_ping_at;
    last_error_message := CASE WHEN last_ping_at IS NULL THEN 'Sin fallos' ELSE 'Sin fallos' END;
  END IF;

  SELECT COUNT(*)
    INTO errors_last_hour
  FROM public.system_metrics
  WHERE kind = 'error'
    AND created_at >= now() - v_window;
END;
$$;
