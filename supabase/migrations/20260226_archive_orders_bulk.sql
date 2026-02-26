-- Allow archived status in CHECK (if using status for archiving)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','archived','cancelled'));

-- Admin-only bulk archive RPC
CREATE OR REPLACE FUNCTION public.archive_orders_bulk(statuses text[])
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  UPDATE public.orders
  SET status = 'archived',
      updated_at = now()
  WHERE status = ANY(statuses)
  RETURNING id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_orders_bulk(text[]) TO authenticated;
