-- ============================================
-- POLÍTICAS DE SEGURIDAD ACTUALIZADAS
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Política para permitir eliminar pedidos propios
CREATE POLICY "Users can delete their own orders" ON orders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Política para permitir a los usuarios autenticados actualizar el status de sus pedidos
CREATE POLICY "Users can update status of their own orders" ON orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
