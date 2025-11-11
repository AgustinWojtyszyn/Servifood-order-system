-- ============================================
-- SISTEMA DE NOTIFICACIONES
-- ============================================
-- Ejecuta este script en Supabase SQL Editor

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_delivered', 'order_cancelled', 'order_ready', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Solo el sistema (o admins mediante service role) pueden crear notificaciones
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Función para crear notificación cuando un pedido es marcado como entregado
CREATE OR REPLACE FUNCTION notify_order_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar cuando el estado cambia a 'completed' o 'delivered'
  IF (NEW.status = 'completed' OR NEW.status = 'delivered') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'delivered')) THEN
    
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      'order_delivered',
      '¡Tu pedido ha sido entregado!',
      'Tu pedido #' || substring(NEW.id::text from 1 for 8) || ' ha sido marcado como entregado. ¡Buen provecho!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificaciones automáticas
DROP TRIGGER IF EXISTS trigger_notify_order_delivered ON public.orders;
CREATE TRIGGER trigger_notify_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_delivered();

-- Verificar
SELECT 'Tabla de notificaciones creada exitosamente' AS status;
