-- ============================================
-- CHAT INTERNO PARA ADMINISTRADORES
-- ============================================
-- Este script crea la infraestructura para un chat
-- grupal exclusivo entre administradores

-- ============================================
-- 1. CREAR TABLA DE MENSAJES DEL CHAT
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para buscar mensajes por fecha
CREATE INDEX IF NOT EXISTS idx_admin_chat_created_at 
  ON public.admin_chat(created_at DESC);

-- Índice para buscar mensajes por usuario
CREATE INDEX IF NOT EXISTS idx_admin_chat_user_id 
  ON public.admin_chat(user_id);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.admin_chat ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS RLS - SOLO ADMINISTRADORES
-- ============================================

-- Solo admins pueden VER mensajes
DROP POLICY IF EXISTS "Only admins can view chat" ON public.admin_chat;
CREATE POLICY "Only admins can view chat" ON public.admin_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden ENVIAR mensajes
DROP POLICY IF EXISTS "Only admins can send messages" ON public.admin_chat;
CREATE POLICY "Only admins can send messages" ON public.admin_chat
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND user_id = auth.uid()
  );

-- Solo el autor puede EDITAR su mensaje
DROP POLICY IF EXISTS "Admins can edit own messages" ON public.admin_chat;
CREATE POLICY "Admins can edit own messages" ON public.admin_chat
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- Solo el autor puede ELIMINAR su mensaje
DROP POLICY IF EXISTS "Admins can delete own messages" ON public.admin_chat;
CREATE POLICY "Admins can delete own messages" ON public.admin_chat
  FOR DELETE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_admin_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_chat_updated_at ON public.admin_chat;
CREATE TRIGGER trigger_update_admin_chat_updated_at
  BEFORE UPDATE ON public.admin_chat
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_chat_updated_at();

-- ============================================
-- 6. FUNCIÓN PARA LIMPIAR MENSAJES ANTIGUOS
-- ============================================
-- Opcional: eliminar mensajes más antiguos de 30 días

CREATE OR REPLACE FUNCTION cleanup_old_admin_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_chat
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. VERIFICACIÓN
-- ============================================

-- Ver políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'admin_chat'
ORDER BY policyname;

-- Ver estructura de la tabla (columnas)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_chat'
ORDER BY ordinal_position;

-- ============================================
-- RESUMEN
-- ============================================

/*
✅ TABLA CREADA: admin_chat
   - id: UUID único
   - user_id: referencia al usuario admin
   - message: texto del mensaje
   - created_at: fecha de creación
   - updated_at: fecha de última edición
   - is_edited: marca si fue editado

✅ POLÍTICAS RLS:
   - Solo admins pueden ver el chat
   - Solo admins pueden enviar mensajes
   - Solo el autor puede editar/eliminar sus mensajes

✅ CARACTERÍSTICAS:
   - Tiempo real con Supabase Realtime
   - Historial completo de mensajes
   - Edición y eliminación de mensajes propios
   - Índices para performance óptima

✅ SEGURIDAD:
   - RLS habilitado
   - Verificación de rol admin en cada operación
   - No se puede enviar mensajes a nombre de otros
   - Cascade delete si se elimina usuario

📝 PRÓXIMOS PASOS:
   1. Ejecutar este script en Supabase SQL Editor
   2. Habilitar Realtime en la tabla admin_chat
   3. Implementar componente React AdminChat
*/

-- ============================================
-- ¡SCRIPT LISTO PARA EJECUTAR!
-- ============================================
