-- ============================================
-- SISTEMA DE NOTIFICACIONES (GUARDADO)
-- ============================================
-- Ejecuta este script en Supabase SQL Editor.
-- Si public.notifications no existe, no hace nada.

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE NOTICE 'Skipping notifications setup: public.notifications does not exist.';
    RETURN;
  END IF;

  -- Asegurar CHECK compatible (permite tipos antiguos y nuevos)
  ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('order_delivered','order_archived','order_cancelled','order_ready','general'));

  -- RLS
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  -- Políticas
  DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

  CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Service role can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

  -- Índices
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

  -- Notificación al archivar pedidos
  CREATE OR REPLACE FUNCTION public.notify_order_archived()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.status = 'archived' AND (OLD.status IS DISTINCT FROM 'archived') THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      VALUES (
        NEW.user_id,
        NEW.id,
        'order_archived',
        '¡Tu pedido ha sido archivado!',
        'Tu pedido #' || substring(NEW.id::text from 1 for 8) || ' ha sido archivado. ¡Gracias!'
      );
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS trigger_notify_order_archived ON public.orders;
  CREATE TRIGGER trigger_notify_order_archived
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_archived();
END;
$$;
